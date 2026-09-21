import React, { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import './App.css'

/* ============================ Tipos ============================ */
type AccountPermissions = {
  income: boolean
  expenses: boolean
  events: boolean
  clients: boolean
  users?: boolean
}

type Account = {
  name: string
  password: string
  needsPassword: boolean
  fullName: string
  avatar?: string
  enabled?: boolean
  permissions?: AccountPermissions
}

type Payment = {
  id: string
  receipt: string
  person: string
  carnet: string
  phone: string
  concept: string
  date: string
  amount: number
  cash: number
  qr: number
  status: 'Aplicado' | 'Anulado'
  issuedBy: string
}

type Expense = {
  id: string
  voucher: string
  concept: string
  recipient: string
  category: string
  date: string
  amount: number
  cash: number
  qr: number
  status: 'Aplicado' | 'Anulado'
  issuedBy: string
}

type Person = { id: string; name: string; carnet: string; phone: string; notes: string }

type PaymentStanding = 'completo' | 'mitad' | 'menos-mitad' | 'sin-precio'

/* ============================ Constantes ============================ */
const accountsKey = 'sec-car-accounts'

const defaultPermissions: AccountPermissions = {
  income: true,
  expenses: true,
  events: false,
  clients: true,
  users: false,
}

const defaultAccounts: Account[] = [
  { name: 'Melitza Huanca', password: '', needsPassword: true, fullName: '', enabled: true },
  {
    name: 'Ovet Zúñiga',
    password: '',
    needsPassword: true,
    fullName: '',
    enabled: true,
    permissions: { income: true, expenses: true, events: true, clients: true, users: true },
  },
]

const adminResetKey = (import.meta as any).env?.VITE_ADMIN_RESET_KEY || 'SEC-CAR-ADMIN'

const legacyNameMap: Record<string, string> = {
  Melitza: 'Melitza Huanca',
  Ovet: 'Ovet Zúñiga',
}
const migrateAccountName = (name: string): string => legacyNameMap[name] || name

const getPermissions = (account?: Account): AccountPermissions => ({
  ...defaultPermissions,
  ...account?.permissions,
})

const isAccountEnabled = (account?: Account) => account?.enabled !== false

/* ============================ Utilidades ============================ */
function readAccounts(): Account[] {
  try {
    const stored = localStorage.getItem(accountsKey)
    const parsed: Account[] = stored ? JSON.parse(stored) : defaultAccounts
    const migrated = parsed.map((account) => ({
      ...account,
      name: migrateAccountName(account.name),
      fullName: account.fullName || '',
    }))
    defaultAccounts.forEach((account) => {
      if (!migrated.some((existing) => existing.name === account.name)) migrated.push(account)
    })
    return migrated
  } catch {
    return [...defaultAccounts]
  }
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
    try {
      const stored = localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : initial
    } catch {
      return initial
    }
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
const dateInRange = (date: string, start: string, end: string) =>
  (!start || date >= start) && (!end || date <= end)
const money = (value: number) => `Bs ${value.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`
const nextCode = (prefix: string, count: number) => `${prefix}-${String(count).padStart(5, '0')}`

const standingOf = (paid: number, price: number): PaymentStanding => {
  if (!price) return 'sin-precio'
  if (paid >= price) return 'completo'
  if (paid >= price / 2) return 'mitad'
  return 'menos-mitad'
}

/* ============================ Datos iniciales ============================ */
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
type NavPage = (typeof navItems)[number]

const eventManager = 'Ovet Zúñiga'
const systemAdmin = 'Ovet Zúñiga'

/* ============================ Pantalla de acceso ============================ */
function AccessScreen({ onLogin }: { onLogin: (name: string) => void }) {
  const [accounts, setAccounts] = useState<Account[]>(readAccounts)
  const [selected, setSelected] = useState<string>(accounts[0]?.name || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState('')
  const [mode, setMode] = useState<'login' | 'first' | 'recovery'>('login')
  const [message, setMessage] = useState('')

  const current = accounts.find((a) => a.name === selected) || accounts[0]

  const persist = (next: Account[]) => {
    setAccounts(next)
    localStorage.setItem(accountsKey, JSON.stringify(next))
  }

  const chooseUser = (name: string) => {
    setSelected(name)
    setPassword('')
    setConfirm('')
    setFullName('')
    setMessage('')
    setMode('login')
  }

  const uploadAvatar = async (name: string, file: File | undefined) => {
    if (!file) return
    const dataUrl = await readFileAsDataURL(file)
    persist(accounts.map((a) => (a.name === name ? { ...a, avatar: dataUrl } : a)))
  }

  const submit = () => {
    if (!current) return
    if (!isAccountEnabled(current)) {
      setMessage('Esta cuenta está deshabilitada. Contacta al administrador.')
      return
    }
    if (mode === 'first') {
      if (!fullName.trim()) {
        setMessage('Escribe tu nombre y apellido; aparecerá en la firma de los comprobantes.')
        return
      }
      if (password.length < 6 || password !== confirm) {
        setMessage('La contraseña debe tener al menos 6 caracteres y coincidir en ambos campos.')
        return
      }
      persist(
        accounts.map((a) =>
          a.name === selected ? { ...a, password, needsPassword: false, fullName: fullName.trim() } : a
        )
      )
      setMessage('Contraseña creada. Ya puedes ingresar a SEC-CAR.')
      setMode('login')
      setPassword('')
      setConfirm('')
      setFullName('')
      return
    }
    if (!current.needsPassword && password && password === current.password) {
      onLogin(selected)
      return
    }
    setMessage('La contraseña no coincide. Si la olvidaste, usa "Recuperar acceso".')
  }

  const resetAccess = () => {
    if (password !== adminResetKey) {
      setMessage('Para restablecer accesos usa la clave administrativa definida por el responsable.')
      return
    }
    persist(accounts.map((a) => (a.name === selected ? { ...a, password: '', needsPassword: true } : a)))
    setPassword('')
    setMessage(`Acceso de ${selected} reiniciado. Deberá crear una contraseña nueva al ingresar.`)
    setMode('login')
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="brand-mark">
            <img src="/logo-seccar.png" alt="SEC-CAR" />
          </div>
          <div>
            <strong>SEC-CAR</strong>
            <span>Seminario de Educación Cristiana Caranavi</span>
          </div>
        </div>
        <div className="auth-copy">
          <span className="eyebrow">ACCESO PRIVADO</span>
          <h1>
            {mode === 'recovery' ? 'Recuperar acceso' : mode === 'first' ? 'Crea tu contraseña' : 'Bienvenido de nuevo'}
          </h1>
          <p>
            {mode === 'recovery'
              ? 'El responsable puede reiniciar el acceso de una de las cuentas autorizadas.'
              : mode === 'first'
              ? `Es la primera vez que ingresa ${selected}. Define una contraseña personal para continuar.`
              : 'Ingresa con tu cuenta para registrar y consultar los movimientos del centro.'}
          </p>
        </div>

        {mode !== 'recovery' && (
          <>
            <div className="user-picker">
              <span>¿Quién eres?</span>
              <div>
                {accounts.filter(isAccountEnabled).map((account) => (
                  <div
                    key={account.name}
                    role="button"
                    tabIndex={0}
                    className={selected === account.name ? 'user-choice selected' : 'user-choice'}
                    onClick={() => chooseUser(account.name)}
                  >
                    <label
                      className="auth-avatar avatar-upload"
                      title="Subir mi foto de perfil"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {account.avatar ? <img src={account.avatar} alt={account.name} /> : account.name[0]}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => uploadAvatar(account.name, event.target.files?.[0])}
                      />
                    </label>
                    <span>
                      <strong>{account.name}</strong>
                      <small>{account.needsPassword ? 'Primer ingreso' : 'Cuenta activa'}</small>
                    </span>
                    {selected === account.name && <b>✓</b>}
                  </div>
                ))}
              </div>
            </div>

            {mode === 'first' && (
              <label className="auth-label">
                Nombre y apellido
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej. Melitza Huanca" />
              </label>
            )}

            <label className="auth-label">
              {mode === 'first' ? 'Nueva contraseña' : 'Contraseña'}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </label>

            {mode === 'first' && (
              <label className="auth-label">
                Confirmar contraseña
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repite tu contraseña"
                />
              </label>
            )}

            <button
              className="auth-submit"
              onClick={() => (current?.needsPassword && mode === 'login' ? setMode('first') : submit())}
            >
              {current?.needsPassword && mode === 'login'
                ? 'Crear mi contraseña'
                : mode === 'first'
                ? 'Guardar contraseña'
                : 'Ingresar al sistema'}{' '}
              <span>→</span>
            </button>

            <button
              className="auth-link"
              onClick={() => {
                setMode('recovery')
                setPassword('')
                setMessage('')
              }}
            >
              Olvidé mi contraseña
            </button>
          </>
        )}

        {mode === 'recovery' && (
          <>
            <div className="recovery-card">
              <p>Selecciona la cuenta que necesita volver a configurarse.</p>
              <div className="recovery-users">
                {accounts.map((account) => (
                  <button
                    key={account.name}
                    className={selected === account.name ? 'selected' : ''}
                    onClick={() => setSelected(account.name)}
                  >
                    {account.name}
                    <span>{selected === account.name ? 'Seleccionada' : 'Seleccionar'}</span>
                  </button>
                ))}
              </div>
              <label className="auth-label">
                Clave administrativa
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="La define el responsable"
                />
              </label>
              <button className="auth-submit" onClick={resetAccess}>
                Reiniciar acceso de {selected} <span>↻</span>
              </button>
            </div>
            <button
              className="auth-link"
              onClick={() => {
                setMode('login')
                setPassword('')
                setMessage('')
              }}
            >
              Volver al ingreso
            </button>
          </>
        )}

        {message && <div className="auth-message">{message}</div>}

        <div className="auth-footer">
          <span className="sync-dot"></span> Sistema listo para sincronizar
        </div>
        <p className="auth-verse">
          "Todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres" — Colosenses 3:23
          <br />
          "Se requiere que el administrador, sea hallado fiel" — 1 Corintios 4:2
        </p>
      </div>

      <div className="auth-visual">
        <div className="visual-note">
          <span>CONTROL FINANCIERO</span>
          <strong>
            Recibos claros.
            <br />
            Cuentas en orden.
          </strong>
          <p>Ingresos, egresos y pagos parciales en un solo lugar.</p>
        </div>
        <div className="visual-receipt">
          <small>SEC-CAR · RECIBO DE PAGO</small>
          <strong>Bs 250.00</strong>
          <span>ORIGINAL + COPIA ADMINISTRACIÓN</span>
        </div>
      </div>
    </div>
  )
}

/* ============================ App principal ============================ */
function App() {
  const [loggedUser, setLoggedUser] = useState<string | null>(null)
  const [accounts, setAccounts] = usePersistedState<Account[]>(accountsKey, readAccounts())
  const [payments, setPayments] = usePersistedState<Payment[]>('sec-car-payments', initialPayments)
  const [expenses, setExpenses] = usePersistedState<Expense[]>('sec-car-expenses', initialExpenses)
  const [people, setPeople] = usePersistedState<Person[]>('sec-car-people', initialPeople)
  const [eventOptions, setEventOptions] = usePersistedState<string[]>('sec-car-events', initialEventOptions)
  const [eventPrices, setEventPrices] = usePersistedState<Record<string, number>>('sec-car-event-prices', {})
  const [categoryOptions, setCategoryOptions] = usePersistedState<string[]>('sec-car-categories', initialCategoryOptions)

  const [theme, setTheme] = usePersistedState<'light' | 'dark'>('sec-car-theme', 'light')
  const [activePage, setActivePage] = useState<NavPage>('Resumen')

  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const [query, setQuery] = useState('')
  const [expenseQuery, setExpenseQuery] = useState('')
  const [peopleQuery, setPeopleQuery] = useState('')

  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)

  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<Expense | null>(null)
  const [showVoucher, setShowVoucher] = useState(false)

  const [sharingReceipt, setSharingReceipt] = useState(false)

  const [pendingDelete, setPendingDelete] = useState<Person | null>(null)
  const [confirmClear, setConfirmClear] = useState('')

  const [newEventName, setNewEventName] = useState('')

  const [incomeForm, setIncomeForm] = useState({ person: '', carnet: '', phone: '', concept: '', cash: '', qr: '' })
  const [expenseForm, setExpenseForm] = useState({ concept: '', recipient: '', category: '', cash: '', qr: '' })

  const [newUserForm, setNewUserForm] = useState({ name: '', fullName: '', password: '' })
  const [userMessage, setUserMessage] = useState('')
  const [fullNameDraft, setFullNameDraft] = useState('')
  const [editingUser, setEditingUser] = useState<Account | null>(null)
  const [editUserForm, setEditUserForm] = useState({ fullName: '', password: '' })

  const receiptOriginalRef = useRef<HTMLDivElement>(null)
  const receiptCopyRef = useRef<HTMLDivElement>(null)
  const voucherOriginalRef = useRef<HTMLDivElement>(null)
  const voucherCopyRef = useRef<HTMLDivElement>(null)

  /* --- Helpers --- */
  const accountFullName = (accountName: string) => {
    const acc = accounts.find((a) => a.name === accountName)
    return acc?.fullName || accountName
  }

  const userPermissions = useMemo(() => {
    const acc = accounts.find((a) => a.name === loggedUser)
    return getPermissions(acc)
  }, [accounts, loggedUser])

  useEffect(() => {
    if (loggedUser) {
      const acc = accounts.find((a) => a.name === loggedUser)
      setFullNameDraft(acc?.fullName || '')
    }
  }, [loggedUser, accounts])

  /* --- Compartir como imagen --- */
  const shareAsImage = async (node: HTMLDivElement | null, fileName: string, caption: string) => {
    if (!node) return
    setSharingReceipt(true)
    try {
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' })
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
      if (!blob) return
      const file = new File([blob], fileName, { type: 'image/png' })
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean
        share?: (data: ShareData) => Promise<void>
      }
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: caption, text: caption })
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.click()
        URL.revokeObjectURL(url)
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${caption} (imagen descargada, adjúntala en WhatsApp)`)}`,
          '_blank'
        )
      }
    } finally {
      setSharingReceipt(false)
    }
  }

  /* --- Render de comprobantes --- */
  const renderReceiptCopy = (
    payment: Payment,
    copy: 'cliente' | 'administración',
    ref?: React.RefObject<HTMLDivElement | null>
  ) => (
    <div className="receipt-paper" ref={ref}>
      <div className="receipt-brand">
        <img src="/logo-seccar.png" alt="SEC-CAR" className="receipt-logo" />
        SEC-CAR
        <small>Seminario de Educación Cristiana Caranavi</small>
      </div>
      <div className="receipt-type">
        RECIBO DE PAGO <strong>{payment.receipt}</strong>
      </div>
      <div className="receipt-line">
        <span>Recibí de:</span>
        <b>{payment.person}</b>
      </div>
      {payment.carnet && (
        <div className="receipt-line">
          <span>N.º de carnet:</span>
          <b>{payment.carnet}</b>
        </div>
      )}
      {payment.phone && (
        <div className="receipt-line">
          <span>N.º de celular:</span>
          <b>{payment.phone}</b>
        </div>
      )}
      <div className="receipt-line">
        <span>Concepto:</span>
        <b>{payment.concept}</b>
      </div>
      <div className="receipt-line">
        <span>Fecha:</span>
        <b>{formatDate(payment.date)}</b>
      </div>
      <div className="receipt-total">
        <span>TOTAL PAGADO</span>
        <strong>{money(payment.amount)}</strong>
      </div>
      <div className="receipt-methods">
        <span>Efectivo {money(payment.cash)}</span>
        <span>QR {money(payment.qr)}</span>
      </div>
      <div className="signature-row">
        {copy === 'administración' && (
          <div className="signature-col">
            <span className="signature-name">{payment.person}</span>
            <span className="signature-role">INTERESADO</span>
          </div>
        )}
        <div className="signature-col">
          <span className="signature-name">{accountFullName(payment.issuedBy)}</span>
          <span className="signature-role">ADMINISTRADOR</span>
        </div>
      </div>
      <div className="copy-mark">
        {copy === 'cliente' ? 'ORIGINAL' : 'COPIA'} <span>·</span> PARA {copy.toUpperCase()}
      </div>
    </div>
  )

  const renderVoucherCopy = (
    expense: Expense,
    copy: 'beneficiario' | 'administración',
    ref?: React.RefObject<HTMLDivElement | null>
  ) => (
    <div className="receipt-paper" ref={ref}>
      <div className="receipt-brand">
        <img src="/logo-seccar.png" alt="SEC-CAR" className="receipt-logo" />
        SEC-CAR
        <small>Seminario de Educación Cristiana Caranavi</small>
      </div>
      <div className="receipt-type">
        COMPROBANTE DE EGRESO <strong>{expense.voucher}</strong>
      </div>
      <div className="receipt-line">
        <span>Pagado a:</span>
        <b>{expense.recipient}</b>
      </div>
      <div className="receipt-line">
        <span>Concepto:</span>
        <b>{expense.concept}</b>
      </div>
      <div className="receipt-line">
        <span>Categoría:</span>
        <b>{expense.category}</b>
      </div>
      <div className="receipt-line">
        <span>Fecha:</span>
        <b>{formatDate(expense.date)}</b>
      </div>
      <div className="receipt-total">
        <span>TOTAL PAGADO</span>
        <strong>{money(expense.amount)}</strong>
      </div>
      <div className="receipt-methods">
        <span>Efectivo {money(expense.cash)}</span>
        <span>QR {money(expense.qr)}</span>
      </div>
      <div className="signature-row">
        {copy === 'administración' && (
          <div className="signature-col">
            <span className="signature-name">{expense.recipient}</span>
            <span className="signature-role">INTERESADO</span>
          </div>
        )}
        <div className="signature-col">
          <span className="signature-name">{accountFullName(expense.issuedBy)}</span>
          <span className="signature-role">ADMINISTRADOR</span>
        </div>
      </div>
      <div className="copy-mark">
        {copy === 'beneficiario' ? 'ORIGINAL' : 'COPIA'} <span>·</span> PARA {copy.toUpperCase()}
      </div>
    </div>
  )

  /* --- Filtros y totales --- */
  const hasDateFilter = Boolean(filterStartDate || filterEndDate)
  const rangePayments = useMemo(
    () => payments.filter((p) => dateInRange(p.date, filterStartDate, filterEndDate)),
    [payments, filterStartDate, filterEndDate]
  )
  const rangeExpenses = useMemo(
    () => expenses.filter((e) => dateInRange(e.date, filterStartDate, filterEndDate)),
    [expenses, filterStartDate, filterEndDate]
  )
  const rangeIncomeTotal = rangePayments.filter((p) => p.status === 'Aplicado').reduce((s, p) => s + p.amount, 0)
  const rangeExpenseTotal = rangeExpenses.filter((e) => e.status === 'Aplicado').reduce((s, e) => s + e.amount, 0)

  const filteredPayments = useMemo(
    () =>
      rangePayments.filter((p) =>
        `${p.person} ${p.concept} ${p.receipt} ${p.carnet} ${p.phone}`.toLowerCase().includes(query.toLowerCase())
      ),
    [rangePayments, query]
  )
  const filteredExpenses = useMemo(
    () =>
      rangeExpenses.filter((e) =>
        `${e.recipient} ${e.concept} ${e.category} ${e.voucher}`.toLowerCase().includes(expenseQuery.toLowerCase())
      ),
    [rangeExpenses, expenseQuery]
  )

  const activeIncome = payments.filter((p) => p.status === 'Aplicado')
  const activeExpenses = expenses.filter((e) => e.status === 'Aplicado')
  const totalIncome = activeIncome.reduce((s, p) => s + p.amount, 0)
  const totalExpense = activeExpenses.reduce((s, e) => s + e.amount, 0)
  const balance = totalIncome - totalExpense

  const thisMonth = todayISO().slice(0, 7)
  const incomeThisMonth = activeIncome.filter((p) => p.date.slice(0, 7) === thisMonth).reduce((s, p) => s + p.amount, 0)
  const expenseThisMonth = activeExpenses.filter((e) => e.date.slice(0, 7) === thisMonth).reduce((s, e) => s + e.amount, 0)

  const movements = useMemo(() => {
    const incomes = payments.map((p) => ({
      id: p.id,
      type: 'Ingreso' as const,
      code: p.receipt,
      label: p.person,
      concept: p.concept,
      date: p.date,
      amount: p.amount,
      status: p.status,
    }))
    const outs = expenses.map((e) => ({
      id: e.id,
      type: 'Egreso' as const,
      code: e.voucher,
      label: e.recipient,
      concept: e.concept,
      date: e.date,
      amount: e.amount,
      status: e.status,
    }))
    return [...incomes, ...outs]
      .filter((m) => dateInRange(m.date, filterStartDate, filterEndDate))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [payments, expenses, filterStartDate, filterEndDate])

  /* --- Eventos --- */
  const payersOfEvent = (eventName: string) => {
    const related = activeIncome.filter((p) => p.concept === eventName)
    const byPerson = new Map<string, { person: string; carnet: string; phone: string; paid: number; count: number }>()
    related.forEach((p) => {
      const key = p.person.toLowerCase()
      const entry = byPerson.get(key) || { person: p.person, carnet: p.carnet, phone: p.phone, paid: 0, count: 0 }
      entry.paid += p.amount
      entry.count += 1
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
    return {
      name,
      count: related.length,
      total: related.reduce((s, p) => s + p.amount, 0),
      price,
      payers,
      completo,
      mitad,
      menosMitad,
    }
  })

  /* --- Clientes --- */
  const peopleWithTotals = people.map((person) => {
    const related = payments.filter(
      (p) => p.person.toLowerCase() === person.name.toLowerCase() && p.status === 'Aplicado'
    )
    const total = related.reduce((s, p) => s + p.amount, 0)
    const events = Array.from(new Set(related.map((p) => p.concept))).map((eventName) => {
      const paid = related.filter((p) => p.concept === eventName).reduce((s, p) => s + p.amount, 0)
      const price = eventPrices[eventName] || 0
      return { event: eventName, paid, price, remaining: Math.max(price - paid, 0), standing: standingOf(paid, price) }
    })
    const totalDue = events.reduce((s, ev) => s + ev.remaining, 0)
    return { ...person, total, count: related.length, events, totalDue, receipts: related }
  })

  const filteredPeople = useMemo(
    () =>
      peopleWithTotals.filter((p) =>
        `${p.name} ${p.carnet} ${p.phone}`.toLowerCase().includes(peopleQuery.toLowerCase())
      ),
    [peopleWithTotals, peopleQuery]
  )

  const findPersonMatch = (term: string) => {
    const clean = term.trim().toLowerCase()
    if (!clean) return null
    return (
      peopleWithTotals.find(
        (p) =>
          p.name.toLowerCase() === clean ||
          (p.carnet && p.carnet.toLowerCase() === clean) ||
          (p.phone && p.phone.toLowerCase() === clean)
      ) || null
    )
  }

  const fillIncomeField = (field: 'person' | 'carnet' | 'phone', value: string) => {
    const match = findPersonMatch(value)
    setIncomeForm((prev) => {
      if (!match) return { ...prev, [field]: value }
      return { ...prev, person: match.name, carnet: match.carnet || prev.carnet, phone: match.phone || prev.phone, [field]: value }
    })
  }

  /* --- Guardar ingreso --- */
  const saveIncome = () => {
    const cash = Number(incomeForm.cash) || 0
    const qr = Number(incomeForm.qr) || 0
    if (!incomeForm.person.trim() || !incomeForm.concept.trim() || (!cash && !qr)) return
    const concept = incomeForm.concept.trim()
    const personName = incomeForm.person.trim()
    const carnet = incomeForm.carnet.trim()
    const phone = incomeForm.phone.trim()
    const next: Payment = {
      id: crypto.randomUUID(),
      receipt: nextCode('REC', 242 + payments.length),
      person: personName,
      carnet,
      phone,
      concept,
      date: todayISO(),
      amount: cash + qr,
      cash,
      qr,
      status: 'Aplicado',
      issuedBy: loggedUser!,
    }
    setPayments([next, ...payments])
    if (loggedUser === eventManager && !eventOptions.includes(concept)) {
      setEventOptions([...eventOptions, concept])
    }
    const existing = people.find((p) => p.name.toLowerCase() === personName.toLowerCase())
    if (!existing) {
      setPeople([...people, { id: crypto.randomUUID(), name: personName, carnet, phone, notes: '' }])
    } else {
      setPeople(
        people.map((p) =>
          p.id === existing.id
            ? {
                ...p,
                carnet: carnet && !p.carnet ? carnet : p.carnet,
                phone: phone && !p.phone ? phone : p.phone,
              }
            : p
        )
      )
    }
    setSelectedReceipt(next)
    setShowIncomeModal(false)
    setShowReceipt(true)
    setIncomeForm({ person: '', carnet: '', phone: '', concept: '', cash: '', qr: '' })
  }

  /* --- Guardar egreso --- */
  const saveExpense = () => {
    const cash = Number(expenseForm.cash) || 0
    const qr = Number(expenseForm.qr) || 0
    if (!expenseForm.recipient.trim() || !expenseForm.concept.trim() || (!cash && !qr)) return
    const category = expenseForm.category.trim() || 'Otros'
    const next: Expense = {
      id: crypto.randomUUID(),
      voucher: nextCode('EGR', 33 + expenses.length),
      concept: expenseForm.concept.trim(),
      recipient: expenseForm.recipient.trim(),
      category,
      date: todayISO(),
      amount: cash + qr,
      cash,
      qr,
      status: 'Aplicado',
      issuedBy: loggedUser!,
    }
    setExpenses([next, ...expenses])
    if (!categoryOptions.includes(category)) setCategoryOptions([...categoryOptions, category])
    setSelectedVoucher(next)
    setShowExpenseModal(false)
    setShowVoucher(true)
    setExpenseForm({ concept: '', recipient: '', category: '', cash: '', qr: '' })
  }

  /* --- Anulación / reactivación --- */
  const toggleIncomeStatus = (id: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: p.status === 'Aplicado' ? 'Anulado' : 'Aplicado' } : p))
    )
  }

  const toggleExpenseStatus = (id: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: e.status === 'Aplicado' ? 'Anulado' : 'Aplicado' } : e))
    )
  }

  /* --- Eliminar cliente --- */
  const confirmDeletePerson = () => {
    if (!pendingDelete) return
    setPeople(people.filter((p) => p.id !== pendingDelete.id))
    setPendingDelete(null)
  }

  /* --- Administración de usuarios --- */
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

  const toggleUserEnabled = (name: string) => {
    setAccounts((prev) => prev.map((a) => (a.name === name ? { ...a, enabled: !isAccountEnabled(a) } : a)))
  }

  const handleEditUser = (acc: Account) => {
    setEditingUser(acc)
    setEditUserForm({ fullName: acc.fullName, password: '' })
  }

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setAccounts((prev) =>
      prev.map((a) =>
        a.name === editingUser.name
          ? {
              ...a,
              fullName: editUserForm.fullName.trim(),
              password: editUserForm.password ? editUserForm.password : a.password,
              needsPassword: editUserForm.password ? false : a.needsPassword,
            }
          : a
      )
    )
    setUserMessage(`Usuario ${editingUser.name} actualizado.`)
    setEditingUser(null)
    setEditUserForm({ fullName: '', password: '' })
  }

  const handlePermissionChange = (name: string, field: keyof AccountPermissions, value: boolean) => {
    setAccounts((prev) =>
      prev.map((a) => (a.name === name ? { ...a, permissions: { ...getPermissions(a), [field]: value } } : a))
    )
  }

  const saveFullName = () => {
    if (!loggedUser) return
    setAccounts((prev) => prev.map((a) => (a.name === loggedUser ? { ...a, fullName: fullNameDraft.trim() } : a)))
    setUserMessage('Nombre de firma actualizado.')
  }

  const clearAllData = () => {
    if (confirmClear !== 'BORRAR Y REINICIAR') return
    setPayments([])
    setExpenses([])
    setPeople([])
    setEventPrices({})
    setConfirmClear('')
  }

  /* --- Guard: si no está logueado, mostrar acceso --- */
  if (!loggedUser) {
    return <AccessScreen onLogin={(user) => setLoggedUser(user)} />
  }

  /* ============================ Render principal ============================ */
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
              <button
                key={page}
                className={activePage === page ? 'nav-item active' : 'nav-item'}
                onClick={() => setActivePage(page)}
              >
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
          <button className="logout-btn" onClick={() => setLoggedUser(null)}>
            Salir
          </button>
        </div>
      </header>

      {/* Filtro por fechas */}
      <section className="filter-bar">
        <div className="filter-group">
          <label>
            Desde: <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
          </label>
          <label>
            Hasta: <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
          </label>
          {hasDateFilter && (
            <button
              className="btn-clear-date"
              onClick={() => {
                setFilterStartDate('')
                setFilterEndDate('')
              }}
            >
              Limpiar filtro de fechas
            </button>
          )}
        </div>
        {hasDateFilter && (
          <div className="filter-summary">
            Filtrado: Ingresos {money(rangeIncomeTotal)} | Egresos {money(rangeExpenseTotal)} | Neto{' '}
            {money(rangeIncomeTotal - rangeExpenseTotal)}
          </div>
        )}
      </section>

      <main className="app-content">
        {/* RESUMEN */}
        {activePage === 'Resumen' && (
          <div className="page-grid">
            <div className="card-stat">
              <h3>Ingresos del mes</h3>
              <strong>{money(incomeThisMonth)}</strong>
            </div>
            <div className="card-stat">
              <h3>Egresos del mes</h3>
              <strong>{money(expenseThisMonth)}</strong>
            </div>
            <div className="card-stat">
              <h3>Caja Total</h3>
              <strong>{money(balance)}</strong>
            </div>

            <div className="full-width-card">
              <h3>Movimientos Recientes</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Persona / Proveedor</th>
                    <th>Concepto</th>
                    <th>Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 10).map((m) => (
                    <tr key={m.id} className={m.status === 'Anulado' ? 'voided-row' : ''}>
                      <td>{m.code}</td>
                      <td>{formatDate(m.date)}</td>
                      <td>
                        <span className={`badge ${m.type.toLowerCase()}`}>{m.type}</span>
                      </td>
                      <td>{m.label}</td>
                      <td>{m.concept}</td>
                      <td>{money(m.amount)}</td>
                      <td>{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loggedUser === systemAdmin && (
              <div className="full-width-card danger-zone">
                <h3>Zona de riesgo</h3>
                <p>Escribe <b>BORRAR Y REINICIAR</b> para vaciar movimientos, clientes y precios de eventos.</p>
                <div className="form-inline">
                  <input value={confirmClear} onChange={(e) => setConfirmClear(e.target.value)} placeholder="BORRAR Y REINICIAR" />
                  <button className="btn-danger" onClick={clearAllData}>Borrar todo</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* INGRESOS */}
        {activePage === 'Ingresos' && (
          <div>
            <div className="action-bar">
              <input
                type="text"
                placeholder="Buscar por cliente, recibo o concepto..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {userPermissions.income && (
                <button className="btn-primary" onClick={() => setShowIncomeModal(true)}>
                  + Nuevo Ingreso
                </button>
              )}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recibo</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Carnet</th>
                  <th>Teléfono</th>
                  <th>Concepto</th>
                  <th>Monto</th>
                  <th>Registrado por</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} className={p.status === 'Anulado' ? 'voided-row' : ''}>
                    <td>{p.receipt}</td>
                    <td>{formatDate(p.date)}</td>
                    <td>{p.person}</td>
                    <td>{p.carnet || '-'}</td>
                    <td>{p.phone || '-'}</td>
                    <td>{p.concept}</td>
                    <td>{money(p.amount)}</td>
                    <td>{accountFullName(p.issuedBy)}</td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedReceipt(p)
                          setShowReceipt(true)
                        }}
                      >
                        Ver Recibo
                      </button>
                      <button onClick={() => toggleIncomeStatus(p.id)}>
                        {p.status === 'Aplicado' ? 'Anular' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* EGRESOS */}
        {activePage === 'Egresos' && (
          <div>
            <div className="action-bar">
              <input
                type="text"
                placeholder="Buscar por beneficiario, comprobante o concepto..."
                value={expenseQuery}
                onChange={(e) => setExpenseQuery(e.target.value)}
              />
              {userPermissions.expenses && (
                <button className="btn-primary" onClick={() => setShowExpenseModal(true)}>
                  + Nuevo Egreso
                </button>
              )}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Comprobante</th>
                  <th>Fecha</th>
                  <th>Pagado a</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Monto</th>
                  <th>Registrado por</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className={e.status === 'Anulado' ? 'voided-row' : ''}>
                    <td>{e.voucher}</td>
                    <td>{formatDate(e.date)}</td>
                    <td>{e.recipient}</td>
                    <td>{e.concept}</td>
                    <td>{e.category}</td>
                    <td>{money(e.amount)}</td>
                    <td>{accountFullName(e.issuedBy)}</td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedVoucher(e)
                          setShowVoucher(true)
                        }}
                      >
                        Ver Comprobante
                      </button>
                      <button onClick={() => toggleExpenseStatus(e.id)}>
                        {e.status === 'Aplicado' ? 'Anular' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* EVENTOS */}
        {activePage === 'Eventos' && (
          <div>
            {loggedUser === eventManager && (
              <div className="add-event-box">
                <input
                  type="text"
                  placeholder="Nuevo evento..."
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (newEventName.trim() && !eventOptions.includes(newEventName.trim())) {
                      setEventOptions([...eventOptions, newEventName.trim()])
                      setNewEventName('')
                    }
                  }}
                >
                  Agregar Evento
                </button>
              </div>
            )}
            <div className="events-grid">
              {eventStats.map((ev) => (
                <div key={ev.name} className="event-card">
                  <h3>{ev.name}</h3>
                  <p>
                    <strong>Total Recaudado:</strong> {money(ev.total)}
                  </p>
                  <p>
                    <strong>Pagos registrados:</strong> {ev.count}
                  </p>
                  {loggedUser === eventManager && (
                    <label>
                      Precio del evento: Bs
                      <input
                        type="number"
                        value={ev.price || ''}
                        onChange={(e) => setEventPrices({ ...eventPrices, [ev.name]: Number(e.target.value) })}
                      />
                    </label>
                  )}
                  <p className="event-standing">
                    ✅ Completo: {ev.completo} · 🟡 Mitad: {ev.mitad} · 🔴 Menos de mitad: {ev.menosMitad}
                  </p>
                  <h4>Inscritos / Pagadores</h4>
                  <ul>
                    {ev.payers.map((p) => (
                      <li key={p.person}>
                        {p.person}: {money(p.paid)} ({p.count} pagos)
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLIENTES */}
        {activePage === 'Clientes' && (
          <div>
            <input
              type="text"
              placeholder="Buscar cliente por nombre, CI o teléfono..."
              value={peopleQuery}
              onChange={(e) => setPeopleQuery(e.target.value)}
            />
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Carnet</th>
                  <th>Teléfono</th>
                  <th>Pagado Total</th>
                  <th>Pagos Registrados</th>
                  <th>Saldo Pendiente</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.carnet || '-'}</td>
                    <td>{p.phone || '-'}</td>
                    <td>{money(p.total)}</td>
                    <td>{p.count}</td>
                    <td>{money(p.totalDue)}</td>
                    <td>
                      <button onClick={() => setPendingDelete(p)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* USUARIOS */}
        {activePage === 'Usuarios' && loggedUser === systemAdmin && (
          <div className="users-panel">
            <h2>Administración de Usuarios y Permisos</h2>

            <div className="user-section">
              <h3>Tu Firma para Comprobantes</h3>
              <div className="form-inline">
                <input
                  type="text"
                  placeholder="Nombre completo para firma"
                  value={fullNameDraft}
                  onChange={(e) => setFullNameDraft(e.target.value)}
                />
                <button onClick={saveFullName}>Actualizar Mi Nombre</button>
              </div>
            </div>

            <div className="user-section">
              <h3>Crear Nuevo Usuario</h3>
              <form onSubmit={handleCreateUser} className="form-grid">
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Nombre completo (Firma)"
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                />
                <input
                  type="password"
                  placeholder="Contraseña inicial"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                />
                <button type="submit" className="btn-primary">
                  Crear Cuenta
                </button>
              </form>
              {userMessage && <p className="info-msg">{userMessage}</p>}
            </div>

            <div className="user-section">
              <h3>Cuentas Registradas</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Nombre Completo (Firma)</th>
                    <th>Estado</th>
                    <th>Contraseña</th>
                    <th>Acciones</th>
                  </tr>
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
                      <td>******</td>
                      <td>
                        <button onClick={() => handleEditUser(acc)}>Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editingUser && (
              <div className="user-section">
                <h3>Editar Usuario: {editingUser.name}</h3>
                <form onSubmit={handleUpdateUser} className="form-grid">
                  <input type="text" value={editingUser.name} readOnly />
                  <input
                    type="text"
                    placeholder="Nombre completo (Firma)"
                    value={editUserForm.fullName}
                    onChange={(e) => setEditUserForm({ ...editUserForm, fullName: e.target.value })}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Nueva Contraseña"
                    value={editUserForm.password}
                    onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                  />
                  <button type="submit" className="btn-primary">
                    Actualizar Usuario
                  </button>
                  <button type="button" onClick={() => setEditingUser(null)}>
                    Cancelar Edición
                  </button>
                </form>
              </div>
            )}

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
                        <label>
                          <input
                            type="checkbox"
                            checked={getPermissions(acc).income}
                            onChange={(e) => handlePermissionChange(acc.name, 'income', e.target.checked)}
                          />{' '}
                          Ingresos
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={getPermissions(acc).expenses}
                            onChange={(e) => handlePermissionChange(acc.name, 'expenses', e.target.checked)}
                          />{' '}
                          Egresos
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={getPermissions(acc).events}
                            onChange={(e) => handlePermissionChange(acc.name, 'events', e.target.checked)}
                          />{' '}
                          Eventos
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={getPermissions(acc).clients}
                            onChange={(e) => handlePermissionChange(acc.name, 'clients', e.target.checked)}
                          />{' '}
                          Clientes
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: NUEVO INGRESO */}
      {showIncomeModal && (
        <div className="modal-backdrop" onClick={() => setShowIncomeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Registrar nuevo ingreso</h3>
            <div className="form-grid">
              <input
                type="text"
                placeholder="Nombre de la persona"
                value={incomeForm.person}
                onChange={(e) => fillIncomeField('person', e.target.value)}
              />
              <input
                type="text"
                placeholder="Carnet"
                value={incomeForm.carnet}
                onChange={(e) => fillIncomeField('carnet', e.target.value)}
              />
              <input
                type="text"
                placeholder="Celular"
                value={incomeForm.phone}
                onChange={(e) => fillIncomeField('phone', e.target.value)}
              />
              <input
                type="text"
                placeholder="Concepto (evento, curso, ofrenda...)"
                value={incomeForm.concept}
                onChange={(e) => setIncomeForm({ ...incomeForm, concept: e.target.value })}
                list="event-options"
              />
              <datalist id="event-options">
                {eventOptions.map((ev) => (
                  <option key={ev} value={ev} />
                ))}
              </datalist>
              <input
                type="number"
                placeholder="Monto en efectivo"
                value={incomeForm.cash}
                onChange={(e) => setIncomeForm({ ...incomeForm, cash: e.target.value })}
              />
              <input
                type="number"
                placeholder="Monto por QR"
                value={incomeForm.qr}
                onChange={(e) => setIncomeForm({ ...incomeForm, qr: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowIncomeModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={saveIncome}>
                Guardar y ver recibo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO EGRESO */}
      {showExpenseModal && (
        <div className="modal-backdrop" onClick={() => setShowExpenseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Registrar nuevo egreso</h3>
            <div className="form-grid">
              <input
                type="text"
                placeholder="Pagado a"
                value={expenseForm.recipient}
                onChange={(e) => setExpenseForm({ ...expenseForm, recipient: e.target.value })}
              />
              <input
                type="text"
                placeholder="Concepto"
                value={expenseForm.concept}
                onChange={(e) => setExpenseForm({ ...expenseForm, concept: e.target.value })}
              />
              <input
                type="text"
                placeholder="Categoría"
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                list="category-options"
              />
              <datalist id="category-options">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <input
                type="number"
                placeholder="Monto en efectivo"
                value={expenseForm.cash}
                onChange={(e) => setExpenseForm({ ...expenseForm, cash: e.target.value })}
              />
              <input
                type="number"
                placeholder="Monto por QR"
                value={expenseForm.qr}
                onChange={(e) => setExpenseForm({ ...expenseForm, qr: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowExpenseModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={saveExpense}>
                Guardar y ver comprobante
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECIBO */}
      {showReceipt && selectedReceipt && (
        <div className="modal-backdrop" onClick={() => setShowReceipt(false)}>
          <div className="modal receipt-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Recibo {selectedReceipt.receipt}</h3>
            <div className="receipts-preview">
              {renderReceiptCopy(selectedReceipt, 'cliente', receiptOriginalRef)}
              {renderReceiptCopy(selectedReceipt, 'administración', receiptCopyRef)}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowReceipt(false)}>Cerrar</button>
              <button
                disabled={sharingReceipt}
                onClick={() =>
                  shareAsImage(
                    receiptOriginalRef.current,
                    `${selectedReceipt.receipt}-original.png`,
                    `Recibo ${selectedReceipt.receipt} — SEC-CAR`
                  )
                }
              >
                Compartir original
              </button>
              <button
                disabled={sharingReceipt}
                onClick={() =>
                  shareAsImage(
                    receiptCopyRef.current,
                    `${selectedReceipt.receipt}-copia.png`,
                    `Copia de recibo ${selectedReceipt.receipt} — SEC-CAR`
                  )
                }
              >
                Compartir copia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMPROBANTE DE EGRESO */}
      {showVoucher && selectedVoucher && (
        <div className="modal-backdrop" onClick={() => setShowVoucher(false)}>
          <div className="modal receipt-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Comprobante {selectedVoucher.voucher}</h3>
            <div className="receipts-preview">
              {renderVoucherCopy(selectedVoucher, 'beneficiario', voucherOriginalRef)}
              {renderVoucherCopy(selectedVoucher, 'administración', voucherCopyRef)}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowVoucher(false)}>Cerrar</button>
              <button
                disabled={sharingReceipt}
                onClick={() =>
                  shareAsImage(
                    voucherOriginalRef.current,
                    `${selectedVoucher.voucher}-original.png`,
                    `Comprobante ${selectedVoucher.voucher} — SEC-CAR`
                  )
                }
              >
                Compartir original
              </button>
              <button
                disabled={sharingReceipt}
                onClick={() =>
                  shareAsImage(
                    voucherCopyRef.current,
                    `${selectedVoucher.voucher}-copia.png`,
                    `Copia de comprobante ${selectedVoucher.voucher} — SEC-CAR`
                  )
                }
              >
                Compartir copia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR CLIENTE */}
      {pendingDelete && (
        <div className="modal-backdrop" onClick={() => setPendingDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Eliminar cliente</h3>
            <p>
              ¿Seguro que deseas eliminar a <b>{pendingDelete.name}</b>? Esta acción no borra sus pagos, solo la ficha
              del cliente.
            </p>
            <div className="modal-actions">
              <button onClick={() => setPendingDelete(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmDeletePerson}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App