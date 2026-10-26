import { useMemo, useState } from 'react'
import { supabase } from '../utils/supabase'
import {
  TIPOS,
  calcularRecordatorios,
  miembroADB,
  textoDias,
  tipoLabel,
  type FechaExtra,
  type Miembro,
  type TipoMiembro,
} from '../utils/congregacion'

type Form = Omit<Miembro, 'id'>

const vacio = (usuario: string): Form => ({
  nombre: '', tipo: 'hermano', telefono: '', cumpleanos: '', fechaBautizo: '',
  ministerio: '', actividades: '', notas: '', fechas: [], creadoPor: usuario,
})

const fmt = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : '—'
}

const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))

export default function Congregacion({
  miembros, cargando, error, recargar, usuario,
}: {
  miembros: Miembro[]
  cargando: boolean
  error: string
  recargar: () => Promise<void>
  usuario: string
}) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoMiembro>('todos')
  const [editando, setEditando] = useState<{ id?: string; form: Form } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [detalle, setDetalle] = useState<Miembro | null>(null)
  const [permiso, setPermiso] = useState<string>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)

  const proximos = useMemo(() => calcularRecordatorios(miembros, 60), [miembros])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return miembros.filter((m) =>
      (filtroTipo === 'todos' || m.tipo === filtroTipo) &&
      (!q || [m.nombre, m.ministerio, m.actividades, m.telefono, m.notas].some((v) => v.toLowerCase().includes(q))))
  }, [miembros, busqueda, filtroTipo])

  const guardar = async () => {
    if (!editando) return
    const { id, form } = editando
    if (!form.nombre.trim()) { setMensaje('Escribe el nombre.'); return }
    if (form.fechas.some((f) => !f.titulo.trim() || !f.fecha)) { setMensaje('Completa el título y la fecha de cada fecha adicional.'); return }
    setGuardando(true)
    const payload = miembroADB({ ...form, id })
    const { error: err } = id
      ? await supabase.from('miembros').update(payload).eq('id', id)
      : await supabase.from('miembros').insert(payload)
    setGuardando(false)
    if (err) { setMensaje(`No se pudo guardar: ${err.message}`); return }
    setEditando(null)
    setMensaje('')
    recargar()
  }

  const eliminar = async (m: Miembro) => {
    if (!window.confirm(`¿Eliminar a ${m.nombre} de la lista?`)) return
    const { error: err } = await supabase.from('miembros').delete().eq('id', m.id)
    if (err) { alert(`No se pudo eliminar: ${err.message}`); return }
    setDetalle(null)
    recargar()
  }

  const activarNotif = async () => {
    if (typeof Notification === 'undefined') return
    setPermiso(await Notification.requestPermission())
  }

  const setF = (patch: Partial<Form>) => editando && setEditando({ ...editando, form: { ...editando.form, ...patch } })
  const setFecha = (id: string, patch: Partial<FechaExtra>) =>
    editando && setF({ fechas: editando.form.fechas.map((f) => (f.id === id ? { ...f, ...patch } : f)) })

  if (error) {
    return (
      <section className="panel">
        <div className="panel-head"><div><h3>Congregación</h3></div></div>
        <div className="payment-note">
          No se pudo cargar la lista ({error}). Si es la primera vez, falta crear la tabla <b>miembros</b> en Supabase
          (ejecuta el archivo <b>supabase/miembros.sql</b> en el SQL Editor).
          <div style={{ marginTop: 8 }}><button className="status-toggle" onClick={recargar}>Reintentar</button></div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Próximas fechas importantes</h3>
            <p>Cumpleaños, bautizos y fechas registradas en los próximos 60 días. Todos los usuarios ven la misma información.</p>
          </div>
          {permiso === 'default' && <button className="status-toggle" onClick={activarNotif}>Activar avisos en este dispositivo</button>}
          {permiso === 'denied' && <small>Los avisos están bloqueados en este navegador.</small>}
        </div>
        <div className="chip-list">
          {proximos.length === 0 && <div className="table-note">No hay fechas próximas.</div>}
          {proximos.map((r) => (
            <div className="chip" key={r.key} style={r.dias <= 1 ? { borderColor: '#d97706' } : undefined}>
              <div>
                <strong>{r.nombre}</strong>
                <small>{r.titulo}{r.anios ? ` (${r.anios} años)` : ''} · {fmt(r.fecha)} · <b>{textoDias(r.dias)}</b></small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div><h3>Hermanos, siervos y pastores</h3><p>Registra cualquier dato de cada persona: ministerio, actividades y fechas importantes.</p></div>
          <button className="primary-button" onClick={() => { setMensaje(''); setEditando({ form: vacio(usuario) }) }}>＋ Agregar persona</button>
        </div>
        <div className="filters">
          <div className="search"><span>⌕</span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, ministerio o actividad..." /></div>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as 'todos' | TipoMiembro)} aria-label="Filtrar por tipo">
            <option value="todos">Todos</option>
            {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>NOMBRE</th><th>TIPO</th><th>CUMPLEAÑOS</th><th>BAUTIZO</th><th>MINISTERIO</th><th>ACCIONES</th></tr></thead>
            <tbody>
              {cargando && <tr><td className="empty-cell" colSpan={6}>Cargando...</td></tr>}
              {!cargando && filtrados.map((m) => (
                <tr key={m.id}>
                  <td><b>{m.nombre}</b>{m.telefono && <span className="method">{m.telefono}</span>}</td>
                  <td>{tipoLabel(m.tipo)}</td>
                  <td>{fmt(m.cumpleanos)}</td>
                  <td>{fmt(m.fechaBautizo)}</td>
                  <td>{m.ministerio || '—'}</td>
                  <td><div className="row-actions">
                    <button className="status-toggle" onClick={() => setDetalle(m)}>Ver</button>
                    <button className="status-toggle" onClick={() => { setMensaje(''); setEditando({ id: m.id, form: { ...m } }) }}>Editar</button>
                  </div></td>
                </tr>
              ))}
              {!cargando && filtrados.length === 0 && <tr><td className="empty-cell" colSpan={6}>{miembros.length === 0 ? 'Aún no hay personas registradas.' : 'Nada coincide con la búsqueda.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {detalle && (
        <div className="modal-backdrop" onClick={() => setDetalle(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title"><div><span className="eyebrow">{tipoLabel(detalle.tipo)}</span><h2>{detalle.nombre}</h2></div></div>
            <p>Teléfono: {detalle.telefono || '—'}</p>
            <p>Cumpleaños: {fmt(detalle.cumpleanos)}</p>
            <p>Bautizo: {fmt(detalle.fechaBautizo)}</p>
            <p>Ministerio: {detalle.ministerio || '—'}</p>
            <p>Actividades: {detalle.actividades || '—'}</p>
            <p>Notas: {detalle.notas || '—'}</p>
            {detalle.fechas.length > 0 && (
              <>
                <p><b>Otras fechas</b></p>
                {detalle.fechas.map((f) => <p key={f.id}>• {f.titulo}: {fmt(f.fecha)}{f.anual ? ' (cada año)' : ''}</p>)}
              </>
            )}
            {detalle.creadoPor && <small>Registrado por {detalle.creadoPor}</small>}
            <div className="row-actions" style={{ marginTop: 12 }}>
              <button className="status-toggle danger" onClick={() => eliminar(detalle)}>Eliminar</button>
              <button className="status-toggle" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {editando && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title"><div><span className="eyebrow">CONGREGACIÓN</span><h2>{editando.id ? 'Editar persona' : 'Agregar persona'}</h2></div></div>
            <div className="form-grid">
              <label>Nombre completo<input value={editando.form.nombre} onChange={(e) => setF({ nombre: e.target.value })} /></label>
              <label>Tipo
                <select value={editando.form.tipo} onChange={(e) => setF({ tipo: e.target.value as TipoMiembro })}>
                  {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </label>
              <label>Teléfono<input value={editando.form.telefono} onChange={(e) => setF({ telefono: e.target.value })} /></label>
              <label>Cumpleaños<input type="date" value={editando.form.cumpleanos} onChange={(e) => setF({ cumpleanos: e.target.value })} /></label>
              <label>Fecha de bautizo<input type="date" value={editando.form.fechaBautizo} onChange={(e) => setF({ fechaBautizo: e.target.value })} /></label>
              <label>Ministerio en que sirve<input value={editando.form.ministerio} onChange={(e) => setF({ ministerio: e.target.value })} placeholder="Ej. Alabanza, Jóvenes, Diaconado" /></label>
              <label>Actividades en que ha participado<textarea rows={3} value={editando.form.actividades} onChange={(e) => setF({ actividades: e.target.value })} /></label>
              <label>Notas<textarea rows={2} value={editando.form.notas} onChange={(e) => setF({ notas: e.target.value })} /></label>
            </div>
            <p><b>Otras fechas importantes</b> (aniversario, ordenación, etc.)</p>
            {editando.form.fechas.map((f) => (
              <div className="inline-form" key={f.id}>
                <label>Título<input value={f.titulo} onChange={(e) => setFecha(f.id, { titulo: e.target.value })} /></label>
                <label>Fecha<input type="date" value={f.fecha} onChange={(e) => setFecha(f.id, { fecha: e.target.value })} /></label>
                <label><span>Cada año</span><input type="checkbox" checked={f.anual} onChange={(e) => setFecha(f.id, { anual: e.target.checked })} /></label>
                <button className="status-toggle danger" onClick={() => setF({ fechas: editando.form.fechas.filter((x) => x.id !== f.id) })}>Quitar</button>
              </div>
            ))}
            <button className="status-toggle" onClick={() => setF({ fechas: [...editando.form.fechas, { id: nuevoId(), titulo: '', fecha: '', anual: true }] })}>＋ Agregar fecha</button>
            {mensaje && <div className="payment-note" style={{ marginTop: 10 }}>{mensaje}</div>}
            <div className="row-actions" style={{ marginTop: 14 }}>
              <button className="primary-button" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando...' : 'Guardar'}</button>
              <button className="status-toggle" onClick={() => setEditando(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
