import { supabase } from './supabase'

type RealtimeCallback = {
  onIngresoChange: (payload: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
  onEgresoChange: (payload: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
  onEventoChange?: (payload: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
}

export function startRealtimeSync(callbacks: RealtimeCallback): () => void {
  const channel = supabase
    .channel('sec-car-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ingresos' },
      (payload) => {
        console.log('📡 Realtime ingresos:', payload.eventType)
        callbacks.onIngresoChange(payload, payload.eventType as any)
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'egresos' },
      (payload) => {
        console.log('📡 Realtime egresos:', payload.eventType)
        callbacks.onEgresoChange(payload, payload.eventType as any)
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'eventos' },
      (payload) => {
        console.log('📡 Realtime eventos:', payload.eventType)
        callbacks.onEventoChange?.(payload, payload.eventType as any)
      }
    )
    .subscribe((status) => {
      console.log('🔌 Realtime status:', status)
    })

  return () => {
    supabase.removeChannel(channel)
  }
}