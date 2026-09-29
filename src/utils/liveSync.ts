import { supabase } from './supabase'

// ============================================================
// TIPOS
// ============================================================
export type SyncData = {
  ingresos: any[]
  egresos: any[]
}

// ============================================================
// CARGAR DATOS DESDE SUPABASE
// ============================================================
export async function loadFromSupabase(): Promise<SyncData | null> {
  try {
    const [ingresosRes, egresosRes] = await Promise.all([
      supabase.from('ingresos').select('*').order('fecha', { ascending: false }),
      supabase.from('egresos').select('*').order('fecha', { ascending: false }),
    ])

    if (ingresosRes.error || egresosRes.error) {
      console.warn('⚠️ Error al cargar de Supabase:', ingresosRes.error || egresosRes.error)
      return null
    }

    return {
      ingresos: ingresosRes.data || [],
      egresos: egresosRes.data || [],
    }
  } catch (err) {
    console.warn('📡 Sin conexión. Usando datos locales.')
    return null
  }
}

// ============================================================
// FUSIONAR DATOS LOCALES CON SUPABASE
// Regla: Gana el que tenga updated_at más reciente.
// Respeta cambios locales recientes (menos de 60s).
// ============================================================
export function fusionarDatos(local: any[], remoto: any[]): {
  fusionados: any[]
  paraSubir: any[]
} {
  const mapa = new Map<string, any>()
  const ahora = Date.now()
  const VENTANA_RESPETO_MS = 60 * 1000   // 60 segundos

  // 1. Meter primero todos los remotos (Supabase es la base)
  remoto.forEach((r) => mapa.set(r.id, { ...r, _origen: 'remoto' }))

  // 2. Procesar los locales
  const paraSubir: any[] = []
  local.forEach((l) => {
    const existente = mapa.get(l.id)

    if (!existente) {
      // No existe en Supabase → hay que subirlo
      mapa.set(l.id, { ...l, _origen: 'local' })
      paraSubir.push(l)
      return
    }

    // Comparar fechas de modificación
    const fechaLocal = l.updated_at ? new Date(l.updated_at).getTime() : 0
    const fechaRemota = existente.updated_at ? new Date(existente.updated_at).getTime() : 0
    const antiguedadLocal = ahora - fechaLocal

    // 🔒 Si el local fue modificado hace menos de 60s, respetarlo
    if (antiguedadLocal < VENTANA_RESPETO_MS) {
      mapa.set(l.id, { ...l, _origen: 'local' })
      paraSubir.push(l)
      return
    }

    if (fechaLocal > fechaRemota) {
      // El local es más reciente → reemplazar
      mapa.set(l.id, { ...l, _origen: 'local' })
      paraSubir.push(l)
    }
    // Si el remoto es más reciente, se queda el remoto
  })

  const fusionados = Array.from(mapa.values()).map(({ _origen, ...resto }) => resto)
  return { fusionados, paraSubir }
}
// ============================================================
// CONVERTIR REGISTROS DE SUPABASE AL FORMATO LOCAL
// ============================================================
export function supabaseAFormatoLocal(tabla: 'ingresos' | 'egresos', row: any): any {
  if (tabla === 'ingresos') {
    return {
      id: row.id,
      receipt: row.recibo,
      person: row.persona,
      carnet: row.carnet || '',
      phone: row.telefono || '',
      concept: row.concepto,
      notes: row.notas || '',
      date: row.fecha,
      amount: row.monto,
      cash: row.efectivo || 0,
      qr: row.qr || 0,
      status: row.estado || 'Aplicado',
      issuedBy: row.emitido_por || '',
      updated_at: row.updated_at,
    }
  }
  // egresos
  return {
    id: row.id,
    voucher: row.comprobante,
    concept: row.concepto,
    recipient: row.destinatario,
    category: row.categoria,
    date: row.fecha,
    amount: row.monto,
    cash: row.efectivo || 0,
    qr: row.qr || 0,
    status: row.estado || 'Aplicado',
    issuedBy: row.emitido_por || '',
    updated_at: row.updated_at,
  }
}

// ============================================================
// CONVERTIR REGISTROS LOCALES AL FORMATO DE SUPABASE
// ============================================================
export function localAFormatoSupabase(tabla: 'ingresos' | 'egresos', row: any): any {
  if (tabla === 'ingresos') {
    return {
      id: row.id,
      recibo: row.receipt,
      persona: row.person,
      carnet: row.carnet || '',
      telefono: row.phone || '',
      concepto: row.concept,
      fecha: row.date,
      monto: row.amount,
      efectivo: row.cash,
      qr: row.qr,
      estado: row.status,
      emitido_por: row.issuedBy,
      updated_at: row.updated_at || new Date().toISOString(),
    }
  }
  // egresos
  return {
    id: row.id,
    comprobante: row.voucher,
    destinatario: row.recipient,
    concepto: row.concept,
    categoria: row.category,
    fecha: row.date,
    monto: row.amount,
    efectivo: row.cash,
    qr: row.qr,
    estado: row.status,
    emitido_por: row.issuedBy,
    updated_at: row.updated_at || new Date().toISOString(),
  }
}

// ============================================================
// SINCRONIZACIÓN EN VIVO
// Consulta Supabase cada X segundos y devuelve los datos
// ============================================================
export function startLiveSync(
  intervalMs: number,
  onData: (data: SyncData) => void
): () => void {
  let activo = true

  const tick = async () => {
    if (!activo || !navigator.onLine) return
    const data = await loadFromSupabase()
    if (data && activo) {
      onData(data)
    }
  }

  // Primera ejecución inmediata
  tick()

  // Luego cada intervalMs
  const interval = setInterval(tick, intervalMs)

  // También al recuperar conexión
  const onOnline = () => tick()
  window.addEventListener('online', onOnline)

  // Cleanup
  return () => {
    activo = false
    clearInterval(interval)
    window.removeEventListener('online', onOnline)
  }
}