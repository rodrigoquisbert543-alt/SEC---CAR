import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type TipoMiembro = 'hermano' | 'siervo' | 'pastor'

export type FechaExtra = {
  id: string
  titulo: string
  fecha: string // YYYY-MM-DD
  anual: boolean
}

export type Miembro = {
  id: string
  nombre: string
  tipo: TipoMiembro
  telefono: string
  cumpleanos: string
  fechaBautizo: string
  ministerio: string
  actividades: string
  notas: string
  fechas: FechaExtra[]
  creadoPor: string
}

export type Recordatorio = {
  key: string
  miembroId: string
  nombre: string
  titulo: string
  fecha: string // próxima ocurrencia YYYY-MM-DD
  dias: number
  anios: number | null
}

export const TIPOS: { id: TipoMiembro; label: string }[] = [
  { id: 'hermano', label: 'Hermano(a)' },
  { id: 'siervo', label: 'Siervo(a)' },
  { id: 'pastor', label: 'Pastor' },
]

export const tipoLabel = (t: TipoMiembro) => TIPOS.find((x) => x.id === t)?.label ?? t

export function miembroDesdeDB(r: any): Miembro {
  return {
    id: r.id,
    nombre: r.nombre ?? '',
    tipo: (r.tipo as TipoMiembro) ?? 'hermano',
    telefono: r.telefono ?? '',
    cumpleanos: r.cumpleanos ?? '',
    fechaBautizo: r.fecha_bautizo ?? '',
    ministerio: r.ministerio ?? '',
    actividades: r.actividades ?? '',
    notas: r.notas ?? '',
    fechas: Array.isArray(r.fechas) ? r.fechas : [],
    creadoPor: r.creado_por ?? '',
  }
}

export function miembroADB(m: Omit<Miembro, 'id'> & { id?: string }) {
  return {
    ...(m.id ? { id: m.id } : {}),
    nombre: m.nombre.trim(),
    tipo: m.tipo,
    telefono: m.telefono.trim() || null,
    cumpleanos: m.cumpleanos || null,
    fecha_bautizo: m.fechaBautizo || null,
    ministerio: m.ministerio.trim() || null,
    actividades: m.actividades.trim() || null,
    notas: m.notas.trim() || null,
    fechas: m.fechas,
    creado_por: m.creadoPor || null,
    updated_at: new Date().toISOString(),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
export const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function parseISO(s: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!match) return null
  return { y: +match[1], m: +match[2], d: +match[3] }
}

const esBisiesto = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

// Próxima ocurrencia (hoy o futura) de una fecha que se repite cada año
function proximaAnual(m: number, d: number, hoy: Date): Date {
  const mk = (y: number) => new Date(y, m - 1, m === 2 && d === 29 && !esBisiesto(y) ? 28 : d)
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const esteAnio = mk(base.getFullYear())
  return esteAnio >= base ? esteAnio : mk(base.getFullYear() + 1)
}

const MS_DIA = 24 * 60 * 60 * 1000

export function calcularRecordatorios(miembros: Miembro[], diasMax = 30, hoy = new Date()): Recordatorio[] {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const out: Recordatorio[] = []

  const agregar = (m: Miembro, id: string, titulo: string, fecha: string, anual: boolean) => {
    const p = parseISO(fecha)
    if (!p) return
    const prox = anual ? proximaAnual(p.m, p.d, hoy) : new Date(p.y, p.m - 1, p.d)
    const dias = Math.round((prox.getTime() - base.getTime()) / MS_DIA)
    if (dias < 0 || dias > diasMax) return
    out.push({
      key: `${m.id}|${id}|${isoLocal(prox)}`,
      miembroId: m.id,
      nombre: m.nombre,
      titulo,
      fecha: isoLocal(prox),
      dias,
      anios: anual ? prox.getFullYear() - p.y : null,
    })
  }

  for (const m of miembros) {
    if (m.cumpleanos) agregar(m, 'cumple', 'Cumpleaños', m.cumpleanos, true)
    if (m.fechaBautizo) agregar(m, 'bautizo', 'Aniversario de bautizo', m.fechaBautizo, true)
    for (const f of m.fechas) if (f.fecha && f.titulo) agregar(m, f.id, f.titulo, f.fecha, f.anual)
  }
  return out.sort((a, b) => a.dias - b.dias || a.nombre.localeCompare(b.nombre))
}

export const textoDias = (dias: number) => (dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `En ${dias} días`)

export function useMiembros() {
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    const { data, error: err } = await supabase.from('miembros').select('*').order('nombre')
    if (err) {
      setError(err.message)
    } else {
      setError('')
      setMiembros((data || []).map(miembroDesdeDB))
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    recargar()
    const channel = supabase
      .channel('sec-car-miembros')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'miembros' }, () => recargar())
      .subscribe()
    const onVisible = () => { if (document.visibilityState === 'visible') recargar() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [recargar])

  return { miembros, cargando, error, recargar }
}

const NOTIF_KEY = 'sec-car-notificados'

// Avisa (una sola vez por fecha) de los eventos de hoy y mañana usando notificaciones del sistema
export async function notificarProximos(recordatorios: Recordatorio[]) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  let vistos: string[] = []
  try { vistos = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]') } catch { /* ignorar */ }
  const pendientes = recordatorios.filter((r) => r.dias <= 1 && !vistos.includes(`${r.key}|${r.dias}`))
  if (pendientes.length === 0) return

  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  for (const r of pendientes) {
    const title = `${r.titulo}: ${r.nombre}`
    const options: NotificationOptions = {
      body: `${textoDias(r.dias)} · ${r.fecha}`,
      icon: '/pwa-192x192.png',
      tag: r.key,
    }
    try {
      if (reg) await reg.showNotification(title, options)
      else new Notification(title, options)
    } catch { /* ignorar */ }
  }
  const hoy = isoLocal(new Date())
  const todos = [...vistos, ...pendientes.map((r) => `${r.key}|${r.dias}`)].filter((k) => k.split('|')[2] >= hoy)
  localStorage.setItem(NOTIF_KEY, JSON.stringify(todos.slice(-300)))
}
