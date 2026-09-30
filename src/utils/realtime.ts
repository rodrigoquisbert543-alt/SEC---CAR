import { supabase } from './supabase'

type RealtimeCallbacks = {
  onIngresoChange?: (payload: any, eventType: string) => void
  onEgresoChange?: (payload: any, eventType: string) => void
  onEventoChange?: (payload: any, eventType: string) => void
  onClienteChange?: (payload: any, eventType: string) => void
  onCuentaChange?: (payload: any, eventType: string) => void
}

export function startRealtimeSync(callbacks: RealtimeCallbacks, channelName?: string): () => void {
  const uniqueName = channelName || `sec-car-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const channel = supabase
    .channel(uniqueName)    
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ingresos' },
      (payload) => callbacks.onIngresoChange?.(payload, payload.eventType))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'egresos' },
      (payload) => callbacks.onEgresoChange?.(payload, payload.eventType))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' },
      (payload) => callbacks.onEventoChange?.(payload, payload.eventType))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' },
      (payload) => callbacks.onClienteChange?.(payload, payload.eventType))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentas' },
      (payload) => callbacks.onCuentaChange?.(payload, payload.eventType))
    .subscribe((status) => {
      console.log(`🔌 Realtime [${channelName}]:`, status)
    })

  return () => {
    supabase.removeChannel(channel)
  }
}