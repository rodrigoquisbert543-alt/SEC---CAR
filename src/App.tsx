import React, { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import './App.css'

// Permisos y tipos de cuenta
type AccountPermissions = { income: boolean; expenses: boolean; events: boolean; clients: boolean; users?: boolean }
type Account = { name: string; password: string; needsPassword: boolean; fullName: string; avatar?: string; enabled?: boolean; permissions?: AccountPermissions }

const defaultAccounts: Account[] = [
  { name: 'Melitza Huanca', password: '', needsPassword: true, fullName: '' },
  { name: 'Ovet Zúñiga', password: '', needsPassword: true, fullName: '', enabled: true, permissions: { income: true, expenses: true, events: true, clients: true, users: true } },
]
const accountsKey = 'sec-car-accounts'
const defaultPermissions: AccountPermissions = { income: true, expenses: true, events: false, clients: true, users: false }

const getPermissions = (account?: Account): AccountPermissions => ({ ...defaultPermissions, ...account?.permissions })
const isAccountEnabled = (account?: Account) => account?.enabled !== false
const adminResetKey = import.meta.env.VITE_ADMIN_RESET_KEY || 'SEC-CAR-ADMIN'
const legacyNameMap: Record<string, string> = { Melitza: 'Melitza Huanca', Ovet: 'Ovet Zúñiga' }
const migrateAccountName = (name: string): string => legacyNameMap[name] || name

function readAccounts(): Account[] {
  const stored = localStorage.getItem(accountsKey)
  const parsed = stored ? (JSON.parse(stored) as Account[]) : defaultAccounts
  const migrated = parsed.map((account) => ({
    ...account,
    name: migrateAccountName(account.name as unknown as string),
    fullName: account.fullName || '',
  }))
  defaultAccounts.forEach((account) => {
    if (!migrated.some((existing) => existing.name === account.name)) migrated.push(account)
  })
  return migrated
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function usePersistedState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : initial
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])
  return [state, setState] as const
}

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const formatDate = (iso: string) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return `${String(d.getDate()).padStart(2, '0')} ${monthNames[d.getMonth()]} ${d.getFullYear()}`
}
const todayISO = () => new Date().toISOString().slice(0, 10)
const dateInRange = (date: string, start: string, end: string) => (!start || date >= start) && (!end || date <= end)
const money = (value: number) => `Bs ${value.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`
const nextCode = (prefix: string, count: number) => `${prefix}-${String(count).padStart(5, '0')}`

type Payment = { id: string; receipt: string; person: string; carnet: string; phone: string; concept: string; date: string; amount: number; cash: number; qr: number; status: 'Aplicado' | 'Anulado'; issuedBy: Account['name'] }
type Expense = { id: string; voucher: string; concept: string; recipient: string; category: string; date: string; amount: number; cash: number; qr: number; status: 'Aplicado' | 'Anulado'; issuedBy: Account['name'] }
type Person = { id: string; name: string; carnet: string; phone: string; notes: string }

type PaymentStanding = 'completo' | 'mitad' | 'menos-mitad' | 'sin-precio'
const standingOf = (paid: number, price: number): PaymentStanding => {
  if (!price) return 'sin-precio'
  if (paid >= price) return 'completo'
  if (paid >= price / 2) return 'mitad'
  return 'menos-mitad'
}

const initialPayments: Payment[] = [
  { id: '1', receipt: 'REC-00241', person: 'Abigail Mendoza', carnet: '', phone: '', concept: 'Retiro de damas 2024', date: '2024-06-12', amount: 250, cash: 250, qr: 0, status: 'Aplicado', issuedBy: 'Melitza Huanca' },
  { id: '2', receipt: 'REC-00240', person: 'Samuel Chambi', carnet: '', phone: '', concept: 'Campamento juvenil', date: '2024-06-11', amount: 180, cash: 80, qr: 100, status: 'Aplicado', issuedBy: 'Ovet Zúñiga' },
  { id: '3', receipt: 'REC-00239', person: 'Jorge Valdez', carnet: '', phone: '', concept: 'Seminario de liderazgo', date: '2024-06-10', amount: 90, cash: 0, qr: 90, status: 'Aplicado', issuedBy: 'Ovet Zúñiga' },
  { id: '4', receipt: 'REC-00238', person: 'María Elena Ruiz', carnet: '', phone: '', concept: 'Retiro de damas 2024', date: '2024-06-08', amount: 120, cash: 120, qr: 0, status: 'Aplicado', issuedBy: 'Melitza Huanca' },
]

const initialExpenses: Expense[] = [
  { id: 'e1', voucher: 'EGR-00032', concept: 'Pago de electricidad', recipient: 'ENDE', category: 'Servicios básicos', date: '2024-06-09', amount: 145, cash: 145, qr: 0, status: 'Aplicado', issuedBy: 'Ovet Zúñiga' },
  { id: 'e2', voucher: 'EGR-00031', concept: 'Materiales para campamento', recipient: 'Ferretería Central', category: 'Materiales y suministros', date: '2024-06-07', amount: 210, cash: 60, qr: 150, status: 'Aplicado', issuedBy: 'Melitza Huanca' },
]

const initialEventOptions = ['Campamento juvenil', 'Seminario de liderazgo', 'Retiro de damas 2024']
const initialCategoryOptions = ['Servicios básicos', 'Mantenimiento', 'Materiales y suministros', 'Alimentación', 'Transporte', 'Honorarios', 'Otros']
const initialPeople: Person[] = []
const navItems = ['Resumen', 'Ingresos', 'Egresos', 'Eventos', 'Clientes', 'Usuarios'] as const
const eventManager: Account['name'] = 'Ovet Zúñiga'
const systemAdmin: Account['name'] = 'Ovet Zúñiga'

function AccessScreen({ onLogin }: { onLogin: (name: Account['name']) => void }) {
  const [accounts, setAccounts] = useState(readAccounts)
  const [selected, setSelected] = useState<Account['name']>('Melitza Huanca')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState('')
  const [mode, setMode] = useState<'login' | 'first' | 'recovery'>('login')
  const [message, setMessage] = useState('')

  const current = accounts.find((account) => account.name === selected) || accounts[0]
  const persist = (next: Account[]) => { setAccounts(next); localStorage.setItem(accountsKey, JSON.stringify(next)) }
  const chooseUser = (name: Account['name']) => { setSelected(name); setPassword(''); setConfirm(''); setFullName(''); setMessage(''); setMode('login') }

  const uploadAvatar = async (name: Account['name'], file: File | undefined) => {
    if (!file) return
    const dataUrl = await readFileAsDataURL(file)
    persist(accounts.map((account) => account.name === name ? { ...account, avatar: dataUrl } : account))
  }

  const submit = () => {
    if (!isAccountEnabled(current)) {
      setMessage('Esta cuenta está deshabilitada. Contacta al administrador.')
      return
    }
    if (mode === 'first') {
      if (!fullName.trim()) { setMessage('Escribe tu nombre y apellido; aparecerá en la firma de los comprobantes.'); return }
      if (password.length < 6 || password !== confirm) { setMessage('La contraseña debe tener 6 caracteres y coincidir en ambos campos.'); return }
      persist(accounts.map((account) => account.name === selected ? { ...account, password, needsPassword: false, fullName: fullName.trim() } : account))
      setMessage('Contraseña creada. Ya puedes ingresar a SEC-CAR.')
      setMode('login'); setPassword(''); setConfirm(''); setFullName(''); return
    }
    if (password && password === current.password && !current.needsPassword) { onLogin(selected); return }
    setMessage('La contraseña no coincide. Si la olvidaste, usa “Recuperar acceso”.')
  }

  const resetAccess = () => {
    if (password !== adminResetKey) { setMessage('Para restablecer accesos usa la clave administrativa definida por el responsable.'); return }
    persist(accounts.map((account) => account.name === selected ? { ...account, password: '', needsPassword: true } : account))
    setPassword(''); setMessage(`Acceso de ${selected} reiniciado. Deberá crear una contraseña nueva al ingresar.`); setMode('login')
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="brand-mark"><img src="/logo-seccar.png" alt="SEC-CAR" /></div>
          <div><strong>SEC-CAR</strong><span>Seminario de Educación Cristiana Caranavi</span></div>
        </div>
        <div className="auth-copy">
          <span className="eyebrow">ACCESO PRIVADO</span>
          <h1>{mode === 'recovery' ? 'Recuperar acceso' : mode === 'first' ? 'Crea tu contraseña' : 'Bienvenido de nuevo'}</h1>
          <p>{mode === 'recovery' ? 'El responsable puede reiniciar el acceso de una de las cuentas autorizadas.' : mode === 'first' ? `Es la primera vez que ingresa ${selected}. Define una contraseña personal para continuar.` : 'Ingresa con tu cuenta para registrar y consultar los movimientos del centro.'}</p>
        </div>
        {mode !== 'recovery' && (
          <>
            <div className="user-picker">
              <span>¿Quién eres?</span>
              <div>
                {accounts.filter(isAccountEnabled).map((account) => (
                  <div key={account.name} role="button" tabIndex={0} className={selected === account.name ? 'user-choice selected' : 'user-choice'} onClick={() => chooseUser(account.name)}>
                    <label className="auth-avatar avatar-upload" title="Subir mi foto de perfil" onClick={(event) => event.stopPropagation()}>
                      {account.avatar ? <img src={account.avatar} alt={account.name} /> : account.name[0]}
                      <input type="file" accept="image/*" onChange={(event) => uploadAvatar(account.name, event.target.files?.[0])} />
                    </label>
                    <span><strong>{account.name}</strong><small>{account.needsPassword ? 'Primer ingreso' : 'Cuenta activa'}</small></span>
                    {selected === account.name && <b>✓</b>}
                  </div>
                ))}
              </div>
            </div>
            {mode === 'first' && <label className="auth-label">Nombre y apellido<input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ej. Melitza Huanca" /></label>}
            <label className="auth-label">{mode === 'first' ? 'Nueva contraseña' : 'Contraseña'}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" /></label>
            {mode === 'first' && <label className="auth-label">Confirmar contraseña<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repite tu contraseña" /></label>}
            <button className="auth-submit" onClick={() => current.needsPassword && mode === 'login' ? setMode('first') : submit()}>
              {current.needsPassword && mode === 'login' ? 'Crear mi contraseña' : mode === 'first' ? 'Guardar contraseña' : 'Ingresar al sistema'} <span>→</span>
            </button>
            <button className="auth-link" onClick={() => { setMode('recovery'); setPassword(''); setMessage('') }}>Olvidé mi contraseña</button>
          </>
        )}
        {mode === 'recovery' && (
          <>
            <div className="recovery-card">
              <p>Selecciona la cuenta que necesita volver a configurarse.</p>
              <div className="recovery-users">
                {accounts.map((account) => (
                  <button key={account.name} className={selected === account.name ? 'selected' : ''} onClick={() => setSelected(account.name)}>
                    {account.name}<span>{selected === account.name ? 'Seleccionada' : 'Seleccionar'}</span>
                  </button>
                ))}
              </div>
              <label className="auth-label">Clave administrativa<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="La define el responsable" /></label>
              <button className="auth-submit" onClick={resetAccess}>Reiniciar acceso de {selected} <span>↻</span></button>
            </div>
            <button className="auth-link" onClick={() => { setMode('login'); setPassword(''); setMessage('') }}>Volver al ingreso</button>
          </>
        )}
        {message && <div className="auth-message">{message}</div>}
        <div className="auth-footer"><span className="sync-dot"></span> Sistema listo para sincronizar</div>
        <p className="auth-verse">"Todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres" — Colosenses 3:23<br />"Se requiere que el administrador, sea hallado fiel" — 1 Corintios 4:2</p>
      </div>
      <div className="auth-visual">
        <div className="visual-note"><span>CONTROL FINANCIERO</span><strong>Recibos claros.<br />Cuentas en orden.</strong><p>Ingresos, egresos y pagos parciales en un solo lugar.</p></div>
        <div className="visual-receipt"><small>SEC-CAR · RECIBO DE PAGO</small><strong>Bs 250.00</strong><span>ORIGINAL + COPIA ADMINISTRACIÓN</span></div>
      </div>
    </div>
  )
}

export default function App() {
  const [loggedUser, setLoggedUser] = useState<Account['name'] | null>(null)
  const [activePage, setActivePage] = useState<string>('Resumen')

  const [payments, setPayments] = usePersistedState<Payment[]>('sec-car-payments', initialPayments)
  const [expenses, setExpenses] = usePersistedState<Expense[]>('sec-car-expenses', initialExpenses)
  const [eventOptions, setEventOptions] = usePersistedState<string[]>('sec-car-events', initialEventOptions)
  const [categoryOptions, setCategoryOptions] = usePersistedState<string[]>('sec-car-categories', initialCategoryOptions)
  const [people, setPeople] = usePersistedState<Person[]>('sec-car-people', initialPeople)
  const [eventPrices, setEventPrices] = usePersistedState<Record<string, number>>('sec-car-event-prices', {})
  const [accounts, setAccounts] = usePersistedState<Account[]>(accountsKey, defaultAccounts)
  const [fullNameDraft, setFullNameDraft] = useState('')
  const [theme, setTheme] = usePersistedState<'light' | 'dark'>('sec-car-theme', 'light')

  const [filterStartDate, setFilterStartDate] = usePersistedState('sec-car-filter-start', '')
  const [filterEndDate, setFilterEndDate] = usePersistedState('sec-car-filter-end', '')

  const [query, setQuery] = useState('')
  const [expenseQuery, setExpenseQuery] = useState('')
  const [newEventName, setNewEventName] = useState('')
  const [peopleQuery, setPeopleQuery] = useState('')

  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showVoucher, setShowVoucher] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null)
  const [selectedVoucher, setSelectedVoucher] = useState<Expense | null>(null)

  const [incomeForm, setIncomeForm] = useState({ person: '', carnet: '', phone: '', concept: '', cash: '', qr: '' })
  const [expenseForm, setExpenseForm] = useState({ concept: '', recipient: '', category: '', cash: '', qr: '' })
  const [personForm, setPersonForm] = useState({ name: '', carnet: '', phone: '', notes: '' })
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [personEditForm, setPersonEditForm] = useState({ name: '', carnet: '', phone: '', notes: '' })
  const [personMessage, setPersonMessage] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Person | null>(null)
  const [confirmClear, setConfirmClear] = useState('')

  const receiptPaperRef = useRef<HTMLDivElement | null>(null)
  const voucherPaperRef = useRef<HTMLDivElement | null>(null)
  const [sharingReceipt, setSharingReceipt] = useState(false)

  // Administración de usuarios
  const [newUserForm, setNewUserForm] = useState({ name: '', fullName: '', password: '' })
  const [userMessage, setUserMessage] = useState('')

  useEffect(() => {
    if (loggedUser) {
      setFullNameDraft(accounts.find((account) => account.name === loggedUser)?.fullName || '')
    }
  }, [loggedUser, accounts])

  useEffect(() => {
    setAccounts((prev) => prev.map((account) => ({ ...account, name: migrateAccountName(account.name as unknown as string) })))
    setPayments((prev) => prev.map((payment) => payment.issuedBy ? { ...payment, issuedBy: migrateAccountName(payment.issuedBy as unknown as string) } : payment))
    setExpenses((prev) => prev.map((expense) => expense.issuedBy ? { ...expense, issuedBy: migrateAccountName(expense.issuedBy as unknown as string) } : expense))
  }, [])

  const accountFullName = (accountName: string) => {
    const acc = accounts.find((a) => a.name === accountName)
    return acc?.fullName || accountName
  }

  const userPermissions = useMemo(() => {
    const acc = accounts.find((a) => a.name === loggedUser)
    return getPermissions(acc)
  }, [accounts, loggedUser])

  const shareAsImage = async (node: HTMLDivElement | null, fileName: string, caption: string) => {
    if (!node) return
    setSharingReceipt(true)
    try {
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' })
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
      if (!blob) return
      const file = new File([blob], fileName, { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean; share?: (data: ShareData) => Promise<void> }
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: caption, text: caption })
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url; link.download = fileName; link.click()
        URL.revokeObjectURL(url)
        window.open(`https://wa.me/?text=${encodeURIComponent(`${caption} (imagen descargada, adjúntala en WhatsApp)`)}`, '_blank')
      }
    } finally {
      setSharingReceipt(false)
    }
  }

  const renderReceiptCopy = (payment: Payment, copy: 'cliente' | 'administración', ref?: React.RefObject<HTMLDivElement | null>) => (
    <div className="receipt-paper" ref={ref}>
      <div className="receipt-brand"><img src="/logo-seccar.png" alt="SEC-CAR" className="receipt-logo" />SEC-CAR<small>Seminario de Educación Cristiana Caranavi</small></div>
      <div className="receipt-type">RECIBO DE PAGO <strong>{payment.receipt}</strong></div>
      <div className="receipt-line"><span>Recibí de:</span><b>{payment.person}</b></div>
      {payment.carnet && <div className="receipt-line"><span>N.º de carnet:</span><b>{payment.carnet}</b></div>}
      {payment.phone && <div className="receipt-line"><span>N.º de celular:</span><b>{payment.phone}</b></div>}
      <div className="receipt-line"><span>Concepto:</span><b>{payment.concept}</b></div>
      <div className="receipt-line"><span>Fecha:</span><b>{formatDate(payment.date)}</b></div>
      <div className="receipt-total"><span>TOTAL PAGADO</span><strong>{money(payment.amount)}</strong></div>
      <div className="receipt-methods"><span>Efectivo {money(payment.cash)}</span><span>QR {money(payment.qr)}</span></div>
      <div className="signature-row">{copy === 'administración' && <div className="signature-col"><span className="signature-name">{payment.person}</span><span className="signature-role">INTERESADO</span></div>}<div className="signature-col"><span className="signature-name">{accountFullName(payment.issuedBy)}</span><span className="signature-role">ADMINISTRADOR</span></div></div>
      <div className="copy-mark">{copy === 'cliente' ? 'ORIGINAL' : 'COPIA'} <span>·</span> PARA {copy.toUpperCase()}</div>
    </div>
  )

  const renderVoucherCopy = (expense: Expense, copy: 'beneficiario' | 'administración', ref?: React.RefObject<HTMLDivElement | null>) => (
    <div className="receipt-paper" ref={ref}>
      <div className="receipt-brand"><img src="/logo-seccar.png" alt="SEC-CAR" className="receipt-logo" />SEC-CAR<small>Seminario de Educación Cristiana Caranavi</small></div>
      <div className="receipt-type">COMPROBANTE DE EGRESO <strong>{expense.voucher}</strong></div>
      <div className="receipt-line"><span>Pagado a:</span><b>{expense.recipient}</b></div>
      <div className="receipt-line"><span>Concepto:</span><b>{expense.concept}</b></div>
      <div className="receipt-line"><span>Categoría:</span><b>{expense.category}</b></div>
      <div className="receipt-line"><span>Fecha:</span><b>{formatDate(expense.date)}</b></div>
      <div className="receipt-total"><span>TOTAL PAGADO</span><strong>{money(expense.amount)}</strong></div>
      <div className="receipt-methods"><span>Efectivo {money(expense.cash)}</span><span>QR {money(expense.qr)}</span></div>
      <div className="signature-row">{copy === 'administración' && <div className="signature-col"><span className="signature-name">{expense.recipient}</span><span className="signature-role">INTERESADO</span></div>}<div className="signature-col"><span className="signature-name">{accountFullName(expense.issuedBy)}</span><span className="signature-role">ADMINISTRADOR</span></div></div>
      <div className="copy-mark">{copy === 'beneficiario' ? 'ORIGINAL' : 'COPIA'} <span>·</span> PARA {copy.toUpperCase()}</div>
    </div>
  )

  const hasDateFilter = Boolean(filterStartDate || filterEndDate)
  const rangePayments = useMemo(() => payments.filter((p) => dateInRange(p.date, filterStartDate, filterEndDate)), [payments, filterStartDate, filterEndDate])
  const rangeExpenses = useMemo(() => expenses.filter((e) => dateInRange(e.date, filterStartDate, filterEndDate)), [expenses, filterStartDate, filterEndDate])
  const rangeIncomeTotal = rangePayments.filter((p) => p.status === 'Aplicado').reduce((sum, p) => sum + p.amount, 0)
  const rangeExpenseTotal = rangeExpenses.filter((e) => e.status === 'Aplicado').reduce((sum, e) => sum + e.amount, 0)

  const filteredPayments = useMemo(() => rangePayments.filter((p) => `${p.person} ${p.concept} ${p.receipt} ${p.carnet} ${p.phone}`.toLowerCase().includes(query.toLowerCase())), [rangePayments, query])
  const filteredExpenses = useMemo(() => rangeExpenses.filter((e) => `${e.recipient} ${e.concept} ${e.category} ${e.voucher}`.toLowerCase().includes(expenseQuery.toLowerCase())), [rangeExpenses, expenseQuery])

  const activeIncome = payments.filter((p) => p.status === 'Aplicado')
  const activeExpenses = expenses.filter((e) => e.status === 'Aplicado')
  const totalIncome = activeIncome.reduce((sum, p) => sum + p.amount, 0)
  const totalExpense = activeExpenses.reduce((sum, e) => sum + e.amount, 0)
  const balance = totalIncome - totalExpense

  const thisMonth = todayISO().slice(0, 7)
  const incomeThisMonth = activeIncome.filter((p) => p.date.slice(0, 7) === thisMonth).reduce((sum, p) => sum + p.amount, 0)
  const expenseThisMonth = activeExpenses.filter((e) => e.date.slice(0, 7) === thisMonth).reduce((sum, e) => sum + e.amount, 0)

  const movements = useMemo(() => {
    const incomes = payments.map((p) => ({ id: p.id, type: 'Ingreso' as const, code: p.receipt, label: p.person, concept: p.concept, date: p.date, amount: p.amount, status: p.status }))
    const outs = expenses.map((e) => ({ id: e.id, type: 'Egreso' as const, code: e.voucher, label: e.recipient, concept: e.concept, date: e.date, amount: e.amount, status: e.status }))
    return [...incomes, ...outs].filter((m) => dateInRange(m.date, filterStartDate, filterEndDate)).sort((a, b) => b.date.localeCompare(a.date))
  }, [payments, expenses, filterStartDate, filterEndDate])

  const payersOfEvent = (eventName: string) => {
    const related = activeIncome.filter((p) => p.concept === eventName)
    const byPerson = new Map<string, { person: string; carnet: string; phone: string; paid: number; count: number }>()
    related.forEach((p) => {
      const key = p.person.toLowerCase()
      const entry = byPerson.get(key) || { person: p.person, carnet: p.carnet, phone: p.phone, paid: 0, count: 0 }
      entry.paid += p.amount; entry.count += 1
      if (p.carnet) entry.carnet = p.carnet
      if (p.phone) entry.phone = p.phone
      byPerson.set(key, entry)
    })
    return Array.from(byPerson.values())
  }

  const eventStats = eventOptions.map((name) => {
    const related = payments.filter((p) => p.concept === name)
    const price = eventPrices[name] || 0
    const payers = payersOfEvent(name)
    const completo = payers.filter((entry) => standingOf(entry.paid, price) === 'completo').length
    const mitad = payers.filter((entry) => standingOf(entry.paid, price) === 'mitad').length
    const menosMitad = payers.filter((entry) => standingOf(entry.paid, price) === 'menos-mitad').length
    return { name, count: related.length, total: related.reduce((sum, p) => sum + p.amount, 0), price, payers, completo, mitad, menosMitad }
  })

  const peopleWithTotals = people.map((person) => {
    const related = payments.filter((p) => p.person.toLowerCase() === person.name.toLowerCase() && p.status === 'Aplicado')
    const total = related.reduce((sum, p) => sum + p.amount, 0)
    const events = Array.from(new Set(related.map((p) => p.concept))).map((eventName) => {
      const paid = related.filter((p) => p.concept === eventName).reduce((sum, p) => sum + p.amount, 0)
      const price = eventPrices[eventName] || 0
      return { event: eventName, paid, price, remaining: Math.max(price - paid, 0), standing: standingOf(paid, price) }
    })
    const totalDue = events.reduce((sum, ev) => sum + ev.remaining, 0)
    return { ...person, total, count: related.length, events, totalDue, receipts: related }
  })

  const filteredPeople = useMemo(() => peopleWithTotals.filter((person) => `${person.name} ${person.carnet} ${person.phone}`.toLowerCase().includes(peopleQuery.toLowerCase())), [peopleWithTotals, peopleQuery])
  const pendingDeleteRecord = pendingDelete ? peopleWithTotals.find((person) => person.id === pendingDelete.id) : null

  const findPersonMatch = (term: string) => {
    const clean = term.trim().toLowerCase()
    if (!clean) return null
    return peopleWithTotals.find((person) => person.name.toLowerCase() === clean || (person.carnet && person.carnet.toLowerCase() === clean) || (person.phone && person.phone.toLowerCase() === clean)) || null
  }

  const fillIncomeField = (field: 'person' | 'carnet' | 'phone', value: string) => {
    const match = findPersonMatch(value)
    setIncomeForm((prev) => {
      if (!match) return { ...prev, [field]: value }
      return { ...prev, person: match.name, carnet: match.carnet || prev.carnet, phone: match.phone || prev.phone, [field]: value }
    })
  }

  const saveIncome = () => {
    const cash = Number(incomeForm.cash) || 0
    const qr = Number(incomeForm.qr) || 0
    if (!incomeForm.person.trim() || !incomeForm.concept.trim() || (!cash && !qr)) return
    const concept = incomeForm.concept.trim()
    const personName = incomeForm.person.trim()
    const carnet = incomeForm.carnet.trim()
    const phone = incomeForm.phone.trim()
    const next: Payment = { id: crypto.randomUUID(), receipt: nextCode('REC', 242 + payments.length), person: personName, carnet, phone, concept, date: todayISO(), amount: cash + qr, cash, qr, status: 'Aplicado', issuedBy: loggedUser! }
    setPayments([next, ...payments])
    if (loggedUser === eventManager && !eventOptions.includes(concept)) setEventOptions([...eventOptions, concept])
    const existing = people.find((person) => person.name.toLowerCase() === personName.toLowerCase())
    if (!existing) setPeople([...people, { id: crypto.randomUUID(), name: personName, carnet, phone, notes: '' }])
    else setPeople(people.map((person) => person.id === existing.id ? { ...person, carnet: carnet && !person.carnet ? carnet : person.carnet, phone: phone && !person.phone ? phone : person.phone } : person))
    setSelectedReceipt(next); setShowIncomeModal(false); setShowReceipt(true)
    setIncomeForm({ person: '', carnet: '', phone: '', concept: '', cash: '', qr: '' })
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

  // Anulación y reactivación
  const toggleIncomeStatus = (id: string) => {
    setPayments((prev) =>
      prev.map((payment) =>
        payment.id === id ? { ...payment, status: payment.status === 'Aplicado' ? 'Anulado' : 'Aplicado' } : payment
      )
    )
  }

  const toggleExpenseStatus = (id: string) => {
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id ? { ...expense, status: expense.status === 'Aplicado' ? 'Anulado' : 'Aplicado' } : expense
      )
    )
  }

  // Administración de usuarios
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserForm.name.trim()) {
      setUserMessage('El nombre de usuario es obligatorio.')
      return
    }
    if (accounts.some((a) => a.name.toLowerCase() === newUserForm.name.trim().toLowerCase())) {
      setUserMessage('Ya existe una cuenta con ese nombre.')
      return
    }
    const created: Account = {
      name: newUserForm.name.trim(),
      fullName: newUserForm.fullName.trim(),
      password: newUserForm.password,
      needsPassword: !newUserForm.password,
      enabled: true,
      permissions: { ...defaultPermissions },
    }
    setAccounts([...accounts, created])
    setNewUserForm({ name: '', fullName: '', password: '' })
    setUserMessage('Usuario creado exitosamente.')
  }

  const toggleAccountEnabled = (name: string) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.name === name ? { ...acc, enabled: !isAccountEnabled(acc) } : acc))
    )
  }

  const updateAccountPassword = (name: string, newPass: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.name === name ? { ...acc, password: newPass, needsPassword: !newPass } : acc
      )
    )
    setUserMessage(`Contraseña actualizada para ${name}`)
  }

  const saveFullName = () => {
    if (!loggedUser) return
    setAccounts((prev) =>
      prev.map((acc) => (acc.name === loggedUser ? { ...acc, fullName: fullNameDraft.trim() } : acc))
    )
  }

  const clearAllData = () => {
    if (confirmClear !== 'BORRAR Y REINICIAR') return
    setPayments([])
    setExpenses([])
    setPeople([])
    setEventPrices({})
    setConfirmClear('')
  }

  if (!loggedUser) {
    return <AccessScreen onLogin={(user) => setLoggedUser(user)} />
  }

  return (
    <div className={`app-shell ${theme}`}>
      <header className="app-header">
        <div className="header-brand">
          <img src="/logo-seccar.png" alt="SEC-CAR" />
          <div>
            <strong>SEC-CAR</strong>
            <span>Seminario de Educación Cristiana Caranavi</span>
          </div>
        </div>
        <nav className="header-nav">
          {navItems.map((page) => {
            if (page === 'Usuarios' && loggedUser !== systemAdmin) return null
            return (
              <button key={page} className={activePage === page ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage(page)}>
                {page}
              </button>
            )
          })}
        </nav>
        <div className="header-user">
          <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <span>{loggedUser}</span>
          <button className="logout-btn" onClick={() => setLoggedUser(null)}>Salir</button>
        </div>
      </header>

      {/* Rango de fechas */}
      <section className="filter-bar">
        <div className="filter-group">
          <label>Desde: <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} /></label>
          <label>Hasta: <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} /></label>
          {hasDateFilter && (
            <button className="btn-clear-date" onClick={() => { setFilterStartDate(''); setFilterEndDate('') }}>
              Limpiar filtro de fechas
            </button>
          )}
        </div>
        {hasDateFilter && (
          <div className="filter-summary">
            Filtrado: Ingresos {money(rangeIncomeTotal)} | Egresos {money(rangeExpenseTotal)} | Neto {money(rangeIncomeTotal - rangeExpenseTotal)}
          </div>
        )}
      </section>

      <main className="app-content">
        {/* PÁGINA RESUMEN */}
        {activePage === 'Resumen' && (
          <div className="page-grid">
            <div className="card-stat"><h3>Ingresos del mes</h3><strong>{money(incomeThisMonth)}</strong></div>
            <div className="card-stat"><h3>Egresos del mes</h3><strong>{money(expenseThisMonth)}</strong></div>
            <div className="card-stat"><h3>Caja Total</h3><strong>{money(balance)}</strong></div>
            
            <div className="full-width-card">
              <h3>Movimientos Recientes</h3>
              <table className="data-table">
                <thead>
                  <tr><th>Código</th><th>Fecha</th><th>Tipo</th><th>Persona / Proveedor</th><th>Concepto</th><th>Monto</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {movements.slice(0, 10).map((m) => (
                    <tr key={m.id} className={m.status === 'Anulado' ? 'voided-row' : ''}>
                      <td>{m.code}</td><td>{formatDate(m.date)}</td>
                      <td><span className={`badge ${m.type.toLowerCase()}`}>{m.type}</span></td>
                      <td>{m.label}</td><td>{m.concept}</td><td>{money(m.amount)}</td>
                      <td>{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PÁGINA INGRESOS */}
        {activePage === 'Ingresos' && (
          <div>
            <div className="action-bar">
              <input type="text" placeholder="Buscar por cliente, recibo o concepto..." value={query} onChange={(e) => setQuery(e.target.value)} />
              {userPermissions.income && <button className="btn-primary" onClick={() => setShowIncomeModal(true)}>+ Nuevo Ingreso</button>}
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Recibo</th><th>Fecha</th><th>Cliente</th><th>Carnet</th><th>Teléfono</th><th>Concepto</th><th>Monto</th><th>Registrado por</th><th>Acción</th></tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} className={p.status === 'Anulado' ? 'voided-row' : ''}>
                    <td>{p.receipt}</td><td>{formatDate(p.date)}</td><td>{p.person}</td><td>{p.carnet || '-'}</td><td>{p.phone || '-'}</td>
                    <td>{p.concept}</td><td>{money(p.amount)}</td><td>{accountFullName(p.issuedBy)}</td>
                    <td>
                      <button onClick={() => { setSelectedReceipt(p); setShowReceipt(true) }}>Ver Recibo</button>
                      <button onClick={() => toggleIncomeStatus(p.id)}>{p.status === 'Aplicado' ? 'Anular' : 'Reactivar'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PÁGINA EGRESOS */}
        {activePage === 'Egresos' && (
          <div>
            <div className="action-bar">
              <input type="text" placeholder="Buscar por beneficiario, comprobante o concepto..." value={expenseQuery} onChange={(e) => setExpenseQuery(e.target.value)} />
              {userPermissions.expenses && <button className="btn-primary" onClick={() => setShowExpenseModal(true)}>+ Nuevo Egreso</button>}
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Comprobante</th><th>Fecha</th><th>Pagado a</th><th>Concepto</th><th>Categoría</th><th>Monto</th><th>Registrado por</th><th>Acción</th></tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className={e.status === 'Anulado' ? 'voided-row' : ''}>
                    <td>{e.voucher}</td><td>{formatDate(e.date)}</td><td>{e.recipient}</td><td>{e.concept}</td><td>{e.category}</td><td>{money(e.amount)}</td><td>{accountFullName(e.issuedBy)}</td>
                    <td>
                      <button onClick={() => { setSelectedVoucher(e); setShowVoucher(true) }}>Ver Comprobante</button>
                      <button onClick={() => toggleExpenseStatus(e.id)}>{e.status === 'Aplicado' ? 'Anular' : 'Reactivar'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PÁGINA EVENTOS */}
        {activePage === 'Eventos' && (
          <div>
            {loggedUser === eventManager && (
              <div className="add-event-box">
                <input type="text" placeholder="Nuevo evento..." value={newEventName} onChange={(e) => setNewEventName(e.target.value)} />
                <button onClick={() => { if (newEventName.trim() && !eventOptions.includes(newEventName.trim())) { setEventOptions([...eventOptions, newEventName.trim()]); setNewEventName('') } }}>
                  Agregar Evento
                </button>
              </div>
            )}
            <div className="events-grid">
              {eventStats.map((ev) => (
                <div key={ev.name} className="event-card">
                  <h3>{ev.name}</h3>
                  <p><strong>Total Recaudado:</strong> {money(ev.total)}</p>
                  <p><strong>Pagos registrados:</strong> {ev.count}</p>
                  {loggedUser === eventManager && (
                    <label>
                      Precio del evento: Bs
                      <input type="number" value={ev.price || ''} onChange={(e) => setEventPrices({ ...eventPrices, [ev.name]: Number(e.target.value) })} />
                    </label>
                  )}
                  <h4>Inscritos / Pagadores</h4>
                  <ul>
                    {ev.payers.map((p) => (
                      <li key={p.person}>{p.person}: {money(p.paid)} ({p.count} pagos)</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PÁGINA CLIENTES */}
        {activePage === 'Clientes' && (
          <div>
            <input type="text" placeholder="Buscar cliente por nombre, CI o teléfono..." value={peopleQuery} onChange={(e) => setPeopleQuery(e.target.value)} />
            <table className="data-table">
              <thead>
                <tr><th>Nombre</th><th>Carnet</th><th>Teléfono</th><th>Pagado Total</th><th>Pagos Registrados</th><th>Saldo Pendiente</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {filteredPeople.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td><td>{p.carnet || '-'}</td><td>{p.phone || '-'}</td><td>{money(p.total)}</td><td>{p.count}</td><td>{money(p.totalDue)}</td>
                    <td>
                      <button onClick={() => { setPendingDelete(p) }}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PÁGINA USUARIOS (Solo visible para Ovet Zúñiga) */}
        {activePage === 'Usuarios' && loggedUser === systemAdmin && (
          <div className="users-panel">
            <h2>Administración de Usuarios y Permisos</h2>
            
            {/* Formulario para cambiar firma del usuario actual */}
            <div className="user-section">
              <h3>Tu Firma para Comprobantes</h3>
              <div className="form-inline">
                <input type="text" placeholder="Nombre completo para firma" value={fullNameDraft} onChange={(e) => setFullNameDraft(e.target.value)} />
                <button onClick={saveFullName}>Actualizar Mi Nombre</button>
              </div>
            </div>

            {/* Crear nuevo usuario */}
            <div className="user-section">
              <h3>Crear Nuevo Usuario</h3>
              <form onSubmit={handleCreateUser} className="form-grid">
                <input type="text" placeholder="Nombre de usuario" value={newUserForm.name} onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })} required />
                <input type="text" placeholder="Nombre completo (Firma)" value={newUserForm.fullName} onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })} />
                <input type="password" placeholder="Contraseña inicial" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} />
                <button type="submit" className="btn-primary">Crear Cuenta</button>
              </form>
              {userMessage && <p className="info-msg">{userMessage}</p>}
            </div>

            {/* Lista de usuarios */}
            <div className="user-section">
              <h3>Cuentas Registradas</h3>
              <table className="data-table">
                <thead>
                  <tr><th>Usuario</th><th>Nombre Completo (Firma)</th><th>Estado</th><th>Contraseña</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.name}>
                      <td>{acc.name}</td>
                      <td>{acc.fullName || '-'}</td>
                      <td>
                        {acc.enabled ? 'Activo' : 'Inactivo'}
                        <button onClick={() => toggleUserEnabled(acc.name)} className="btn-status">
                          {acc.enabled ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                      <td>******</td> {/* Placeholder for password */}
                      <td>
                        <button onClick={() => handleEditUser(acc)}>Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Formulario para editar usuario (inicialmente oculto) */}
            {editingUser && (
              <div className="user-section">
                <h3>Editar Usuario: {editingUser.name}</h3>
                <form onSubmit={handleUpdateUser} className="form-grid">
                  <input type="text" placeholder="Nombre de usuario" value={editingUser.name} readOnly />
                  <input type="text" placeholder="Nombre completo (Firma)" value={editUserForm.fullName} onChange={(e) => setEditUserForm({ ...editUserForm, fullName: e.target.value })} required />
                  <input type="password" placeholder="Nueva Contraseña" value={editUserForm.password} onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })} />
                  <button type="submit" className="btn-primary">Actualizar Usuario</button>
                  <button type="button" onClick={() => setEditingUser(null)}>Cancelar Edición</button>
                </form>
              </div>
            )}

            {/* Sección de Permisos para cada Usuario */}
            <div className="user-section">
              <h3>Gestión de Permisos</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Permisos</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.name}>
                      <td>{acc.name}</td>
                      <td>
                        <label><input type="checkbox" checked={acc.permissions?.income} onChange={(e) => handlePermissionChange(acc.name, 'income', e.target.checked)} /> Ingresos</label>
                        <label><input type="checkbox" checked={acc.permissions?.expenses} onChange={(e) => handlePermissionChange(acc.name, 'expenses', e.target.checked)} /> Egresos</label>
                        <label><input type="checkbox" checked={acc.permissions?.events} onChange={(e) => handlePermissionChange(acc.name, 'events', e.target.checked)} /> Eventos</label>
                        <label><input type="checkbox" checked={acc.permissions?.clients} onChange={(e) => handlePermissionChange(acc.name, 'clients', e.target.checked)} /> Clientes</label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

            {/* Sección de Permisos para cada Usuario */}
            <div className="user-section">
              <h3>Gestión de Permisos</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Nombre Completo</th>
                    <th>Estado</th>
                    <th>Permisos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.name}>
                      <td>{acc.name}</td>
                      <td>{acc.fullName || '-'}</td>
                      <td>{acc.enabled ? 'Activo' : 'Inactivo'}</td>
                      <td>
                        <label><input type="checkbox" checked={acc.permissions?.income} onChange={(e) => handlePermissionChange(acc.name, 'income', e.target.checked)} /> Ingresos</label>
                        <label><input type="checkbox" checked={acc.permissions?.expenses} onChange={(e) => handlePermissionChange(acc.name, 'expenses', e.target.checked)} /> Egresos</label>
                        <label><input type="checkbox" checked={acc.permissions?.events} onChange={(e) => handlePermissionChange(acc.name, 'events', e.target.checked)} /> Eventos</label>
                        <label><input type="checkbox" checked={acc.permissions?.clients} onChange={(e) => handlePermissionChange(acc.name, 'clients', e.target.checked)} /> Clientes</label>
                      </td>
                      <td>
                        <button onClick={() => handleEditUser(acc)}>Editar</button>
                        <button onClick={() => toggleUserEnabled(acc.name)} className="btn-status">
                          {acc.enabled ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

                  <button type="submit" className="btn-primary">Actualizar Usuario</button>
                  <button type="button" onClick={() => setEditingUser(null)}>Cancelar Edición</button>
                </form>
              </div>
            )}
          </div>
        )}



export default App

// --- Funciones de utilidad y estado ---
// Asegúrate de que estas definiciones estén accesibles dentro del componente App,
// ya sea directamente o a través de props/contexto.

const persist = (newAccounts: Account[]) => {
  localStorage.setItem(accountsKey, JSON.stringify(newAccounts));
};

// Asumiendo que systemAdmin está definido, por ejemplo:
// const systemAdmin = 'Ovet Zúñiga';

// Las siguientes funciones y estados deberían ser definidos dentro del componente App:
/*
  const [accounts, setAccounts] = usePersistedState<Account[]>(accountsKey, defaultAccounts);
  const [selected, setSelected] = useState<Account['name'] | null>(null);
  const [password, setPassword] = useState('');
  const [fullNameDraft, setFullNameDraft] = useState('');
  const [newUserForm, setNewUserForm] = useState({ name: '', fullName: '', password: '' });
  const [userMessage, setUserMessage] = useState('');
  const [activePage, setActivePage] = useState('Ingresos');
  const [peopleQuery, setPeopleQuery] = useState('');
  const [expenseQuery, setExpenseQuery] = useState('');
  const [query, setQuery] = useState('');
  const [editingUser, setEditingUser] = useState<Account | null>(null);
  const [editUserForm, setEditUserForm] = useState({ fullName: '', password: '' });
  const systemAdmin = 'Ovet Zúñiga'; // Definir el administrador principal

  const toggleUserEnabled = (userName: Account['name']) => {
    const newAccounts = accounts.map(acc =>
      acc.name === userName ? { ...acc, enabled: !acc.enabled } : acc
    );
    setAccounts(newAccounts);
    persist(newAccounts);
  };

  const handleEditUser = (acc: Account) => {
    setEditingUser(acc);
    setEditUserForm({ fullName: acc.fullName || '', password: '' });
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    let newAccounts = accounts.map(acc =>
      acc.name === editingUser.name ? { ...acc, fullName: editUserForm.fullName } : acc
    );

    if (editUserForm.password) {
      newAccounts = newAccounts.map(acc =>
        acc.name === editingUser.name ? { ...acc, password: editUserForm.password } : acc
      );
    }

    setAccounts(newAccounts);
    persist(newAccounts);
    setEditingUser(null);

  const handlePermissionChange = (userName: Account['name'], permission: keyof AccountPermissions, isChecked: boolean) => {
    const newAccounts = accounts.map(acc => {
      if (acc.name === userName) {
        const currentPermissions = acc.permissions || { ...defaultPermissions, users: false };
        return {
          ...acc,
          permissions: {
            ...currentPermissions,
            [permission]: isChecked,
          },
        };
      }
      return acc;
    });
    setAccounts(newAccounts);
    persist(newAccounts);
  };

    setUserMessage('Usuario actualizado exitosamente.');
  };
*/

                      <td>{acc.fullName || '-'}</td>
                      <td>
                        <span className={isAccountEnabled(acc) ? 'badge applied' : 'badge voided'}>
                          {isAccountEnabled(acc) ? 'Habilitado' : 'Deshabilitado'}
                        </span>
                      </td>
                      <td>{acc.needsPassword ? 'Sin contraseña' : 'Configurada'}</td>
                      <td>
                        {acc.name !== systemAdmin && (
                          <button onClick={() => toggleAccountEnabled(acc.name)}>
                            {isAccountEnabled(acc) ? 'Deshabilitar' : 'Habilitar'}
                          </button>
                        )}
                        <button onClick={() => {
                          const p = prompt(`Nueva contraseña para ${acc.name}:`)
                          if (p !== null) updateAccountPassword(acc.name, p)
                        }}>
                          Cambiar Clave
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Zona de peligro: Reset completo */}
            <div className="user-section danger-zone">
              <h3>Mantenimiento de Base de Datos</h3>
              <p>Escribe <strong>BORRAR Y REINICIAR</strong> para vaciar todos los ingresos, egresos y clientes registrados:</p>
              <input type="text" value={confirmClear} onChange={(e) => setConfirmClear(e.target.value)} placeholder="Escribe exactamente aquí..." />
              <button className="btn-danger" disabled={confirmClear !== 'BORRAR Y REINICIAR'} onClick={clearAllData}>
                Reiniciar Toda la Información
              </button>
            </div>
          </div>
        )}


      {/* MODAL NUEVO INGRESO */}
      {showIncomeModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Registrar Nuevo Ingreso</h2>
            <input type="text" placeholder="Nombre del Cliente" value={incomeForm.person} onChange={(e) => fillIncomeField('person', e.target.value)} />
            <input type="text" placeholder="Carnet de Identidad" value={incomeForm.carnet} onChange={(e) => fillIncomeField('carnet', e.target.value)} />
            <input type="text" placeholder="Teléfono / Celular" value={incomeForm.phone} onChange={(e) => fillIncomeField('phone', e.target.value)} />
            <input type="text" placeholder="Concepto (Ej. Campamento juvenil)" value={incomeForm.concept} onChange={(e) => setIncomeForm({ ...incomeForm, concept: e.target.value })} />
            <div className="form-row">

              <input type="number" placeholder="Efectivo Bs" value={incomeForm.cash} onChange={(e) => setIncomeForm({ ...incomeForm, cash: e.target.value })} />
              <input type="number" placeholder="QR Bs" value={incomeForm.qr} onChange={(e) => setIncomeForm({ ...incomeForm, qr: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button onClick={saveIncome} className="btn-primary">Guardar e Imprimir Recibo</button>
              <button onClick={() => setShowIncomeModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO EGRESO */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Registrar Nuevo Egreso</h2>
            <input type="text" placeholder="Pagado a (Beneficiario/Proveedor)" value={expenseForm.recipient} onChange={(e) => setExpenseForm({ ...expenseForm, recipient: e.target.value })} />
            <input type="text" placeholder="Concepto del gasto" value={expenseForm.concept} onChange={(e) => setExpenseForm({ ...expenseForm, concept: e.target.value })} />
            <input type="text" placeholder="Categoría (Ej. Servicios básicos)" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} />
            <div className="form-row">
              <input type="number" placeholder="Efectivo Bs" value={expenseForm.cash} onChange={(e) => setExpenseForm({ ...expenseForm, cash: e.target.value })} />
              <input type="number" placeholder="QR Bs" value={expenseForm.qr} onChange={(e) => setExpenseForm({ ...expenseForm, qr: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button onClick={saveExpense} className="btn-primary">Guardar Comprobante</button>
              <button onClick={() => setShowExpenseModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* VISUALIZADOR DE RECIBO DE PAGO */}
      {showReceipt && selectedReceipt && (
        <div className="modal-overlay">
          <div className="modal-card print-view">
            <div className="print-copies-wrapper">
              {renderReceiptCopy(selectedReceipt, 'cliente', receiptPaperRef)}
              {renderReceiptCopy(selectedReceipt, 'administración')}
            </div>
            <div className="modal-actions no-print">
              <button onClick={() => window.print()} className="btn-primary">Imprimir Duplicado</button>
              <button onClick={() => shareAsImage(receiptPaperRef.current, `${selectedReceipt.receipt}.png`, `Recibo ${selectedReceipt.receipt} de SEC-CAR para ${selectedReceipt.person}`)} disabled={sharingReceipt}>
                {sharingReceipt ? 'Generando...' : 'Compartir / WhatsApp'}
              </button>
              <button onClick={() => setShowReceipt(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* VISUALIZADOR DE COMPROBANTE DE EGRESO */}
      {showVoucher && selectedVoucher && (
        <div className="modal-overlay">
          <div className="modal-card print-view">
            <div className="print-copies-wrapper">
              {renderVoucherCopy(selectedVoucher, 'beneficiario', voucherPaperRef)}
              {renderVoucherCopy(selectedVoucher, 'administración')}
            </div>
            <div className="modal-actions no-print">
              <button onClick={() => window.print()} className="btn-primary">Imprimir Comprobante</button>
              <button onClick={() => shareAsImage(voucherPaperRef.current, `${selectedVoucher.voucher}.png`, `Comprobante ${selectedVoucher.voucher} de SEC-CAR para ${selectedVoucher.recipient}`)} disabled={sharingReceipt}>
                {sharingReceipt ? 'Generando...' : 'Compartir / WhatsApp'}
              </button>
              <button onClick={() => setShowVoucher(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR CLIENTE */}
      {pendingDelete && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Confirmar Eliminación</h2>
            <p>¿Estás seguro de eliminar a <strong>{pendingDelete.name}</strong> del directorio de clientes?</p>
            {pendingDeleteRecord && (
              <p><small>Este cliente cuenta con {pendingDeleteRecord.count} recibo(s) registrado(s) por un valor de {money(pendingDeleteRecord.total)}.</small></p>
            )}
            <div className="modal-actions">
              <button className="btn-danger" onClick={() => { setPeople(people.filter((p) => p.id !== pendingDelete.id)); setPendingDelete(null) }}>
                Eliminar Cliente
              </button>
              <button onClick={() => setPendingDelete(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}