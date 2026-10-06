import { supabase } from './supabase'
import { ingresoLocalASupabase, egresoLocalASupabase, clienteLocalASupabase } from './mapeo'

const QUEUE_KEY = 'sec-car-sync-queue'
const DONE_KEY = 'sec-car-migrated-online-v1'
const BACKUP_KEY = 'sec-car-backup-pre-online'
const LOCAL_KEYS = ['sec-car-payments', 'sec-car-expenses', 'sec-car-people', 'sec-car-events', 'sec-car-event-prices']

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const ts = (v?: string) => (v ? new Date(v).getTime() || 0 : 0)

// Sube a Supabase lo que haya quedado en el navegador (datos locales y cola pendiente).
// Nunca borra datos locales hasta que todo se haya subido; deja un respaldo.
// Devuelve true si no queda nada pendiente.
export async function migrateLocalData(): Promise<boolean> {
  const fallidos: string[] = []
  if (localStorage.getItem(DONE_KEY)) return true

  try {
    const payments = readJSON<any[]>('sec-car-payments', [])
    const expenses = readJSON<any[]>('sec-car-expenses', [])
    const people = readJSON<any[]>('sec-car-people', [])
    const events = readJSON<string[]>('sec-car-events', [])
    const prices = readJSON<Record<string, number>>('sec-car-event-prices', {})
    const queue = readJSON<any[]>(QUEUE_KEY, [])

    if (!localStorage.getItem(BACKUP_KEY)) {
      const backup: Record<string, any> = { queue }
      LOCAL_KEYS.forEach((k) => { backup[k] = readJSON(k, null) })
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))
    }

    // ---- Ingresos y egresos: insertar los que faltan; actualizar los que el local tiene m?s recientes
    const subirRegistros = async (
      tabla: 'ingresos' | 'egresos',
      locales: any[],
      convertir: (r: any) => any,
    ) => {
      if (locales.length === 0) return
      const codigoCol = tabla === 'ingresos' ? 'recibo' : 'comprobante'
      const prefijo = tabla === 'ingresos' ? 'REC' : 'EGR'
      const { data, error } = await supabase.from(tabla).select(`id, updated_at, ${codigoCol}`)
      if (error) throw error
      const remotos = new Map<string, string>((data || []).map((r: any) => [r.id, r.updated_at]))
      const codigos = new Set<string>((data || []).map((r: any) => r[codigoCol]))
      let maxNum = 0
      ;[...(data || []).map((r: any) => r[codigoCol]), ...locales.map((l) => l.receipt || l.voucher)].forEach((c) => {
        const n = parseInt(String(c || '').split('-')[1], 10)
        if (n > maxNum) maxNum = n
      })

      // Ordenados por fecha de creaci?n para que el renumerado sea coherente
      const pendientes = locales.filter((l) => l?.id && !remotos.has(l.id))
        .sort((x, y) => ts(x.updated_at) - ts(y.updated_at))

      for (const l of pendientes) {
        const row = convertir(l)
        // Si otro usuario ya us? ese n?mero de recibo/comprobante, se asigna uno nuevo
        if (codigos.has(row[codigoCol])) row[codigoCol] = `${prefijo}-${String(++maxNum).padStart(5, '0')}`
        let { error: e } = await supabase.from(tabla).insert(row)
        if (e && e.code === '23505' && !String(e.message).includes('pkey')) {
          row[codigoCol] = `${prefijo}-${String(++maxNum).padStart(5, '0')}`
          ;({ error: e } = await supabase.from(tabla).insert(row))
        }
        if (e && e.code === '23505') { codigos.add(row[codigoCol]); continue } // ya existe (mismo id)
        if (e) {
          if (!e.code && /fetch|network/i.test(e.message)) throw e
          fallidos.push(`${tabla}:${l.receipt || l.voucher}: ${e.message}`)
          continue
        }
        codigos.add(row[codigoCol])
      }

      for (const l of locales) {
        if (!l?.id || !remotos.has(l.id) || ts(l.updated_at) <= ts(remotos.get(l.id))) continue
        const row = convertir(l)
        delete row[codigoCol]
        const { error: e } = await supabase.from(tabla).update(row).eq('id', row.id)
        if (e) fallidos.push(`${tabla}:${l.id}: ${e.message}`)
      }
    }

    await subirRegistros('ingresos', payments, ingresoLocalASupabase)
    await subirRegistros('egresos', expenses, egresoLocalASupabase)

    // ---- Clientes: insertar los que no existan (por id o por nombre)
    if (people.length > 0) {
      const { data, error } = await supabase.from('clientes').select('id, nombre')
      if (error) throw error
      const ids = new Set((data || []).map((c: any) => c.id))
      const nombres = new Set((data || []).map((c: any) => String(c.nombre).toLowerCase()))
      const nuevos = people
        .filter((p) => p?.id && p.name && !ids.has(p.id) && !nombres.has(String(p.name).toLowerCase()))
        .map(clienteLocalASupabase)
      if (nuevos.length > 0) {
        const { error: e } = await supabase.from('clientes').insert(nuevos)
        if (e) throw e
      }
    }

    // ---- Eventos y precios
    if (events.length > 0) {
      const { data, error } = await supabase.from('eventos').select('nombre, precio')
      if (error) throw error
      const remotos = new Map<string, number>((data || []).map((e: any) => [e.nombre, e.precio || 0]))
      const nuevos = events
        .filter((n) => !remotos.has(n))
        .map((nombre) => ({ id: crypto.randomUUID(), nombre, precio: prices[nombre] || 0, updated_at: new Date().toISOString() }))
      if (nuevos.length > 0) {
        const { error: e } = await supabase.from('eventos').insert(nuevos)
        if (e) throw e
      }
      for (const nombre of events) {
        if (remotos.has(nombre) && !remotos.get(nombre) && prices[nombre] > 0) {
          const { error: e } = await supabase
            .from('eventos')
            .update({ precio: prices[nombre], updated_at: new Date().toISOString() })
            .eq('nombre', nombre)
          if (e) throw e
        }
      }
    }

    // ---- Cola de operaciones pendientes (modo offline anterior)
    const restantes: any[] = []
    for (const item of queue) {
      try {
        let res: { error: any } | undefined
        const { table, operation, payload } = item
        const col = table === 'eventos' ? 'nombre' : 'id'
        if (operation === 'insert') {
          res = await supabase.from(table).upsert(payload, { onConflict: 'id', ignoreDuplicates: true })
        } else if (operation === 'update') {
          res = await supabase.from(table).update(payload.data).eq(col, payload.id)
        } else if (operation === 'delete') {
          res = await supabase.from(table).delete().eq(col, payload.id)
        }
        if (res?.error) console.error(`OperaciÃ³n pendiente descartada (${table}.${operation}):`, res.error)
      } catch (err) {
        restantes.push(item)
        console.warn('OperaciÃ³n pendiente sin subir:', err)
      }
    }
    if (restantes.length > 0) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(restantes))
      return false
    }
    localStorage.removeItem(QUEUE_KEY)

    if (fallidos.length > 0) {
      console.error('Registros que no se pudieron subir (siguen en el respaldo local):', fallidos)
      localStorage.setItem('sec-car-migration-errors', JSON.stringify(fallidos))
      alert(`${fallidos.length} registro(s) locales no se pudieron subir. Avisa al administrador; se conservan en este dispositivo.`)
    }
    localStorage.setItem(DONE_KEY, new Date().toISOString())
    return true
  } catch (err) {
    console.warn('No se pudo migrar los datos locales (se reintentarÃ¡):', err)
    return false
  }
}
