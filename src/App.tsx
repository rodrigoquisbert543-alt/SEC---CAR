import { useEffect, useMemo, useState } from 'react'
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

  return <div className="auth-shell"><div className="auth-panel"><div className="auth-brand"><div className="brand-mark"><img src="/logo-seccar.jpg" alt="SEC-CAR" /></div><div><strong>SEC-CAR</strong><span>Seminario de Educación Cristiana</span></div></div>
    <div className="auth-copy"><span className="eyebrow">ACCESO PRIVADO</span><h1>{mode === 'recovery' ? 'Recuperar acceso' : mode === 'first' ? 'Crea tu contraseña' : 'Bienvenido de nuevo'}</h1><p>{mode === 'recovery' ? 'El responsable puede reiniciar el acceso de una de las dos cuentas autorizadas.' : mode === 'first' ? `Es la primera vez que ingresa ${selected}. Define una contraseña personal para continuar.` : 'Ingresa con tu cuenta para registrar y consultar los movimientos del centro.'}</p></div>
    {mode !== 'recovery' && <><div className="user-picker"><span>¿Quién eres?</span><div>{(['Melitza', 'Ovet'] as const).map((name) => <button key={name} className={selected === name ? 'user-choice selected' : 'user-choice'} onClick={() => chooseUser(name)}><span className="auth-avatar">{name[0]}</span><span><strong>{name}</strong><small>{accounts.find((account) => account.name === name)?.needsPassword ? 'Primer ingreso' : 'Cuenta activa'}</small></span>{selected === name && <b>✓</b>}</button>)}</div></div><label className="auth-label">{mode === 'first' ? 'Nueva contraseña' : 'Contraseña'}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" /></label>{mode === 'first' && <label className="auth-label">Confirmar contraseña<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repite tu contraseña" /></label>}<button className="auth-submit" onClick={() => current.needsPassword && mode === 'login' ? setMode('first') : submit()}>{current.needsPassword && mode === 'login' ? 'Crear mi contraseña' : mode === 'first' ? 'Guardar contraseña' : 'Ingresar al sistema'} <span>→</span></button><button className="auth-link" onClick={() => { setMode('recovery'); setPassword(''); setMessage('') }}>Olvidé mi contraseña</button></>}
    {mode === 'recovery' && <><div className="recovery-card"><p>Selecciona la cuenta que necesita volver a configurarse.</p><div className="recovery-users">{(['Melitza', 'Ovet'] as const).map((name) => <button key={name} className={selected === name ? 'selected' : ''} onClick={() => setSelected(name)}>{name}<span>{selected === name ? 'Seleccionada' : 'Seleccionar'}</span></button>)}</div><label className="auth-label">Clave administrativa<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="La define el responsable" /></label><button className="auth-submit" onClick={resetAccess}>Reiniciar acceso de {selected} <span>↻</span></button></div><button className="auth-link" onClick={() => { setMode('login'); setPassword(''); setMessage('') }}>Volver al ingreso</button></>}
    {message && <div className="auth-message">{message}</div>}<div className="auth-footer"><span className="sync-dot"></span> Sistema listo para sincronizar con Supabase</div>
    <p className="auth-verse">"Todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres" — Colosenses 3:23</p>
  </div><div className="auth-visual"><div className="visual-note"><span>CONTROL FINANCIERO</span><strong>Recibos claros.<br />Cuentas en orden.</strong><p>Ingresos, egresos y pagos parciales en un solo lugar.</p></div><div className="visual-receipt"><small>SEC-CAR · RECIBO DE PAGO</small><strong>Bs 250.00</strong><span>ORIGINAL + COPIA ADMINISTRACIÓN</span></div></div></div>
}

// Persiste cualquier estado en localStorage bajo la clave dada
function usePersistedState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : initial
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)) }, [key, state])
  return [state, setState] as const
}

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const formatDate = (iso: string) => { const d = new Date(`${iso}T00:00:00`); return `${String(d.getDate()).padStart(2, '0')} ${monthNames[d.getMonth()]} ${d.getFullYear()}` }
const todayISO = () => new Date().toISOString().slice(0, 10)
const money = (value: number) => `Bs ${value.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`
const nextCode = (prefix: string, count: number) => `${prefix}-${String(count).padStart(5, '0')}`

type Payment = { id: string; receipt: string; person: string; concept: string; date: string; amount: number; cash: number; qr: number; status: 'Aplicado' | 'Anulado'; issuedBy: Account['name'] }
type Expense = { id: string; voucher: string; concept: string; recipient: string; category: string; date: string; amount: number; cash: number; qr: number; status: 'Aplicado' | 'Anulado'; issuedBy: Account['name'] }
type Person = { id: string; name: string; phone: string; notes: string }

const initialPayments: Payment[] = [
  { id: '1', receipt: 'REC-00241', person: 'Abigail Mendoza', concept: 'Retiro de damas 2024', date: '2024-06-12', amount: 250, cash: 250, qr: 0, status: 'Aplicado', issuedBy: 'Melitza' },
  { id: '2', receipt: 'REC-00240', person: 'Samuel Chambi', concept: 'Campamento juvenil', date: '2024-06-11', amount: 180, cash: 80, qr: 100, status: 'Aplicado', issuedBy: 'Ovet' },
  { id: '3', receipt: 'REC-00239', person: 'Jorge Valdez', concept: 'Seminario de liderazgo', date: '2024-06-10', amount: 90, cash: 0, qr: 90, status: 'Aplicado', issuedBy: 'Ovet' },
  { id: '4', receipt: 'REC-00238', person: 'María Elena Ruiz', concept: 'Retiro de damas 2024', date: '2024-06-08', amount: 120, cash: 120, qr: 0, status: 'Aplicado', issuedBy: 'Melitza' },
]

const initialExpenses: Expense[] = [
  { id: 'e1', voucher: 'EGR-00032', concept: 'Pago de electricidad', recipient: 'ENDE', category: 'Servicios básicos', date: '2024-06-09', amount: 145, cash: 145, qr: 0, status: 'Aplicado', issuedBy: 'Ovet' },
  { id: 'e2', voucher: 'EGR-00031', concept: 'Materiales para campamento', recipient: 'Ferretería Central', category: 'Materiales y suministros', date: '2024-06-07', amount: 210, cash: 60, qr: 150, status: 'Aplicado', issuedBy: 'Melitza' },
]

const initialEventOptions = ['Campamento juvenil', 'Seminario de liderazgo', 'Retiro de damas 2024']
const initialCategoryOptions = ['Servicios básicos', 'Mantenimiento', 'Materiales y suministros', 'Alimentación', 'Transporte', 'Honorarios', 'Otros']
const initialPeople: Person[] = []
const navItems = ['Resumen', 'Ingresos', 'Egresos', 'Eventos', 'Personas'] as const

function App() {
  const [loggedUser, setLoggedUser] = useState<Account['name'] | null>(null)
  const [activePage, setActivePage] = useState<string>('Resumen')

  const [payments, setPayments] = usePersistedState<Payment[]>('sec-car-payments', initialPayments)
  const [expenses, setExpenses] = usePersistedState<Expense[]>('sec-car-expenses', initialExpenses)
  const [eventOptions, setEventOptions] = usePersistedState<string[]>('sec-car-events', initialEventOptions)
  const [categoryOptions, setCategoryOptions] = usePersistedState<string[]>('sec-car-categories', initialCategoryOptions)
  const [people, setPeople] = usePersistedState<Person[]>('sec-car-people', initialPeople)
  const [theme, setTheme] = usePersistedState<'light' | 'dark'>('sec-car-theme', 'light')

  const [query, setQuery] = useState('')
  const [expenseQuery, setExpenseQuery] = useState('')
  const [newEventName, setNewEventName] = useState('')

  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showVoucher, setShowVoucher] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null)
  const [selectedVoucher, setSelectedVoucher] = useState<Expense | null>(null)

  const [incomeForm, setIncomeForm] = useState({ person: '', concept: '', cash: '', qr: '' })
  const [expenseForm, setExpenseForm] = useState({ concept: '', recipient: '', category: '', cash: '', qr: '' })
  const [personForm, setPersonForm] = useState({ name: '', phone: '', notes: '' })
  const [confirmClear, setConfirmClear] = useState('')

  const filteredPayments = useMemo(() => payments.filter((p) => `${p.person} ${p.concept} ${p.receipt}`.toLowerCase().includes(query.toLowerCase())), [payments, query])
  const filteredExpenses = useMemo(() => expenses.filter((e) => `${e.recipient} ${e.concept} ${e.category} ${e.voucher}`.toLowerCase().includes(expenseQuery.toLowerCase())), [expenses, expenseQuery])

  const activeIncome = payments.filter((p) => p.status === 'Aplicado')
  const activeExpenses = expenses.filter((e) => e.status === 'Aplicado')
  const totalIncome = activeIncome.reduce((sum, p) => sum + p.amount, 0)
  const totalExpense = activeExpenses.reduce((sum, e) => sum + e.amount, 0)
  const balance = totalIncome - totalExpense

  const thisMonth = todayISO().slice(0, 7)
  const incomeThisMonthList = activeIncome.filter((p) => p.date.slice(0, 7) === thisMonth)
  const expenseThisMonthList = activeExpenses.filter((e) => e.date.slice(0, 7) === thisMonth)
  const incomeThisMonth = incomeThisMonthList.reduce((sum, p) => sum + p.amount, 0)
  const expenseThisMonth = expenseThisMonthList.reduce((sum, e) => sum + e.amount, 0)

  const movements = useMemo(() => {
    const incomes = payments.map((p) => ({ id: p.id, type: 'Ingreso' as const, code: p.receipt, label: p.person, concept: p.concept, date: p.date, amount: p.amount, status: p.status }))
    const outs = expenses.map((e) => ({ id: e.id, type: 'Egreso' as const, code: e.voucher, label: e.recipient, concept: e.concept, date: e.date, amount: e.amount, status: e.status }))
    return [...incomes, ...outs].sort((a, b) => b.date.localeCompare(a.date))
  }, [payments, expenses])

  const eventStats = eventOptions.map((name) => {
    const related = payments.filter((p) => p.concept === name)
    return { name, count: related.length, total: related.reduce((sum, p) => sum + p.amount, 0) }
  })

  const peopleWithTotals = people.map((person) => {
    const related = payments.filter((p) => p.person.toLowerCase() === person.name.toLowerCase() && p.status === 'Aplicado')
    return { ...person, total: related.reduce((sum, p) => sum + p.amount, 0), count: related.length }
  })
  const undirectoried = Array.from(new Set(payments.map((p) => p.person))).filter((name) => !people.some((person) => person.name.toLowerCase() === name.toLowerCase()))

  const saveIncome = () => {
    const cash = Number(incomeForm.cash) || 0
    const qr = Number(incomeForm.qr) || 0
    if (!incomeForm.person.trim() || !incomeForm.concept.trim() || (!cash && !qr)) return
    const concept = incomeForm.concept.trim()
    const next: Payment = { id: crypto.randomUUID(), receipt: nextCode('REC', 242 + payments.length), person: incomeForm.person.trim(), concept, date: todayISO(), amount: cash + qr, cash, qr, status: 'Aplicado', issuedBy: loggedUser! }
    setPayments([next, ...payments])
    if (!eventOptions.includes(concept)) setEventOptions([...eventOptions, concept])
    setSelectedReceipt(next); setShowIncomeModal(false); setShowReceipt(true)
    setIncomeForm({ person: '', concept: '', cash: '', qr: '' })
  }

  const saveExpense = () => {
    const cash = Number(expenseForm.cash) || 0
    const qr = Number(expenseForm.qr) || 0
    if (!expenseForm.recipient.trim() || !expenseForm.concept.trim() || (!cash && !qr)) return
    const category = expenseForm.category.trim() || 'Otros'
    const next: Expense = { id: crypto.randomUUID(), voucher: nextCode('EGR', 33 + expenses.length), concept: expenseForm.concept.trim(), recipient: expenseForm.recipient.trim(), category, date: todayISO(), amount: cash + qr, cash, qr, status: 'Aplicado', issuedBy: loggedUser! }
    setExpenses([next, ...expenses])
    if (!categoryOptions.includes(category)) setCategoryOptions([...categoryOptions, category])
    setSelectedVoucher(next); setShowExpenseModal(false); setShowVoucher(true)
    setExpenseForm({ concept: '', recipient: '', category: '', cash: '', qr: '' })
  }

  const toggleIncomeStatus = (id: string) => setPayments(payments.map((p) => p.id === id ? { ...p, status: p.status === 'Aplicado' ? 'Anulado' : 'Aplicado' } : p))
  const toggleExpenseStatus = (id: string) => setExpenses(expenses.map((e) => e.id === id ? { ...e, status: e.status === 'Aplicado' ? 'Anulado' : 'Aplicado' } : e))
  const canManage = (owner?: Account['name']) => !owner || owner === loggedUser
  const addEventOption = () => { const name = newEventName.trim(); if (name && !eventOptions.includes(name)) setEventOptions([...eventOptions, name]); setNewEventName('') }
  const removeEventOption = (name: string) => setEventOptions(eventOptions.filter((option) => option !== name))
  const addPerson = () => {
    if (!personForm.name.trim()) return
    setPeople([...people, { id: crypto.randomUUID(), name: personForm.name.trim(), phone: personForm.phone.trim(), notes: personForm.notes.trim() }])
    setPersonForm({ name: '', phone: '', notes: '' })
  }
  const removePerson = (id: string) => setPeople(people.filter((person) => person.id !== id))
  const registerPayer = (name: string) => setPeople([...people, { id: crypto.randomUUID(), name, phone: '', notes: '' }])

  const exportBackup = () => {
    const header = ['Tipo', 'Codigo', 'Persona/Destinatario', 'Concepto', 'Categoria', 'Fecha', 'Monto', 'Efectivo', 'QR', 'Estado', 'Registrado por']
    const rows = [
      header,
      ...payments.map((p) => ['Ingreso', p.receipt, p.person, p.concept, '', p.date, p.amount, p.cash, p.qr, p.status, p.issuedBy || '']),
      ...expenses.map((e) => ['Egreso', e.voucher, e.recipient, e.concept, e.category, e.date, e.amount, e.cash, e.qr, e.status, e.issuedBy || '']),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url; link.download = `sec-car-historial-${todayISO()}.csv`; link.click()
    URL.revokeObjectURL(url)
  }
  const clearHistory = () => {
    if (confirmClear.trim().toUpperCase() !== 'BORRAR') return
    setPayments([]); setExpenses([]); setConfirmClear('')
  }

  if (!loggedUser) return <AccessScreen onLogin={setLoggedUser} />

  return <div className={`app-shell ${theme}`}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><img src="/logo-seccar.jpg" alt="SEC-CAR" /></div><div><strong>SEC-CAR</strong><span>Administración</span></div></div>
      <div className="side-label">GESTIÓN</div>
      <nav>{navItems.map((item) => <button key={item} className={activePage === item ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage(item)}><span className="nav-icon">{item === 'Resumen' ? '▦' : item === 'Ingresos' ? '↗' : item === 'Egresos' ? '↘' : item === 'Eventos' ? '◷' : '♙'}</span>{item}</button>)}</nav>
      <div className="side-label report-label">REPORTES</div>
      <button className={activePage === 'Reportes' ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage('Reportes')}><span className="nav-icon">▤</span>Reportes</button>
      <div className="sidebar-bottom">
        <div className="sync"><span className="sync-dot"></span><div><strong>Sincronizado</strong><small>Todos los cambios guardados</small></div></div>
        <div className="profile"><div className="avatar">{loggedUser[0]}</div><div><strong>{loggedUser}</strong><small>Administrador</small></div><span>•••</span></div>
      </div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><span className="eyebrow">SEMINARIO DE EDUCACIÓN CRISTIANA</span><h1>{activePage === 'Resumen' ? 'Resumen general' : activePage}</h1></div><div className="top-actions"><button className="icon-button" aria-label="Cambiar tema" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀' : '☾'}</button><button className="icon-button" aria-label="Notificaciones">♢<span className="notification-dot"></span></button><div className="date-pill">{formatDate(todayISO())} <span>⌄</span></div></div></header>

      {activePage === 'Resumen' && <>
        <section className="hero-row"><div><h2>Buenos días, {loggedUser} <span>✦</span></h2><p>Aquí tienes el movimiento de tu centro para hoy.</p></div><div className="hero-actions"><button className="outline-button" onClick={() => setShowExpenseModal(true)}><span>−</span> Nuevo egreso</button><button className="primary-button" onClick={() => setShowIncomeModal(true)}><span>＋</span> Nuevo recibo</button></div></section>
        <section className="stats-grid">
          <div className="stat-card accent-card"><div className="stat-head"><span>INGRESOS DEL MES</span><i>↗</i></div><strong>{money(incomeThisMonth)}</strong><small><b className="dark">{incomeThisMonthList.length} recibos</b> este mes</small></div>
          <div className="stat-card"><div className="stat-head"><span>EGRESOS DEL MES</span><i className="rose-icon">↘</i></div><strong>{money(expenseThisMonth)}</strong><small><b className="dark">{expenseThisMonthList.length} egresos</b> este mes</small></div>
          <div className="stat-card"><div className="stat-head"><span>SALDO ACTUAL</span><i className="green-icon">◈</i></div><strong>{money(balance)}</strong><small><b className={balance >= 0 ? 'dark' : 'rose-text'}>{balance >= 0 ? 'Saldo positivo' : 'Saldo negativo'}</b></small></div>
        </section>
        <section className="content-grid">
          <div className="panel transactions">
            <div className="panel-head"><div><h3>Últimos movimientos</h3><p>Ingresos y egresos más recientes</p></div><button className="text-button" onClick={() => setActivePage('Ingresos')}>Ver todos <span>→</span></button></div>
            <div className="table-wrap"><table><thead><tr><th>CÓDIGO</th><th>TIPO</th><th>DETALLE</th><th>FECHA</th><th>MONTO</th><th>ESTADO</th></tr></thead><tbody>
              {movements.slice(0, 6).map((m) => <tr key={`${m.type}-${m.id}`}>
                <td>{m.code}</td>
                <td><span className={m.type === 'Ingreso' ? 'status' : 'status void'}>{m.type}</span></td>
                <td className="person-cell"><span className="tiny-avatar">{m.label[0]}</span><span>{m.label}<span className="method">{m.concept}</span></span></td>
                <td>{formatDate(m.date)}</td>
                <td>{money(m.amount)}</td>
                <td><span className={m.status === 'Aplicado' ? 'status' : 'status void'}>{m.status}</span></td>
              </tr>)}
            </tbody></table></div>
          </div>
          <div className="panel events">
            <div className="panel-head"><div><h3>Eventos y conceptos</h3><p>Sugerencias usadas al emitir recibos</p></div><button className="text-button" onClick={() => setActivePage('Eventos')}>Gestionar <span>→</span></button></div>
            {eventStats.length === 0 && <p className="empty-hint">Aún no hay eventos registrados.</p>}
            {eventStats.map((stat) => <div className="event-item" key={stat.name}><div className="event-date"><b>{stat.count}</b><span>recibos</span></div><div><strong>{stat.name}</strong><small>{money(stat.total)} recaudados</small></div></div>)}
          </div>
        </section>
      </>}

      {activePage === 'Ingresos' && <section className="panel transactions">
        <div className="panel-head"><div><h3>Ingresos</h3><p>Todos los recibos emitidos</p></div><button className="primary-button" onClick={() => setShowIncomeModal(true)}><span>＋</span> Nuevo recibo</button></div>
        <div className="filters"><div className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, concepto o recibo..." /></div></div>
        <div className="table-wrap"><table><thead><tr><th>RECIBO</th><th>PERSONA</th><th>CONCEPTO</th><th>FECHA</th><th>MONTO</th><th>REGISTRADO POR</th><th>ESTADO</th><th></th></tr></thead><tbody>
          {filteredPayments.map((payment) => <tr key={payment.id}>
            <td><button className="receipt-link" onClick={() => { setSelectedReceipt(payment); setShowReceipt(true) }}>{payment.receipt}</button></td>
            <td className="person-cell"><span className="tiny-avatar">{payment.person[0]}</span>{payment.person}</td>
            <td>{payment.concept}</td>
            <td>{formatDate(payment.date)}</td>
            <td>{money(payment.amount)}<span className="method">Efectivo {money(payment.cash)} · QR {money(payment.qr)}</span></td>
            <td>{payment.issuedBy || '—'}</td>
            <td><span className={payment.status === 'Aplicado' ? 'status' : 'status void'}>{payment.status}</span></td>
            <td>{canManage(payment.issuedBy) ? <button className="status-toggle" onClick={() => toggleIncomeStatus(payment.id)}>{payment.status === 'Aplicado' ? 'Anular' : 'Reactivar'}</button> : <span className="owner-lock">Solo {payment.issuedBy}</span>}</td>
          </tr>)}
        </tbody></table></div>
      </section>}

      {activePage === 'Egresos' && <section className="panel transactions">
        <div className="panel-head"><div><h3>Egresos</h3><p>Todos los pagos y gastos registrados</p></div><button className="primary-button" onClick={() => setShowExpenseModal(true)}><span>＋</span> Nuevo egreso</button></div>
        <div className="filters"><div className="search"><span>⌕</span><input value={expenseQuery} onChange={(event) => setExpenseQuery(event.target.value)} placeholder="Buscar por destinatario, categoría o comprobante..." /></div></div>
        <div className="table-wrap"><table><thead><tr><th>COMPROBANTE</th><th>DESTINATARIO</th><th>CONCEPTO</th><th>CATEGORÍA</th><th>FECHA</th><th>MONTO</th><th>REGISTRADO POR</th><th>ESTADO</th><th></th></tr></thead><tbody>
          {filteredExpenses.map((expense) => <tr key={expense.id}>
            <td><button className="receipt-link" onClick={() => { setSelectedVoucher(expense); setShowVoucher(true) }}>{expense.voucher}</button></td>
            <td className="person-cell"><span className="tiny-avatar">{expense.recipient[0]}</span>{expense.recipient}</td>
            <td>{expense.concept}</td>
            <td>{expense.category}</td>
            <td>{formatDate(expense.date)}</td>
            <td>{money(expense.amount)}<span className="method">Efectivo {money(expense.cash)} · QR {money(expense.qr)}</span></td>
            <td>{expense.issuedBy || '—'}</td>
            <td><span className={expense.status === 'Aplicado' ? 'status' : 'status void'}>{expense.status}</span></td>
            <td>{canManage(expense.issuedBy) ? <button className="status-toggle" onClick={() => toggleExpenseStatus(expense.id)}>{expense.status === 'Aplicado' ? 'Anular' : 'Reactivar'}</button> : <span className="owner-lock">Solo {expense.issuedBy}</span>}</td>
          </tr>)}
        </tbody></table></div>
      </section>}

      {activePage === 'Eventos' && <section className="panel">
        <div className="panel-head"><div><h3>Eventos y conceptos</h3><p>Estas sugerencias aparecen al registrar un ingreso; el campo de concepto siempre acepta texto libre.</p></div></div>
        <div className="inline-form">
          <label>Nuevo evento o concepto<input value={newEventName} onChange={(event) => setNewEventName(event.target.value)} placeholder="Ej. Retiro de varones 2025" /></label>
          <button className="primary-button" onClick={addEventOption}>Agregar</button>
        </div>
        <div className="chip-list">
          {eventStats.map((stat) => <div className="chip" key={stat.name}><div><strong>{stat.name}</strong><small>{stat.count} recibos · {money(stat.total)}</small></div><button onClick={() => removeEventOption(stat.name)} aria-label={`Quitar ${stat.name}`}>×</button></div>)}
        </div>
      </section>}

      {activePage === 'Personas' && <section className="panel">
        <div className="panel-head"><div><h3>Directorio de personas</h3><p>Contactos registrados y su historial de aportes</p></div></div>
        <div className="inline-form">
          <label>Nombre<input value={personForm.name} onChange={(event) => setPersonForm({ ...personForm, name: event.target.value })} placeholder="Nombre completo" /></label>
          <label>Teléfono<input value={personForm.phone} onChange={(event) => setPersonForm({ ...personForm, phone: event.target.value })} placeholder="Opcional" /></label>
          <label>Notas<input value={personForm.notes} onChange={(event) => setPersonForm({ ...personForm, notes: event.target.value })} placeholder="Opcional" /></label>
          <button className="primary-button" onClick={addPerson}>Agregar persona</button>
        </div>
        <div className="table-wrap"><table><thead><tr><th>NOMBRE</th><th>TELÉFONO</th><th>NOTAS</th><th>TOTAL APORTADO</th><th></th></tr></thead><tbody>
          {peopleWithTotals.map((person) => <tr key={person.id}>
            <td className="person-cell"><span className="tiny-avatar">{person.name[0]}</span>{person.name}</td>
            <td>{person.phone || '—'}</td>
            <td>{person.notes || '—'}</td>
            <td>{money(person.total)}<span className="method">{person.count} recibos</span></td>
            <td><button className="status-toggle" onClick={() => removePerson(person.id)}>Quitar</button></td>
          </tr>)}
        </tbody></table></div>
        {undirectoried.length > 0 && <div className="chip-list">
          {undirectoried.map((name) => <div className="chip" key={name}><div><strong>{name}</strong><small>Ya tiene recibos, aún no está en el directorio</small></div><button onClick={() => registerPayer(name)} aria-label={`Agregar ${name}`}>＋</button></div>)}
        </div>}
      </section>}

      {activePage === 'Reportes' && <>
        <section className="stats-grid">
          <div className="stat-card accent-card"><div className="stat-head"><span>TOTAL INGRESOS</span><i>↗</i></div><strong>{money(totalIncome)}</strong><small>Efectivo {money(activeIncome.reduce((s, p) => s + p.cash, 0))} · QR {money(activeIncome.reduce((s, p) => s + p.qr, 0))}</small></div>
          <div className="stat-card"><div className="stat-head"><span>TOTAL EGRESOS</span><i className="rose-icon">↘</i></div><strong>{money(totalExpense)}</strong><small>Efectivo {money(activeExpenses.reduce((s, e) => s + e.cash, 0))} · QR {money(activeExpenses.reduce((s, e) => s + e.qr, 0))}</small></div>
          <div className="stat-card"><div className="stat-head"><span>SALDO GENERAL</span><i className="green-icon">◈</i></div><strong>{money(balance)}</strong><small>Desde el inicio del registro</small></div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h3>Respaldo y mantenimiento</h3><p>Descarga el historial antes de vaciarlo, para no perder datos antiguos</p></div></div>
          <div className="payment-note">Recomendamos descargar este archivo periódicamente y guardarlo en tu Google Drive (u otro almacenamiento). Así, si en el futuro necesitas liberar espacio, puedes vaciar el historial sin perder los registros antiguos.</div>
          <div className="inline-form"><button className="outline-button" onClick={exportBackup}>Descargar historial (CSV) <span>↓</span></button></div>
          <div className="inline-form">
            <label>Escribe BORRAR para confirmar<input value={confirmClear} onChange={(event) => setConfirmClear(event.target.value)} placeholder="BORRAR" /></label>
            <button className="danger-button" disabled={confirmClear.trim().toUpperCase() !== 'BORRAR'} onClick={clearHistory}>Vaciar historial de ingresos y egresos</button>
          </div>
        </section>
      </>}
    </main>

    {showIncomeModal && <div className="modal-backdrop" onClick={() => setShowIncomeModal(false)}><div className="modal" onClick={(event) => event.stopPropagation()}>
      <div className="modal-title"><div><span className="eyebrow">NUEVO MOVIMIENTO</span><h2>Emitir recibo</h2></div><button className="close-button" onClick={() => setShowIncomeModal(false)}>×</button></div>
      <label>Nombre de la persona<input value={incomeForm.person} onChange={(event) => setIncomeForm({ ...incomeForm, person: event.target.value })} placeholder="Ej. Ana Lopez" /></label>
      <label>Evento o concepto<input list="event-suggestions" value={incomeForm.concept} onChange={(event) => setIncomeForm({ ...incomeForm, concept: event.target.value })} placeholder="Escribe libremente o elige una sugerencia" /><datalist id="event-suggestions">{eventOptions.map((option) => <option value={option} key={option} />)}</datalist></label>
      <div className="form-row"><label>Efectivo (Bs)<input type="number" value={incomeForm.cash} onChange={(event) => setIncomeForm({ ...incomeForm, cash: event.target.value })} placeholder="0.00" /></label><label>QR (Bs)<input type="number" value={incomeForm.qr} onChange={(event) => setIncomeForm({ ...incomeForm, qr: event.target.value })} placeholder="0.00" /></label></div>
      <div className="payment-note">Puedes combinar efectivo y QR en un mismo recibo. El concepto es libre; las sugerencias solo ayudan a escribir más rápido.</div>
      <button className="primary-button full" onClick={saveIncome}>Guardar y emitir recibo <span>→</span></button>
    </div></div>}

    {showExpenseModal && <div className="modal-backdrop" onClick={() => setShowExpenseModal(false)}><div className="modal" onClick={(event) => event.stopPropagation()}>
      <div className="modal-title"><div><span className="eyebrow">NUEVO MOVIMIENTO</span><h2>Registrar egreso</h2></div><button className="close-button" onClick={() => setShowExpenseModal(false)}>×</button></div>
      <label>Pagado a<input value={expenseForm.recipient} onChange={(event) => setExpenseForm({ ...expenseForm, recipient: event.target.value })} placeholder="Ej. Ferretería Central" /></label>
      <label>Concepto<input value={expenseForm.concept} onChange={(event) => setExpenseForm({ ...expenseForm, concept: event.target.value })} placeholder="Ej. Materiales para campamento" /></label>
      <label>Categoría<input list="category-suggestions" value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} placeholder="Escribe libremente o elige una sugerencia" /><datalist id="category-suggestions">{categoryOptions.map((option) => <option value={option} key={option} />)}</datalist></label>
      <div className="form-row"><label>Efectivo (Bs)<input type="number" value={expenseForm.cash} onChange={(event) => setExpenseForm({ ...expenseForm, cash: event.target.value })} placeholder="0.00" /></label><label>QR (Bs)<input type="number" value={expenseForm.qr} onChange={(event) => setExpenseForm({ ...expenseForm, qr: event.target.value })} placeholder="0.00" /></label></div>
      <div className="payment-note">Puedes combinar efectivo y QR en un mismo egreso. La categoría es libre; las sugerencias solo ayudan a escribir más rápido.</div>
      <button className="primary-button full" onClick={saveExpense}>Guardar y emitir comprobante <span>→</span></button>
    </div></div>}

    {showReceipt && selectedReceipt && <div className="modal-backdrop" onClick={() => setShowReceipt(false)}><div className="receipt-modal" onClick={(event) => event.stopPropagation()}>
      <div className="receipt-actions"><span>Vista previa del comprobante</span><button className="close-button" onClick={() => setShowReceipt(false)}>×</button></div>
      <div className="receipt-paper"><div className="receipt-brand">SEC-CAR<small>Seminario de Educación Cristiana</small></div><div className="receipt-type">RECIBO DE PAGO <strong>{selectedReceipt.receipt}</strong></div><div className="receipt-line"><span>Recibí de:</span><b>{selectedReceipt.person}</b></div><div className="receipt-line"><span>Concepto:</span><b>{selectedReceipt.concept}</b></div><div className="receipt-line"><span>Fecha:</span><b>{formatDate(selectedReceipt.date)}</b></div><div className="receipt-total"><span>TOTAL PAGADO</span><strong>{money(selectedReceipt.amount)}</strong></div><div className="receipt-methods"><span>Efectivo {money(selectedReceipt.cash)}</span><span>QR {money(selectedReceipt.qr)}</span></div><div className="signature-row"><span>Firma del pagador</span><span>Firma administrador</span></div><div className="copy-mark">ORIGINAL <span>·</span> COPIA ADMINISTRACIÓN</div></div>
      <button className="outline-button full" onClick={() => window.print()}>Imprimir original y copia <span>↗</span></button>
    </div></div>}

    {showVoucher && selectedVoucher && <div className="modal-backdrop" onClick={() => setShowVoucher(false)}><div className="receipt-modal" onClick={(event) => event.stopPropagation()}>
      <div className="receipt-actions"><span>Vista previa del comprobante</span><button className="close-button" onClick={() => setShowVoucher(false)}>×</button></div>
      <div className="receipt-paper"><div className="receipt-brand">SEC-CAR<small>Seminario de Educación Cristiana</small></div><div className="receipt-type">COMPROBANTE DE EGRESO <strong>{selectedVoucher.voucher}</strong></div><div className="receipt-line"><span>Pagado a:</span><b>{selectedVoucher.recipient}</b></div><div className="receipt-line"><span>Concepto:</span><b>{selectedVoucher.concept}</b></div><div className="receipt-line"><span>Categoría:</span><b>{selectedVoucher.category}</b></div><div className="receipt-line"><span>Fecha:</span><b>{formatDate(selectedVoucher.date)}</b></div><div className="receipt-total"><span>TOTAL PAGADO</span><strong>{money(selectedVoucher.amount)}</strong></div><div className="receipt-methods"><span>Efectivo {money(selectedVoucher.cash)}</span><span>QR {money(selectedVoucher.qr)}</span></div><div className="signature-row"><span>Firma del beneficiario</span><span>Firma administrador</span></div><div className="copy-mark">ORIGINAL <span>·</span> COPIA ADMINISTRACIÓN</div></div>
      <button className="outline-button full" onClick={() => window.print()}>Imprimir original y copia <span>↗</span></button>
    </div></div>}
  </div>
}

export default App
