import { useMemo, useState } from 'react'
import './App.css'

type Account = { name: 'Melitza' | 'Ovet'; password: string; needsPassword: boolean }
const defaultAccounts: Account[] = [
  { name: 'Melitza', password: '', needsPassword: true },
  { name: 'Ovet', password: '', needsPassword: true },
]
const accountsKey = 'sec-car-accounts'
// Clave administrativa configurable por variable de entorno (VITE_ADMIN_RESET_KEY), sin necesidad de tocar el código
const adminResetKey = import.meta.env.VITE_ADMIN_RESET_KEY || 'SEC-CAR-ADMIN'

function readAccounts(): Account[] {
  const stored = localStorage.getItem(accountsKey)
  return stored ? JSON.parse(stored) as Account[] : defaultAccounts
}

function AccessScreen({ onLogin }: { onLogin: (name: Account['name']) => void }) {
  const [accounts, setAccounts] = useState(readAccounts)
  const [selected, setSelected] = useState<Account['name']>('Melitza')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mode, setMode] = useState<'login' | 'first' | 'recovery'>('login')
  const [message, setMessage] = useState('')

  const current = accounts.find((account) => account.name === selected)!
  const persist = (next: Account[]) => { setAccounts(next); localStorage.setItem(accountsKey, JSON.stringify(next)) }
  const chooseUser = (name: Account['name']) => { setSelected(name); setPassword(''); setConfirm(''); setMessage(''); setMode('login') }

  const submit = () => {
    if (mode === 'first') {
      if (password.length < 6 || password !== confirm) { setMessage('La contraseña debe tener 6 caracteres y coincidir en ambos campos.'); return }
      persist(accounts.map((account) => account.name === selected ? { ...account, password, needsPassword: false } : account))
      setMessage('Contraseña creada. Ya puedes ingresar a SEC-CAR.')
      setMode('login'); setPassword(''); setConfirm(''); return
    }
    if (password && password === current.password && !current.needsPassword) { onLogin(selected); return }
    setMessage('La contraseña no coincide. Si la olvidaste, usa “Recuperar acceso”.')
  }

  const resetAccess = () => {
    if (password !== adminResetKey) { setMessage('Para restablecer accesos usa la clave administrativa definida por el responsable.'); return }
    persist(accounts.map((account) => account.name === selected ? { ...account, password: '', needsPassword: true } : account))
    setPassword(''); setMessage(`Acceso de ${selected} reiniciado. Deberá crear una contraseña nueva al ingresar.`); setMode('login')
  }

  return <div className="auth-shell"><div className="auth-panel"><div className="auth-brand"><div className="brand-mark">SC</div><div><strong>SEC-CAR</strong><span>Centro de Educación Cristiana</span></div></div>
    <div className="auth-copy"><span className="eyebrow">ACCESO PRIVADO</span><h1>{mode === 'recovery' ? 'Recuperar acceso' : mode === 'first' ? 'Crea tu contraseña' : 'Bienvenido de nuevo'}</h1><p>{mode === 'recovery' ? 'El responsable puede reiniciar el acceso de una de las dos cuentas autorizadas.' : mode === 'first' ? `Es la primera vez que ingresa ${selected}. Define una contraseña personal para continuar.` : 'Ingresa con tu cuenta para registrar y consultar los movimientos del centro.'}</p></div>
    {mode !== 'recovery' && <><div className="user-picker"><span>¿Quién eres?</span><div>{(['Melitza', 'Ovet'] as const).map((name) => <button key={name} className={selected === name ? 'user-choice selected' : 'user-choice'} onClick={() => chooseUser(name)}><span className="auth-avatar">{name[0]}</span><span><strong>{name}</strong><small>{accounts.find((account) => account.name === name)?.needsPassword ? 'Primer ingreso' : 'Cuenta activa'}</small></span>{selected === name && <b>✓</b>}</button>)}</div></div><label className="auth-label">{mode === 'first' ? 'Nueva contraseña' : 'Contraseña'}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" /></label>{mode === 'first' && <label className="auth-label">Confirmar contraseña<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repite tu contraseña" /></label>}<button className="auth-submit" onClick={() => current.needsPassword && mode === 'login' ? setMode('first') : submit()}>{current.needsPassword && mode === 'login' ? 'Crear mi contraseña' : mode === 'first' ? 'Guardar contraseña' : 'Ingresar al sistema'} <span>→</span></button><button className="auth-link" onClick={() => { setMode('recovery'); setPassword(''); setMessage('') }}>Olvidé mi contraseña</button></>}
    {mode === 'recovery' && <><div className="recovery-card"><p>Selecciona la cuenta que necesita volver a configurarse.</p><div className="recovery-users">{(['Melitza', 'Ovet'] as const).map((name) => <button key={name} className={selected === name ? 'selected' : ''} onClick={() => setSelected(name)}>{name}<span>{selected === name ? 'Seleccionada' : 'Seleccionar'}</span></button>)}</div><label className="auth-label">Clave administrativa<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="La define el responsable" /></label><button className="auth-submit" onClick={resetAccess}>Reiniciar acceso de {selected} <span>↻</span></button></div><button className="auth-link" onClick={() => { setMode('login'); setPassword(''); setMessage('') }}>Volver al ingreso</button></>}
    {message && <div className="auth-message">{message}</div>}<div className="auth-footer"><span className="sync-dot"></span> Sistema listo para sincronizar con Supabase</div>
    <p className="auth-verse">"Todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres" — Colosenses 3:23</p>
  </div><div className="auth-visual"><div className="visual-note"><span>CONTROL FINANCIERO</span><strong>Recibos claros.<br />Cuentas en orden.</strong><p>Ingresos, egresos y pagos parciales en un solo lugar.</p></div><div className="visual-receipt"><small>SEC-CAR · RECIBO DE PAGO</small><strong>Bs 250.00</strong><span>ORIGINAL + COPIA ADMINISTRACIÓN</span></div></div></div>
}

type Payment = { id: string; receipt: string; person: string; event: string; date: string; amount: number; cash: number; qr: number; status: 'Aplicado' | 'Anulado' }
const initialPayments: Payment[] = [
  { id: '1', receipt: 'REC-00241', person: 'Abigail Mendoza', event: 'Retiro de damas 2024', date: '12 Jun 2024', amount: 250, cash: 250, qr: 0, status: 'Aplicado' },
  { id: '2', receipt: 'REC-00240', person: 'Samuel Chambi', event: 'Campamento juvenil', date: '11 Jun 2024', amount: 180, cash: 80, qr: 100, status: 'Aplicado' },
  { id: '3', receipt: 'REC-00239', person: 'Jorge Valdez', event: 'Seminario de liderazgo', date: '10 Jun 2024', amount: 90, cash: 0, qr: 90, status: 'Aplicado' },
  { id: '4', receipt: 'REC-00238', person: 'María Elena Ruiz', event: 'Retiro de damas 2024', date: '08 Jun 2024', amount: 120, cash: 120, qr: 0, status: 'Aplicado' },
]
const money = (value: number) => `Bs ${value.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`

function App() {
  const [loggedUser, setLoggedUser] = useState<Account['name'] | null>(null)
  const [activePage, setActivePage] = useState('Resumen')
  const [payments, setPayments] = useState(initialPayments)
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null)
  const [form, setForm] = useState({ person: '', event: 'Campamento juvenil', cash: '', qr: '' })
  const filteredPayments = useMemo(() => payments.filter((payment) => `${payment.person} ${payment.event} ${payment.receipt}`.toLowerCase().includes(query.toLowerCase())), [payments, query])
  const total = payments.filter((payment) => payment.status === 'Aplicado').reduce((sum, payment) => sum + payment.amount, 0)
  const savePayment = () => {
    if (!form.person || (!form.cash && !form.qr)) return
    const cash = Number(form.cash) || 0; const qr = Number(form.qr) || 0
    const next: Payment = { id: crypto.randomUUID(), receipt: `REC-${String(242 + payments.length - 4).padStart(5, '0')}`, person: form.person, event: form.event, date: '15 Jun 2024', amount: cash + qr, cash, qr, status: 'Aplicado' }
    setPayments([next, ...payments]); setSelectedReceipt(next); setShowModal(false); setShowReceipt(true); setForm({ person: '', event: 'Campamento juvenil', cash: '', qr: '' })
  }

  if (!loggedUser) return <AccessScreen onLogin={setLoggedUser} />

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">SC</div><div><strong>SEC-CAR</strong><span>Administración</span></div></div><div className="side-label">GESTIÓN</div><nav>{['Resumen', 'Ingresos', 'Egresos', 'Eventos', 'Personas'].map((item) => <button key={item} className={activePage === item ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage(item)}><span className="nav-icon">{item === 'Resumen' ? '▦' : item === 'Ingresos' ? '↗' : item === 'Egresos' ? '↘' : item === 'Eventos' ? '◷' : '♙'}</span>{item}</button>)}</nav><div className="side-label report-label">REPORTES</div><button className="nav-item"><span className="nav-icon">▤</span>Reportes</button><div className="sidebar-bottom"><div className="sync"><span className="sync-dot"></span><div><strong>Sincronizado</strong><small>Todos los cambios guardados</small></div></div><div className="profile"><div className="avatar">JM</div><div><strong>José Manuel</strong><small>Administrador</small></div><span>•••</span></div></div></aside>
    <main className="main-content"><header className="topbar"><div><span className="eyebrow">CENTRO DE EDUCACIÓN CRISTIANA</span><h1>{activePage === 'Resumen' ? 'Resumen general' : activePage}</h1></div><div className="top-actions"><button className="icon-button" aria-label="Notificaciones">♢<span className="notification-dot"></span></button><div className="date-pill">15 JUN 2024 <span>⌄</span></div></div></header>
      {activePage === 'Resumen' ? <><section className="hero-row"><div><h2>Buenos días, José Manuel <span>✦</span></h2><p>Aquí tienes el movimiento de tu centro para hoy.</p></div><button className="primary-button" onClick={() => setShowModal(true)}><span>＋</span> Nuevo recibo</button></section><section className="stats-grid"><div className="stat-card accent-card"><div className="stat-head"><span>INGRESOS DEL MES</span><i>↗</i></div><strong>{money(total)}</strong><small><b>↑ 12.5%</b> vs. mes anterior</small><div className="sparkline"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></div><div className="stat-card"><div className="stat-head"><span>INGRESOS DE HOY</span><i className="green-icon">◷</i></div><strong>{money(250)}</strong><small><b className="dark">4 recibos</b> registrados hoy</small><div className="mini-bars"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></div><div className="stat-card"><div className="stat-head"><span>PENDIENTE POR COBRAR</span><i className="amber-icon">◌</i></div><strong>{money(1250)}</strong><small><b className="dark">18 personas</b> con saldo pendiente</small><div className="progress"><span></span></div><small className="progress-label">68% del total de inscripciones</small></div></section><section className="content-grid"><div className="panel transactions"><div className="panel-head"><div><h3>Últimos movimientos</h3><p>Los recibos más recientes del centro</p></div><button className="text-button" onClick={() => setActivePage('Ingresos')}>Ver todos <span>→</span></button></div><div className="filters"><div className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o recibo..." /></div><button className="filter-button">Fechas: <b>Este mes</b> ⌄</button><button className="filter-button">Tipo: <b>Todos</b> ⌄</button></div><div className="table-wrap"><table><thead><tr><th>RECIBO</th><th>PERSONA</th><th>CONCEPTO</th><th>FECHA</th><th>MONTO</th><th>ESTADO</th><th></th></tr></thead><tbody>{filteredPayments.map((payment) => <tr key={payment.id}><td><button className="receipt-link" onClick={() => { setSelectedReceipt(payment); setShowReceipt(true) }}>{payment.receipt}</button></td><td><div className="person-cell"><div className="tiny-avatar">{payment.person.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><strong>{payment.person}</strong></div></td><td>{payment.event}</td><td>{payment.date}</td><td><strong>{money(payment.amount)}</strong><small className="method">{payment.cash > 0 && payment.qr > 0 ? 'Efectivo + QR' : payment.qr > 0 ? 'QR' : 'Efectivo'}</small></td><td><span className="status">● {payment.status}</span></td><td><button className="more-button">•••</button></td></tr>)}</tbody></table></div></div><div className="panel events"><div className="panel-head"><div><h3>Próximos eventos</h3><p>Inscripciones abiertas</p></div><button className="more-button">•••</button></div>{[['22', 'JUN', 'Campamento juvenil', '22 - 24 Jun 2024', '24 / 40'], ['06', 'JUL', 'Seminario de liderazgo', '06 Jul 2024', '18 / 30'], ['17', 'AGO', 'Retiro de damas 2024', '17 - 18 Ago 2024', '12 / 50']].map((event) => <div className="event-item" key={event[2]}><div className="event-date"><b>{event[0]}</b><span>{event[1]}</span></div><div><strong>{event[2]}</strong><small>{event[3]}</small></div><span className="event-count">{event[4]}</span></div>)}<button className="outline-button" onClick={() => setActivePage('Eventos')}>Gestionar eventos <span>→</span></button></div></section></> : <section className="empty-page"><div className="empty-icon">{activePage === 'Ingresos' ? '↗' : activePage === 'Egresos' ? '↘' : '◷'}</div><h2>Gestión de {activePage.toLowerCase()}</h2><p>Esta vista está lista para conectar con el registro detallado.</p><button className="primary-button" onClick={() => setShowModal(true)}>＋ Nuevo registro</button></section>}
    </main>
    {showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-title"><div><span className="eyebrow">NUEVO MOVIMIENTO</span><h2>Emitir recibo</h2></div><button className="close-button" onClick={() => setShowModal(false)}>×</button></div><label>Nombre de la persona<input value={form.person} onChange={(event) => setForm({ ...form, person: event.target.value })} placeholder="Ej. Ana Lopez" /></label><label>Evento<select value={form.event} onChange={(event) => setForm({ ...form, event: event.target.value })}><option>Campamento juvenil</option><option>Seminario de liderazgo</option><option>Retiro de damas 2024</option></select></label><div className="form-row"><label>Efectivo (Bs)<input type="number" value={form.cash} onChange={(event) => setForm({ ...form, cash: event.target.value })} placeholder="0.00" /></label><label>QR (Bs)<input type="number" value={form.qr} onChange={(event) => setForm({ ...form, qr: event.target.value })} placeholder="0.00" /></label></div><div className="payment-note">Puedes combinar efectivo y QR en un mismo recibo. El original y la copia se preparan para imprimir.</div><button className="primary-button full" onClick={savePayment}>Guardar y emitir recibo <span>→</span></button></div></div>}
    {showReceipt && selectedReceipt && <div className="modal-backdrop" onClick={() => setShowReceipt(false)}><div className="receipt-modal" onClick={(event) => event.stopPropagation()}><div className="receipt-actions"><span>Vista previa del comprobante</span><button className="close-button" onClick={() => setShowReceipt(false)}>×</button></div><div className="receipt-paper"><div className="receipt-brand">SEC-CAR<small>Centro de Educación Cristiana</small></div><div className="receipt-type">RECIBO DE PAGO <strong>{selectedReceipt.receipt}</strong></div><div className="receipt-line"><span>Recibí de:</span><b>{selectedReceipt.person}</b></div><div className="receipt-line"><span>Concepto:</span><b>{selectedReceipt.event}</b></div><div className="receipt-line"><span>Fecha:</span><b>{selectedReceipt.date}</b></div><div className="receipt-total"><span>TOTAL PAGADO</span><strong>{money(selectedReceipt.amount)}</strong></div><div className="receipt-methods"><span>Efectivo {money(selectedReceipt.cash)}</span><span>QR {money(selectedReceipt.qr)}</span></div><div className="signature-row"><span>Firma del pagador</span><span>Firma administrador</span></div><div className="copy-mark">ORIGINAL <span>·</span> COPIA ADMINISTRACIÓN</div></div><button className="outline-button full" onClick={() => window.print()}>Imprimir original y copia <span>↗</span></button></div></div>}
  </div>
}

export default App
