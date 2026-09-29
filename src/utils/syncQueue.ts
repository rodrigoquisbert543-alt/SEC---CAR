import { supabase } from './supabase'

type QueueItem = {
  id: string
  table: 'ingresos' | 'egresos' | 'eventos'
  operation: 'insert' | 'update' | 'delete'
  payload: any
  timestamp: number
}
const QUEUE_KEY = 'sec-car-sync-queue'

// ============================================================
// COLA DE OPERACIONES PENDIENTES
// ============================================================
function getQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(queue: QueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  // Notificar a la UI cuántos pendientes hay
  window.dispatchEvent(new CustomEvent('sec-car-queue-changed', { detail: queue.length }))
}

// ============================================================
// ENCOLAR UNA OPERACIÓN
// ============================================================
export function enqueue(item: Omit<QueueItem, 'id' | 'timestamp'>) {
  const queue = getQueue()
  queue.push({
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  })
  saveQueue(queue)
  console.log(`📥 Encolada operación ${item.operation} en ${item.table}`)
}

// ============================================================
// PROCESAR LA COLA (subir todo lo pendiente)
// ============================================================
export async function flushQueue(): Promise<{ ok: number; fail: number }> {
  const queue = getQueue()
  if (queue.length === 0) return { ok: 0, fail: 0 }

  console.log(`🔄 Procesando ${queue.length} operaciones pendientes...`)

  const remaining: QueueItem[] = []
  let ok = 0
  let fail = 0

  for (const item of queue) {
    try {
      let result
      if (item.operation === 'insert') {
        result = await supabase.from(item.table).insert(item.payload)
      } else if (item.operation === 'update') {
        result = await supabase.from(item.table).update(item.payload).eq('id', item.payload.id)
      } else if (item.operation === 'delete') {
        result = await supabase.from(item.table).delete().eq('id', item.payload.id)
      }

      remaining.push({
        ...item,
      })
      // Si la operación fue exitosa, no la mantenemos en la cola
      if (!result?.error) {
        remaining.pop()
      }

      if (result?.error) {
        // Error real (no de red) → descartar para no bloquear la cola
        console.error(`❌ Error en ${item.table}.${item.operation}:`, result.error)
        fail++
      } else {
        ok++
      }
    } catch (err) {
      // Error de red → mantener en la cola para reintentar
      console.warn(`📡 Sin conexión. Reintentando más tarde:`, err)
      remaining.push(item)
    }
  }

  saveQueue(remaining)

  if (ok > 0) {
    console.log(`✅ ${ok} operaciones sincronizadas correctamente`)
  }
  if (remaining.length > 0) {
    console.log(`⏳ ${remaining.length} operaciones siguen pendientes`)
  }

  return { ok, fail }
}

// ============================================================
// ESTADO DE LA COLA
// ============================================================
export function getQueueLength(): number {
  return getQueue().length
}

// ============================================================
// ARRANCAR EL LISTENER DE RECONEXIÓN
// ============================================================
export function startSyncListener() {
  // 1) Al volver la conexión → procesar cola
  window.addEventListener('online', () => {
    console.log('🌐 Conexión recuperada. Sincronizando...')
    flushQueue()
  })

  // 2) Al volver a la pestaña → procesar cola (por si hubo cambios en otra pestaña)
  window.addEventListener('focus', () => {
    if (navigator.onLine) flushQueue()
  })

  // 3) Reintentar cada 30 segundos si hay pendientes y hay conexión
  setInterval(() => {
    if (navigator.onLine && getQueueLength() > 0) {
      flushQueue()
    }
  }, 30 * 1000)

  // 4) Intentar al arrancar (por si quedaron pendientes de una sesión anterior)
  if (navigator.onLine) {
    flushQueue()
  }
}