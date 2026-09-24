import React, { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import type { Account, Permission } from './types'
import UserManagement from './components/UserManagement'
import { fileToAvatar } from './utils/image'
import './App.css'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadAccounts, saveAccounts, seedIfEmpty, migratePermissions } from './utils/storage'

// ============================================================
// CONSTANTES GENERALES
// ============================================================
const adminResetKey = import.meta.env.VITE_ADMIN_RESET_KEY || 'SEC-CAR-ADMIN'
const PRIMARY_ADMIN = 'Ovet Zúñiga'
// Cierre automático de sesión tras inactividad (30 minutos por defecto)
const SESSION_TIMEOUT_MS = 30  * 60 * 1000
// Cada cuánto se revisa si ya pasó el tiempo límite (30 segundos)
const SESSION_CHECK_INTERVAL_MS = 30 * 1000

function hasPermission(acc: Account | null, perm: Permission): boolean {
  if (!acc) return false
  if (acc.role === 'admin') return true
  return acc.permissions.includes(perm)
}

// Ícono de persona reutilizable (evita repetir el SVG por todo el código)
const PersonIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden="true">
    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
  </svg>
)

// ============================================================
// PANTALLA DE ACCESO
// ============================================================
function AccessScreen({
  accounts,
  onLogin,
  onChangeAccounts,
}: {
  accounts: Account[]
  onLogin: (name: string) => void
  onChangeAccounts: (next: Account[]) => void
}) {
  const [selected, setSelected] = useState<string>(accounts[0]?.name || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState('')
  const [avatarDraft, setAvatarDraft] = useState<string>('')
  const [mode, setMode] = useState<'login' | 'first' | 'recovery'>('login')
  const [message, setMessage] = useState('')

  const current = accounts.find((account) => account.name === selected) || accounts[0]

  useEffect(() => {
    if (!accounts.some((a) => a.name === selected) && accounts[0]) {
      setSelected(accounts[0].name)
    }
  }, [accounts, selected])

  if (!current) {
    return (
      <div className="auth-shell">
        <div className="auth-panel">
          <div className="auth-brand">
            <div className="brand-mark"><img src="/logo-seccar.png" alt="SEC-CAR" /></div>
            <div><strong>SEC-CAR</strong><span>Seminario de Educación Cristiana Caranavi</span></div>
          </div>
          <div className="auth-copy">
            <span className="eyebrow">SIN USUARIOS</span>
            <h1>No hay cuentas configuradas</h1>
            <p>Contacta al responsable del sistema para que cree una cuenta desde el panel de administración.</p>
          </div>
        </div>
      </div>
    )
  }

  const persist = (next: Account[]) => onChangeAccounts(next)

  const chooseUser = (name: string) => {
  setSelected(name); setPassword(''); setConfirm(''); setFullName(''); setAvatarDraft(''); setMessage(''); setMode('login')
  }
  const submit = () => {
    if (mode === 'first') {
      if (!fullName.trim()) { setMessage('Escribe tu nombre y apellido; aparecerá en la firma de los comprobantes.'); return }
      if (password.length < 6 || password !== confirm) { setMessage('La contraseña debe tener 6 caracteres y coincidir en ambos campos.'); return }
      persist(accounts.map((account) => account.name === selected ? {
        ...account,
        password,
        needsPassword: false,
        fullName: fullName.trim(),
        avatar: avatarDraft || account.avatar,
      } : account))
      setMessage('Contraseña creada. Ya puedes ingresar a SEC-CAR.')
      setMode('login'); setPassword(''); setConfirm(''); setFullName(''); setAvatarDraft(''); return
    }
    if (password && password === current.password && !current.needsPassword) { onLogin(selected); return }
    setMessage('La contraseña no coincide. Si la olvidaste, usa "Recuperar acceso".')
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
          <p>
            {mode === 'recovery'
              ? 'El responsable puede reiniciar el acceso de las cuentas autorizadas.'
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
                {accounts.filter((a) => a.active).map((account) => (
                  <button
                    key={account.id}
                    className={selected === account.name ? 'user-choice selected' : 'user-choice'}
                    onClick={() => chooseUser(account.name)}
                  >
                    <span className="auth-avatar">
                      {account.avatar ? (
                        <img src={account.avatar} alt={account.name} />
                      ) : (
                        <PersonIcon size={14} />
                      )}
                    </span>
                    <span>
                      <strong>{account.name}</strong>
                      <small>{account.needsPassword ? 'Primer ingreso' : 'Cuenta activa'}</small>
                    </span>
                    {selected === account.name && <b>✓</b>}
                  </button>
                ))}
              </div>
            </div>
            {mode === 'first' && (
              <>
                <label className="auth-label">
                  Nombre y apellido
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ej. Melitza Huanca" />
                </label>

                <label className="auth-label">
                  Foto de perfil (opcional)
                  <div className="avatar-upload-wrapper">
                    <div className="avatar-preview-large">
                      {avatarDraft ? (
                        <img src={avatarDraft} alt="Vista previa" />
                      ) : (
                        <PersonIcon size={26} />
                      )}
                    </div>
                    <label className="avatar-upload-btn">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0]
                          if (!file) return
                          try {
                            const dataUrl = await fileToAvatar(file, 200)
                            setAvatarDraft(dataUrl)
                          } catch {
                            setMessage('No se pudo cargar la imagen. Intenta con otra.')
                          }
                        }}
                      />
                      {avatarDraft ? 'Cambiar foto' : 'Subir foto'}
                    </label>
                    {avatarDraft && (
                      <button
                        type="button"
                        className="avatar-remove-btn"
                        onClick={() => setAvatarDraft('')}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </label>
              </>
            )}
            <label className="auth-label">
              {mode === 'first' ? 'Nueva contraseña' : 'Contraseña'}
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" />
            </label>
            {mode === 'first' && (
              <label className="auth-label">
                Confirmar contraseña
                <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repite tu contraseña" />
              </label>
            )}
            <button
              className="auth-submit"
              onClick={() => (current.needsPassword && mode === 'login' ? setMode('first') : submit())}
            >
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
                  <button
                    key={account.id}
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
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="La define el responsable" />
              </label>
              <button className="auth-submit" onClick={resetAccess}>Reiniciar acceso de {selected} <span>↻</span></button>
            </div>
            <button className="auth-link" onClick={() => { setMode('login'); setPassword(''); setMessage('') }}>Volver al ingreso</button>
          </>
        )}

        {message && <div className="auth-message">{message}</div>}
        <div className="auth-footer"><span className="sync-dot"></span> Sistema listo para sincronizar con Supabase</div>
        <p className="auth-verse">"Todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres" — Colosenses 3:23<br />"Se requiere que el administrador, sea hallado fiel" — 1 Corintios 4:2</p>
      </div>
      <div className="auth-visual">
        <div className="visual-note">
          <span>CONTROL FINANCIERO</span>
          <strong>Recibos claros.<br />Cuentas en orden.</strong>
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

// ============================================================
// HOOK DE PERSISTENCIA LOCAL
// ============================================================
function usePersistedState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : initial
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)) }, [key, state])
  return [state, setState] as const
}

// ============================================================
// UTILIDADES
// ============================================================
const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const formatDate = (iso: string) => { const d = new Date(`${iso}T00:00:00`); return `${String(d.getDate()).padStart(2, '0')} ${monthNames[d.getMonth()]} ${d.getFullYear()}` }
const todayISO = () => new Date().toISOString().slice(0, 10)
const dateInRange = (date: string, start: string, end: string) => (!start || date >= start) && (!end || date <= end)
const money = (value: number) => `Bs ${value.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`
const nextCode = (prefix: string, count: number) => `${prefix}-${String(count).padStart(5, '0')}`

// ============================================================
// TIPOS DE DATOS
// ============================================================
type Payment = { id: string; receipt: string; person: string; carnet: string; phone: string; concept: string; notes?: string; date: string; amount: number; cash: number; qr: number; status: 'Aplicado' | 'Anulado'; issuedBy: string }
type Expense = { id: string; voucher: string; concept: string; recipient: string; category: string; date: string; amount: number; cash: number; qr: number; status: 'Aplicado' | 'Anulado'; issuedBy: string }
type Person = { id: string; name: string; carnet: string; phone: string; notes: string }

type PaymentStanding = 'completo' | 'mitad' | 'menos-mitad' | 'sin-precio'
const standingOf = (paid: number, price: number): PaymentStanding => {
  if (!price) return 'sin-precio'
  if (paid >= price) return 'completo'
  if (paid >= price / 2) return 'mitad'
  return 'menos-mitad'
}

// ============================================================
// DATOS INICIALES DE EJEMPLO
// ============================================================
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
const navItems = ['Resumen', 'Ingresos', 'Egresos', 'Eventos', 'Clientes' ] as const
const eventManager = 'Ovet Zúñiga'

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
function App() {
  const [loggedUser, setLoggedUser] = useState<string | null>(null)
  const [activePage, setActivePage] = useState<string>('Resumen')
  // Filtros avanzados de Reportes / PDF
  const [pdfStartDate, setPdfStartDate] = useState('')
  const [pdfEndDate, setPdfEndDate] = useState('')
  const [pdfTipo, setPdfTipo] = useState<'todos' | 'ingresos' | 'egresos'>('todos')
  const [pdfPersona, setPdfPersona] = useState('')
  const [pdfConcepto, setPdfConcepto] = useState('')
  const [pdfMontoMin, setPdfMontoMin] = useState('')
  const [pdfMontoMax, setPdfMontoMax] = useState('')

  const [accounts, setAccounts] = useState<Account[]>(() =>
    migratePermissions(seedIfEmpty(loadAccounts()))
  )
  
  useEffect(() => { saveAccounts(accounts) }, [accounts])

  // ============================================================
// CIERRE AUTOMÁTICO DE SESIÓN POR INACTIVIDAD
// ============================================================
  useEffect(() => {
    if (!loggedUser) return

    // Cada vez que el usuario hace algo, reinicia el contador
    const registrarActividad = () => {
      lastActivityRef.current = Date.now()
      // Si había aviso de "¿sigues ahí?", lo quitamos al volver a interactuar
      setSessionWarning((prev) => (prev ? false : prev))
    }

    const eventos: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ]
    eventos.forEach((evt) => window.addEventListener(evt, registrarActividad, { passive: true }))

    // Al iniciar sesión, marcamos la hora actual como última actividad
    lastActivityRef.current = Date.now()

    // Revisamos cada 30 s si ya se pasó el límite
    const interval = window.setInterval(() => {
      const inactivo = Date.now() - lastActivityRef.current
      const restante = SESSION_TIMEOUT_MS - inactivo

      // Faltando 60 s, mostramos el aviso
      if (restante <= 60 * 1000 && restante > 0) {
        setSessionWarning(true)
      }

      // Se cumplió el tiempo → cerrar sesión
      if (inactivo >= SESSION_TIMEOUT_MS) {
        setSessionWarning(false)
        setLoggedUser(null)
        setActivePage('Resumen')
      }
    }, SESSION_CHECK_INTERVAL_MS)

    // Limpieza cuando el usuario cierra sesión o cambia de cuenta
    return () => {
      eventos.forEach((evt) => window.removeEventListener(evt, registrarActividad))
      window.clearInterval(interval)
      setSessionWarning(false)
    }
  }, [loggedUser])
  const [showUserManagement, setShowUserManagement] = useState(false)

  const currentUser = useMemo(
    () => accounts.find((a) => a.name === loggedUser) ?? null,
    [accounts, loggedUser]
  )
  const isPrimaryAdmin = currentUser?.name === PRIMARY_ADMIN

  const [payments, setPayments] = usePersistedState<Payment[]>('sec-car-payments', initialPayments)
  const [expenses, setExpenses] = usePersistedState<Expense[]>('sec-car-expenses', initialExpenses)
  const [eventOptions, setEventOptions] = usePersistedState<string[]>('sec-car-events', initialEventOptions)
  const [categoryOptions, setCategoryOptions] = usePersistedState<string[]>('sec-car-categories', initialCategoryOptions)
  const [people, setPeople] = usePersistedState<Person[]>('sec-car-people', initialPeople)
  const [eventPrices, setEventPrices] = usePersistedState<Record<string, number>>('sec-car-event-prices', {})
  const [fullNameDraft, setFullNameDraft] = useState('')
  const [theme, setTheme] = usePersistedState<'light' | 'dark'>('sec-car-theme', 'light')
// Aviso 1 minuto antes de cerrar sesión
  const [sessionWarning, setSessionWarning] = useState(false)
  const [filterStartDate, setFilterStartDate] = usePersistedState('sec-car-filter-start', '')
  const [filterEndDate, setFilterEndDate] = usePersistedState('sec-car-filter-end', '')

  const [query, setQuery] = useState('')
  const [expenseQuery, setExpenseQuery] = useState('')
  const [newEventName, setNewEventName] = useState('')
  const [peopleQuery, setPeopleQuery] = useState('')
  const [eventPeopleQuery, setEventPeopleQuery] = useState('')

  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showVoucher, setShowVoucher] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null)
  const [selectedVoucher, setSelectedVoucher] = useState<Expense | null>(null)

  const [incomeForm, setIncomeForm] = useState({ person: '', carnet: '', phone: '', concept: '', notes: '', cash: '', qr: '' })
  const [expenseForm, setExpenseForm] = useState({ concept: '', recipient: '', category: '', cash: '', qr: '' })
  const [personForm, setPersonForm] = useState({ name: '', carnet: '', phone: '', notes: '' })
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [personEditForm, setPersonEditForm] = useState({ name: '', carnet: '', phone: '', notes: '' })
  const [personMessage, setPersonMessage] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Person | null>(null)
  const [confirmClear, setConfirmClear] = useState('')
  const lastActivityRef = useRef<number>(Date.now())
  const receiptPaperRef = useRef<HTMLDivElement | null>(null)
  const voucherPaperRef = useRef<HTMLDivElement | null>(null)
  const [sharingReceipt, setSharingReceipt] = useState(false)

  useEffect(() => {
    if (loggedUser) setFullNameDraft(accounts.find((account) => account.name === loggedUser)?.fullName || '')
  }, [loggedUser, accounts])

  // ============================================================
  // COMPARTIR COMPROBANTES POR IMAGEN
  // ============================================================
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

  // ============================================================
  // RENDERIZADO DE COMPROBANTES
  // ============================================================
  const renderReceiptCopy = (payment: Payment, copy: 'cliente' | 'administración', ref?: React.RefObject<HTMLDivElement | null>) => (
    <div className="receipt-paper" ref={ref}>
      <div className="receipt-brand"><img src="/logo-seccar.png" alt="SEC-CAR" className="receipt-logo" />SEC-CAR<small>Seminario de Educación Cristiana Caranavi</small></div>
      <div className="receipt-type">RECIBO DE PAGO <strong>{payment.receipt}</strong></div>
      <div className="receipt-line"><span>Recibí de:</span><b>{payment.person}</b></div>
      {payment.carnet && <div className="receipt-line"><span>N.º de carnet:</span><b>{payment.carnet}</b></div>}
      {payment.phone && <div className="receipt-line"><span>N.º de celular:</span><b>{payment.phone}</b></div>}
      <div className="receipt-line"><span>Concepto:</span><b>{payment.concept}</b></div>
      
      {/* 👇 NUEVA LÍNEA: Notas si existen 👇 */}
      {payment.notes && <div className="receipt-line"><span>Notas:</span><b>{payment.notes}</b></div>}
      {/* 👆 FIN DE LA NUEVA LÍNEA 👆 */}
      
      <div className="receipt-line"><span>Fecha:</span><b>{formatDate(payment.date)}</b></div>
      <div className="receipt-total"><span>TOTAL PAGADO</span><strong>{money(payment.amount)}</strong></div>
      <div className="receipt-methods"><span>Efectivo {money(payment.cash)}</span><span>QR {money(payment.qr)}</span></div>
      <div className="signature-row">
        {copy === 'administración' && <div className="signature-col"><span className="signature-name">{payment.person}</span><span className="signature-role">INTERESADO</span></div>}
        <div className="signature-col"><span className="signature-name">{accountFullName(payment.issuedBy)}</span><span className="signature-role">ADMINISTRADOR</span></div>
      </div>
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
      <div className="signature-row">
        {copy === 'administración' && <div className="signature-col"><span className="signature-name">{expense.recipient}</span><span className="signature-role">INTERESADO</span></div>}
        <div className="signature-col"><span className="signature-name">{accountFullName(expense.issuedBy)}</span><span className="signature-role">ADMINISTRADOR</span></div>
      </div>
      <div className="copy-mark">{copy === 'beneficiario' ? 'ORIGINAL' : 'COPIA'} <span>·</span> PARA {copy.toUpperCase()}</div>
    </div>
  )

  // ============================================================
  // CÁLCULOS DERIVADOS
  // ============================================================
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
  const incomeThisMonthList = activeIncome.filter((p) => p.date.slice(0, 7) === thisMonth)
  const expenseThisMonthList = activeExpenses.filter((e) => e.date.slice(0, 7) === thisMonth)
  const incomeThisMonth = incomeThisMonthList.reduce((sum, p) => sum + p.amount, 0)
  const expenseThisMonth = expenseThisMonthList.reduce((sum, e) => sum + e.amount, 0)

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

  const undirectoried = Array.from(new Set(payments.map((p) => p.person)))
    .filter((name) => !people.some((person) => person.name.toLowerCase() === name.toLowerCase()))
    .map((name) => ({
      name,
      carnet: payments.find((p) => p.person === name && p.carnet)?.carnet || '',
      phone: payments.find((p) => p.person === name && p.phone)?.phone || '',
    }))

  const filteredPeople = useMemo(() => peopleWithTotals.filter((person) => `${person.name} ${person.carnet} ${person.phone}`.toLowerCase().includes(peopleQuery.toLowerCase())), [peopleWithTotals, peopleQuery])
  const pendingDeleteRecord = pendingDelete ? peopleWithTotals.find((person) => person.id === pendingDelete.id) : null

  const findPersonMatch = (term: string) => {
    const clean = term.trim().toLowerCase()
    if (!clean) return null
    return peopleWithTotals.find((person) => person.name.toLowerCase() === clean || (person.carnet && person.carnet.toLowerCase() === clean) || (person.phone && person.phone.toLowerCase() === clean)) || null
  }
  const incomeLookup = useMemo(() => {
    const byName = findPersonMatch(incomeForm.person)
    const byCarnet = incomeForm.carnet ? findPersonMatch(incomeForm.carnet) : null
    const byPhone = incomeForm.phone ? findPersonMatch(incomeForm.phone) : null
    return byName || byCarnet || byPhone
  }, [incomeForm.person, incomeForm.carnet, incomeForm.phone, peopleWithTotals])

  const fillIncomeField = (field: 'person' | 'carnet' | 'phone', value: string) => {
    const match = findPersonMatch(value)
    setIncomeForm((prev) => {
      if (!match) return { ...prev, [field]: value }
      return { ...prev, person: match.name, carnet: match.carnet || prev.carnet, phone: match.phone || prev.phone, [field]: value }
    })
  }
  const suggestionsFor = (value: string, options: string[]) => {
    const clean = value.trim().toLowerCase()
    if (!clean) return []
    return options.filter((option) => option.toLowerCase().includes(clean))
  }

  // ============================================================
  // ACCIONES
  // ============================================================
  const saveIncome = () => {
    const cash = Number(incomeForm.cash) || 0
    const qr = Number(incomeForm.qr) || 0
    if (!incomeForm.person.trim() || !incomeForm.concept.trim() || (!cash && !qr)) return
    
    const concept = incomeForm.concept.trim()
    const personName = incomeForm.person.trim()
    const carnet = incomeForm.carnet.trim()
    const phone = incomeForm.phone.trim()
    const notes = incomeForm.notes.trim() // <-- Capturamos las notas
    
    const next: Payment = { 
        id: crypto.randomUUID(), 
        receipt: nextCode('REC', 242 + payments.length), 
        person: personName, 
        carnet, 
        phone, 
        concept, 
        notes, // <-- Agregamos las notas al objeto
        date: todayISO(), 
        amount: cash + qr, 
        cash, 
        qr, 
        status: 'Aplicado', 
        issuedBy: loggedUser! 
    }
    
    setPayments([next, ...payments])
    
    if (loggedUser === eventManager && !eventOptions.includes(concept)) {
        setEventOptions([...eventOptions, concept])
    }
    
    const existing = people.find((person) => person.name.toLowerCase() === personName.toLowerCase())
    if (!existing) {
        setPeople([...people, { id: crypto.randomUUID(), name: personName, carnet, phone, notes: '' }])
    } else {
        setPeople(people.map((person) => 
            person.id === existing.id 
                ? { ...person, carnet: carnet && !person.carnet ? carnet : person.carnet, phone: phone && !person.phone ? phone : person.phone } 
                : person
        ))
    }
    
    setSelectedReceipt(next)
    setShowIncomeModal(false)
    setShowReceipt(true)
    
    // Limpieza del formulario (ahora incluye notes)
    setIncomeForm({ person: '', carnet: '', phone: '', concept: '', notes: '', cash: '', qr: '' })
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
  const canManage = (owner?: string) => !owner || owner === loggedUser
  const accountFullName = (name?: string) => (name && accounts.find((account) => account.name === name)?.fullName.trim()) || name || 'Administrador'
  const saveFullName = () => { if (!loggedUser || !fullNameDraft.trim()) return; setAccounts(accounts.map((account) => account.name === loggedUser ? { ...account, fullName: fullNameDraft.trim() } : account)) }
  const addEventOption = () => { if (loggedUser !== eventManager) return; const name = newEventName.trim(); if (name && !eventOptions.includes(name)) setEventOptions([...eventOptions, name]); setNewEventName('') }
  const removeEventOption = (name: string) => { if (loggedUser !== eventManager) return; setEventOptions(eventOptions.filter((option) => option !== name)) }
  const setEventPrice = (name: string, value: string) => { if (loggedUser !== eventManager) return; setEventPrices({ ...eventPrices, [name]: Number(value) || 0 }) }

  const addPerson = () => {
    if (!personForm.name.trim()) return
    setPeople([...people, { id: crypto.randomUUID(), name: personForm.name.trim(), carnet: personForm.carnet.trim(), phone: personForm.phone.trim(), notes: personForm.notes.trim() }])
    setPersonForm({ name: '', carnet: '', phone: '', notes: '' })
  }
  const removePerson = (id: string) => setPeople(people.filter((person) => person.id !== id))
  const startEditPerson = (person: Person) => {
    setEditingPersonId(person.id)
    setPersonEditForm({ name: person.name, carnet: person.carnet, phone: person.phone, notes: person.notes })
    setPersonMessage('')
  }
  const closeEditPerson = () => { setEditingPersonId(null); setPersonMessage('') }
  const savePersonEdit = () => {
    const target = people.find((person) => person.id === editingPersonId)
    if (!target) return
    const name = personEditForm.name.trim()
    if (!name) { setPersonMessage('Escribe el nombre del cliente.'); return }
    if (people.some((person) => person.id !== target.id && person.name.toLowerCase() === name.toLowerCase())) {
      setPersonMessage('Ya existe otro cliente con ese nombre. Corrige ese registro o usa un dato que lo distinga.')
      return
    }
    const carnet = personEditForm.carnet.trim()
    const phone = personEditForm.phone.trim()
    setPeople(people.map((person) => person.id === target.id ? { ...person, name, carnet, phone, notes: personEditForm.notes.trim() } : person))
    if (target.name.toLowerCase() !== name.toLowerCase() || carnet !== target.carnet || phone !== target.phone) {
      setPayments(payments.map((payment) => payment.person.toLowerCase() === target.name.toLowerCase()
        ? { ...payment, person: name, carnet: payment.carnet || carnet, phone: payment.phone || phone }
        : payment))
    }
    setEditingPersonId(null); setPersonMessage('')
  }
  const askRemovePerson = (person: Person) => setPendingDelete(person)
  const confirmRemovePerson = () => { if (pendingDelete) removePerson(pendingDelete.id); setPendingDelete(null) }
  const registerPayer = (name: string, carnet: string, phone: string) => setPeople([...people, { id: crypto.randomUUID(), name, carnet, phone, notes: '' }])

  const exportBackup = () => {
    const header = ['Tipo', 'Codigo', 'Persona/Destinatario', 'Carnet', 'Telefono', 'Concepto', 'Categoria', 'Fecha', 'Monto', 'Efectivo', 'QR', 'Estado', 'Registrado por']
    const rows = [
      header,
      ...payments.map((p) => ['Ingreso', p.receipt, p.person, p.carnet || '', p.phone || '', p.concept, '', p.date, p.amount, p.cash, p.qr, p.status, p.issuedBy || '']),
      ...expenses.map((e) => ['Egreso', e.voucher, e.recipient, '', '', e.concept, e.category, e.date, e.amount, e.cash, e.qr, e.status, e.issuedBy || '']),
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
  // --- REPORTES: filtrar movimientos para el PDF ---
  const pdfData = useMemo(() => {
    const ingresos = payments
      .filter((p) => p.status === 'Aplicado')
      .filter((p) => !pdfStartDate || p.date >= pdfStartDate)
      .filter((p) => !pdfEndDate || p.date <= pdfEndDate)
      .filter((p) => !pdfPersona || p.person.toLowerCase().includes(pdfPersona.toLowerCase()))
      .filter((p) => !pdfConcepto || p.concept.toLowerCase().includes(pdfConcepto.toLowerCase()))
      .filter((p) => !pdfMontoMin || p.amount >= Number(pdfMontoMin))
      .filter((p) => !pdfMontoMax || p.amount <= Number(pdfMontoMax))
      .map((p) => ({
        tipo: 'Ingreso',
        codigo: p.receipt,
        fecha: p.date,
        persona: p.person,
        concepto: p.concept,
        monto: p.amount,
        efectivo: p.cash,
        qr: p.qr,
        registradoPor: accountFullName(p.issuedBy),
      }))

    const egresos = expenses
      .filter((e) => e.status === 'Aplicado')
      .filter((e) => !pdfStartDate || e.date >= pdfStartDate)
      .filter((e) => !pdfEndDate || e.date <= pdfEndDate)
      .filter((e) => !pdfPersona || e.recipient.toLowerCase().includes(pdfPersona.toLowerCase()))
      .filter((e) => !pdfConcepto || e.concept.toLowerCase().includes(pdfConcepto.toLowerCase()))
      .filter((e) => !pdfMontoMin || e.amount >= Number(pdfMontoMin))
      .filter((e) => !pdfMontoMax || e.amount <= Number(pdfMontoMax))
      .map((e) => ({
        tipo: 'Egreso',
        codigo: e.voucher,
        fecha: e.date,
        persona: e.recipient,
        concepto: e.concept,
        monto: e.amount,
        efectivo: e.cash,
        qr: e.qr,
        registradoPor: accountFullName(e.issuedBy),
      }))

    if (pdfTipo === 'ingresos') return ingresos
    if (pdfTipo === 'egresos') return egresos
    return [...ingresos, ...egresos].sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [
    payments, expenses,
    pdfStartDate, pdfEndDate, pdfTipo,
    pdfPersona, pdfConcepto, pdfMontoMin, pdfMontoMax,
  ])

  // --- REPORTES: generar y descargar el PDF ---
  const descargarReportePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFontSize(15)
    doc.text('SEC-CAR — Seminario de Educación Cristiana Caranavi', 14, 15)

    doc.setFontSize(9)
    doc.text(`Generado: ${formatDate(todayISO())}`, 14, 22)
    doc.text(
      `Período: ${pdfStartDate || 'inicio'}  →  ${pdfEndDate || 'hoy'}   ·   Tipo: ${pdfTipo}`,
      14, 27
    )

    const totalIngresos = pdfData.filter((d) => d.tipo === 'Ingreso').reduce((s, d) => s + d.monto, 0)
    const totalEgresos = pdfData.filter((d) => d.tipo === 'Egreso').reduce((s, d) => s + d.monto, 0)

    doc.setFontSize(10)
    doc.text(
      `Ingresos: Bs ${totalIngresos.toLocaleString('es-BO')}   ·   ` +
      `Egresos: Bs ${totalEgresos.toLocaleString('es-BO')}   ·   ` +
      `Neto: Bs ${(totalIngresos - totalEgresos).toLocaleString('es-BO')}`,
      14, 33
    )

    autoTable(doc, {
      startY: 38,
      head: [['Tipo', 'Código', 'Fecha', 'Persona / Destinatario', 'Concepto', 'Monto', 'Efectivo', 'QR', 'Registrado por']],
      body: pdfData.map((d) => [
        d.tipo,
        d.codigo,
        formatDate(d.fecha),
        d.persona,
        d.concepto,
        money(d.monto),
        money(d.efectivo),
        money(d.qr),
        d.registradoPor,
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    doc.save(`SEC-CAR-reporte-${todayISO()}.pdf`)
  }
  // ============================================================
  // RENDER: PANTALLA DE ACCESO
  // ============================================================
  if (!loggedUser) {
    return (
      <AccessScreen
        accounts={accounts}
        onChangeAccounts={setAccounts}
        onLogin={(name) => setLoggedUser(name)}
      />
    )
  }

  const loggedAccount = accounts.find((a) => a.name === loggedUser)

  // ============================================================
  // RENDER: APP PRINCIPAL
  // ============================================================
  return (
    <div className={`app-shell ${theme}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><img src="/logo-seccar.png" alt="SEC-CAR" /></div>
          <div><strong>SEC-CAR</strong><span>Administración</span></div>
        </div>
        <div className="side-label">GESTIÓN</div>
        <nav>
          {navItems.map((item) => (
            <button key={item} className={activePage === item ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage(item)}>
              <span className="nav-icon">{item === 'Resumen' ? '▦' : item === 'Ingresos' ? '↗' : item === 'Egresos' ? '↘' : item === 'Eventos' ? '◷' : '♙'}</span>
              {item}
            </button>
          ))}
        </nav>
        <div className="side-label report-label">REPORTES</div>
        <button className={activePage === 'Reportes' ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage('Reportes')}>
          <span className="nav-icon">▤</span>Reportes
        </button>
        {sessionWarning && (
          <div className="modal-backdrop">
            <div className="modal">
              <div className="modal-title">
                <div>
                  <span className="eyebrow">SEGURIDAD</span>
                  <h2>¿Sigues ahí?</h2>
                </div>
              </div>
              <p style={{ color: '#63736f', fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>
                Tu sesión se cerrará automáticamente en <b>1 minuto</b> por inactividad.
                Si sigues trabajando, pulsa el botón para continuar.
              </p>
              <div className="payment-note">
                Por seguridad, el sistema te pedirá la contraseña otra vez cuando vuelvas a ingresar.
              </div>
              <button
                className="primary-button full"
                onClick={() => {
                  lastActivityRef.current = Date.now()
                  setSessionWarning(false)
                }}
              >
                Sí, continuar conectado <span>→</span>
              </button>
            </div>
          </div>
        )}
        {isPrimaryAdmin && (
          <>
            <div className="side-label report-label">ADMINISTRACIÓN</div>
            <button className="nav-item" onClick={() => setShowUserManagement(true)}>
              <span className="nav-icon">⚙</span>Usuarios
            </button>
          </>
        )}

        <div className="sidebar-bottom">
          <div className="sync">
            <span className="sync-dot"></span>
            <div><strong>Sincronizado</strong><small>Todos los cambios guardados</small></div>
          </div>
          <div className="profile">
            <div className="avatar">
              {loggedAccount?.avatar
                ? <img src={loggedAccount.avatar} alt={loggedAccount.name} />
                : loggedUser[0]
              }
            </div>
            <div>
              <strong>{loggedAccount?.fullName?.trim() || loggedUser}</strong>
              <small>Administrador</small>
            </div>
            <button
              className="logout-button"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              onClick={() => setLoggedUser(null)}
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><span className="eyebrow">Seminario de Educación Cristiana Caranavi</span><h1>{activePage === 'Resumen' ? 'Resumen general' : activePage}</h1></div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Cambiar tema" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀' : '☾'}</button>
            <button className="icon-button" aria-label="Notificaciones">♢<span className="notification-dot"></span></button>
            <div className="date-pill">{formatDate(todayISO())} <span>⌄</span></div>
          </div>
        </header>

        {(activePage === 'Resumen' || activePage === 'Ingresos' || activePage === 'Egresos') && (
          <section className="filter-row">
            <span className="filter-title">Filtrar por fecha</span>
            <label>Desde<input type="date" value={filterStartDate} onChange={(event) => setFilterStartDate(event.target.value)} /></label>
            <label>Hasta<input type="date" value={filterEndDate} onChange={(event) => setFilterEndDate(event.target.value)} /></label>
            <div className="filter-summary">
              <span>Ingresos: <b>{rangePayments.length}</b> recibos · <b>{money(rangeIncomeTotal)}</b></span>
              <span>Egresos: <b>{rangeExpenses.length}</b> pagos · <b>{money(rangeExpenseTotal)}</b></span>
            </div>
            {hasDateFilter
              ? <button className="filter-clear" onClick={() => { setFilterStartDate(''); setFilterEndDate('') }}>Limpiar fechas</button>
              : <span className="filter-hint">Sin fechas elegidas: se muestran todos los movimientos.</span>}
          </section>
        )}

        {activePage === 'Resumen' && (
          <>
            <section className="hero-row">
              <div><h2>Bienvenido(@), {loggedUser} <span>✦</span></h2><p>Aquí tienes el movimiento de tu centro para hoy.</p></div>
              <div className="hero-actions">
                <button className="outline-button" onClick={() => setShowExpenseModal(true)}><span>−</span> Nuevo egreso</button>
                <button className="primary-button" onClick={() => setShowIncomeModal(true)}><span>＋</span> Nuevo recibo</button>
              </div>
            </section>
            <section className="stats-grid">
              <div className="stat-card accent-card"><div className="stat-head"><span>INGRESOS DEL MES</span><i>↗</i></div><strong>{money(incomeThisMonth)}</strong><small><b className="dark">{incomeThisMonthList.length} recibos</b> este mes</small></div>
              <div className="stat-card"><div className="stat-head"><span>EGRESOS DEL MES</span><i className="rose-icon">↘</i></div><strong>{money(expenseThisMonth)}</strong><small><b className="dark">{expenseThisMonthList.length} egresos</b> este mes</small></div>
              <div className="stat-card"><div className="stat-head"><span>SALDO ACTUAL</span><i className="green-icon">◈</i></div><strong>{money(balance)}</strong><small><b className={balance >= 0 ? 'dark' : 'rose-text'}>{balance >= 0 ? 'Saldo positivo' : 'Saldo negativo'}</b></small></div>
            </section>
            <section className="content-grid">
              <div className="panel transactions">
                <div className="panel-head"><div><h3>Últimos movimientos</h3><p>Ingresos y egresos más recientes</p></div><button className="text-button" onClick={() => setActivePage('Ingresos')}>Ver todos <span>→</span></button></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>CÓDIGO</th><th>TIPO</th><th>DETALLE</th><th>FECHA</th><th>MONTO</th><th>ESTADO</th></tr></thead>
                    <tbody>
                      {movements.slice(0, 6).map((m) => (
                        <tr key={`${m.type}-${m.id}`}>
                          <td>{m.code}</td>
                          <td><span className={m.type === 'Ingreso' ? 'status' : 'status void'}>{m.type}</span></td>
                          <td className="person-cell"><span className="tiny-avatar"><PersonIcon size={10} /></span><span>{m.label}<span className="method">{m.concept}</span></span></td>
                          <td>{formatDate(m.date)}</td>
                          <td>{money(m.amount)}</td>
                          <td><span className={m.status === 'Aplicado' ? 'status' : 'status void'}>{m.status}</span></td>
                        </tr>
                      ))}
                      {movements.length === 0 && <tr><td className="empty-cell" colSpan={6}>No hay movimientos en las fechas elegidas.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="panel events">
                <div className="panel-head"><div><h3>Eventos y conceptos</h3><p>Sugerencias usadas al emitir recibos</p></div><button className="text-button" onClick={() => setActivePage('Eventos')}>Gestionar <span>→</span></button></div>
                {eventStats.length === 0 && <p className="empty-hint">Aún no hay eventos registrados.</p>}
                {eventStats.map((stat) => (
                  <div className="event-item" key={stat.name}>
                    <div className="event-date"><b>{stat.count}</b><span>recibos</span></div>
                    <div><strong>{stat.name}</strong><small>{money(stat.total)} recaudados</small></div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activePage === 'Ingresos' && (
          <section className="panel transactions">
            <div className="panel-head"><div><h3>Ingresos</h3><p>Todos los recibos emitidos</p></div><button className="primary-button" onClick={() => setShowIncomeModal(true)}><span>＋</span> Nuevo recibo</button></div>
            <div className="filters"><div className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, carnet, teléfono, concepto o recibo..." /></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>RECIBO</th><th>CLIENTE</th><th>CARNET</th><th>TELÉFONO</th><th>CONCEPTO</th><th>FECHA</th><th>MONTO</th><th>REGISTRADO POR</th><th>ESTADO</th><th></th></tr></thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td><button className="receipt-link" onClick={() => { setSelectedReceipt(payment); setShowReceipt(true) }}>{payment.receipt}</button></td>
                      <td className="person-cell"><span className="tiny-avatar"><PersonIcon size={10} /></span>{payment.person}</td>
                      <td>{payment.carnet || '—'}</td>
                      <td>{payment.phone || '—'}</td>
                      <td>{payment.concept}</td>
                      <td>{formatDate(payment.date)}</td>
                      <td>{money(payment.amount)}<span className="method">Efectivo {money(payment.cash)} · QR {money(payment.qr)}</span></td>
                      <td>{payment.issuedBy || '—'}</td>
                      <td><span className={payment.status === 'Aplicado' ? 'status' : 'status void'}>{payment.status}</span></td>
                      <td>{canManage(payment.issuedBy) ? <button className="status-toggle" onClick={() => toggleIncomeStatus(payment.id)}>{payment.status === 'Aplicado' ? 'Anular' : 'Reactivar'}</button> : <span className="owner-lock">Solo {payment.issuedBy}</span>}</td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && <tr><td className="empty-cell" colSpan={10}>No hay recibos que coincidan con la búsqueda y las fechas elegidas.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activePage === 'Egresos' && (
          <section className="panel transactions">
            <div className="panel-head"><div><h3>Egresos</h3><p>Todos los pagos y gastos registrados</p></div><button className="primary-button" onClick={() => setShowExpenseModal(true)}><span>＋</span> Nuevo egreso</button></div>
            <div className="filters"><div className="search"><span>⌕</span><input value={expenseQuery} onChange={(event) => setExpenseQuery(event.target.value)} placeholder="Buscar por destinatario, categoría o comprobante..." /></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>COMPROBANTE</th><th>DESTINATARIO</th><th>CONCEPTO</th><th>CATEGORÍA</th><th>FECHA</th><th>MONTO</th><th>REGISTRADO POR</th><th>ESTADO</th><th></th></tr></thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td><button className="receipt-link" onClick={() => { setSelectedVoucher(expense); setShowVoucher(true) }}>{expense.voucher}</button></td>
                      <td className="person-cell"><span className="tiny-avatar"><PersonIcon size={10} /></span>{expense.recipient}</td>
                      <td>{expense.concept}</td>
                      <td>{expense.category}</td>
                      <td>{formatDate(expense.date)}</td>
                      <td>{money(expense.amount)}<span className="method">Efectivo {money(expense.cash)} · QR {money(expense.qr)}</span></td>
                      <td>{expense.issuedBy || '—'}</td>
                      <td><span className={expense.status === 'Aplicado' ? 'status' : 'status void'}>{expense.status}</span></td>
                      <td>{canManage(expense.issuedBy) ? <button className="status-toggle" onClick={() => toggleExpenseStatus(expense.id)}>{expense.status === 'Aplicado' ? 'Anular' : 'Reactivar'}</button> : <span className="owner-lock">Solo {expense.issuedBy}</span>}</td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && <tr><td className="empty-cell" colSpan={9}>No hay egresos que coincidan con la búsqueda y las fechas elegidas.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activePage === 'Eventos' && (
          <section className="panel">
            <div className="panel-head"><div><h3>Eventos y conceptos</h3><p>Estas sugerencias aparecen al registrar un ingreso; el campo de concepto siempre acepta texto libre.{loggedUser !== eventManager && ' Solo Ovet Zúñiga puede crear, editar el precio o quitar eventos.'}</p></div></div>
            {loggedUser === eventManager && (
              <div className="inline-form">
                <label>Nuevo evento o concepto<input value={newEventName} onChange={(event) => setNewEventName(event.target.value)} placeholder="Ej. Retiro de varones 2025" /></label>
                <button className="primary-button" onClick={addEventOption}>Agregar</button>
              </div>
            )}
            <div className="event-detail-list">
              {eventStats.map((stat) => (
                <div className="event-detail-card" key={stat.name}>
                  <div className="event-detail-head">
                    <div><strong>{stat.name}</strong><small>{stat.count} recibos · {money(stat.total)} recaudados</small></div>
                    {loggedUser === eventManager ? (
                      <>
                        <label className="price-field">Precio del evento (Bs)<input type="number" value={stat.price || ''} onChange={(event) => setEventPrice(stat.name, event.target.value)} placeholder="0.00" /></label>
                        <button onClick={() => removeEventOption(stat.name)} aria-label={`Quitar ${stat.name}`}>×</button>
                      </>
                    ) : (
                      <span className="price-field">Precio del evento<strong>{stat.price ? money(stat.price) : 'Sin definir'}</strong></span>
                    )}
                  </div>
                  {stat.price > 0 && (
                    <div className="event-progress-stats">
                      <span className="progress-pill complete">Pagaron el total: <b>{stat.completo}</b></span>
                      <span className="progress-pill half">Más de la mitad: <b>{stat.mitad}</b></span>
                      <span className="progress-pill low">Menos de la mitad: <b>{stat.menosMitad}</b></span>
                    </div>
                  )}
                  {stat.price === 0 && stat.payers.length > 0 && <p className="empty-hint">Define un precio para ver cuántos ya cancelaron el total.</p>}
                </div>
              ))}
            </div>
            <div className="panel-head"><div><h3>Buscar cliente en eventos</h3><p>Encuentra a alguien por nombre, carnet o teléfono y revisa cuánto pagó y cuánto debe</p></div></div>
            <div className="filters"><div className="search"><span>⌕</span><input value={eventPeopleQuery} onChange={(event) => setEventPeopleQuery(event.target.value)} placeholder="Buscar por nombre, carnet o teléfono..." /></div></div>
            {eventPeopleQuery.trim() && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>CLIENTE</th><th>CARNET</th><th>TELÉFONO</th><th>EVENTO</th><th>PAGADO</th><th>PRECIO</th><th>DEBE</th><th>ESTADO</th></tr></thead>
                  <tbody>
                    {eventStats.flatMap((stat) => stat.payers
                      .filter((entry) => `${entry.person} ${entry.carnet} ${entry.phone}`.toLowerCase().includes(eventPeopleQuery.toLowerCase()))
                      .map((entry) => {
                        const standing = standingOf(entry.paid, stat.price)
                        const remaining = Math.max(stat.price - entry.paid, 0)
                        return (
                          <tr key={`${stat.name}-${entry.person}`}>
                            <td className="person-cell"><span className="tiny-avatar"><PersonIcon size={10} /></span>{entry.person}</td>
                            <td>{entry.carnet || '—'}</td>
                            <td>{entry.phone || '—'}</td>
                            <td>{stat.name}</td>
                            <td>{money(entry.paid)}</td>
                            <td>{stat.price ? money(stat.price) : 'Sin definir'}</td>
                            <td>{stat.price ? money(remaining) : '—'}</td>
                            <td><span className={`status ${standing === 'menos-mitad' ? 'void' : ''}`}>{standing === 'completo' ? 'Completo' : standing === 'mitad' ? 'Más de la mitad' : standing === 'menos-mitad' ? 'Menos de la mitad' : 'Sin precio'}</span></td>
                          </tr>
                        )
                      }))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activePage === 'Clientes' && (
          <section className="panel">
            <div className="panel-head"><div><h3>Directorio de clientes</h3><p>Clientes registrados, cuánto han pagado y cuánto deben por evento. Puedes editar su ficha o quitarlos del directorio.</p></div></div>
            <div className="inline-form">
              <label>Nombre<input value={personForm.name} onChange={(event) => setPersonForm({ ...personForm, name: event.target.value })} placeholder="Nombre completo" /></label>
              <label>N.º de carnet<input value={personForm.carnet} onChange={(event) => setPersonForm({ ...personForm, carnet: event.target.value })} placeholder="Ej. 7845123" /></label>
              <label>Teléfono<input value={personForm.phone} onChange={(event) => setPersonForm({ ...personForm, phone: event.target.value })} placeholder="Opcional" /></label>
              <label>Notas<input value={personForm.notes} onChange={(event) => setPersonForm({ ...personForm, notes: event.target.value })} placeholder="Opcional" /></label>
              <button className="primary-button" onClick={addPerson}>Agregar cliente</button>
            </div>
            <div className="filters"><div className="search"><span>⌕</span><input value={peopleQuery} onChange={(event) => setPeopleQuery(event.target.value)} placeholder="Buscar por nombre, carnet o teléfono..." /></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>NOMBRE</th><th>CARNET</th><th>TELÉFONO</th><th>TOTAL PAGADO</th><th>TOTAL ADEUDADO</th><th>DETALLE POR EVENTO</th><th>ACCIONES</th></tr></thead>
                <tbody>
                  {filteredPeople.map((person) => (
                    <tr key={person.id}>
                      <td className="person-cell"><span className="tiny-avatar"><PersonIcon size={10} /></span><span>{person.name}{person.notes && <span className="method">{person.notes}</span>}</span></td>
                      <td>{person.carnet || '—'}</td>
                      <td>{person.phone || '—'}</td>
                      <td>{money(person.total)}<span className="method">{person.count} recibos</span></td>
                      <td>{person.totalDue > 0 ? <b className="rose-text">{money(person.totalDue)}</b> : <span className="status">Al día</span>}</td>
                      <td>{person.events.length === 0 ? '—' : <div className="event-mini-list">{person.events.map((ev) => <span key={ev.event} className={`status ${ev.standing === 'menos-mitad' ? 'void' : ''}`}>{ev.event}: {ev.price ? `${money(ev.paid)} / ${money(ev.price)}` : money(ev.paid)}</span>)}</div>}</td>
                      <td><div className="row-actions">
                        <button className="status-toggle" onClick={() => startEditPerson(person)}>Editar</button>
                        <button className="status-toggle danger" onClick={() => askRemovePerson(person)}>Eliminar</button>
                      </div></td>
                    </tr>
                  ))}
                  {filteredPeople.length === 0 && <tr><td className="empty-cell" colSpan={7}>{people.length === 0 ? 'Aún no hay clientes en el directorio. Agrega el primero con el formulario de arriba o desde las sugerencias de abajo.' : 'Ningún cliente coincide con la búsqueda.'}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-note">Eliminar un cliente solo lo quita del directorio: sus recibos siguen guardados en Ingresos y, si vuelve a pagar, puedes registrarlo otra vez desde las sugerencias de abajo.</div>
            {undirectoried.length > 0 && (
              <div className="chip-list">
                {undirectoried.map((entry) => (
                  <div className="chip" key={entry.name}>
                    <div><strong>{entry.name}</strong><small>{[entry.carnet && `Carnet ${entry.carnet}`, entry.phone && `Tel. ${entry.phone}`].filter(Boolean).join(' · ')}{(entry.carnet || entry.phone) ? ' · ' : ''}Ya tiene recibos, aún no está en el directorio</small></div>
                    <button onClick={() => registerPayer(entry.name, entry.carnet, entry.phone)} aria-label={`Agregar ${entry.name}`}>＋</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activePage === 'Reportes' && (
          <>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Descargar reporte en PDF</h3>
                  <p>Filtra por fecha, tipo, cliente, evento o monto. El PDF incluye todos los movimientos que coincidan.</p>
                </div>
              </div>

              <div className="inline-form">
                <label>Desde
                  <input type="date" value={pdfStartDate} onChange={(e) => setPdfStartDate(e.target.value)} />
                </label>
                <label>Hasta
                  <input type="date" value={pdfEndDate} onChange={(e) => setPdfEndDate(e.target.value)} />
                </label>
                <label>Tipo
                  <select value={pdfTipo} onChange={(e) => setPdfTipo(e.target.value as 'todos' | 'ingresos' | 'egresos')}>
                    <option value="todos">Todos</option>
                    <option value="ingresos">Solo ingresos</option>
                    <option value="egresos">Solo egresos</option>
                  </select>
                </label>
                <label>Cliente / Destinatario
                  <input value={pdfPersona} onChange={(e) => setPdfPersona(e.target.value)} placeholder="Nombre..." />
                </label>
                <label>Evento / Concepto
                  <input value={pdfConcepto} onChange={(e) => setPdfConcepto(e.target.value)} placeholder="Ej. Campamento..." />
                </label>
                <label>Monto mínimo
                  <input type="number" value={pdfMontoMin} onChange={(e) => setPdfMontoMin(e.target.value)} placeholder="0" />
                </label>
                <label>Monto máximo
                  <input type="number" value={pdfMontoMax} onChange={(e) => setPdfMontoMax(e.target.value)} placeholder="0" />
                </label>
              </div>

              <div className="payment-note">
                {pdfData.length} movimientos encontrados · 
                Ingresos: <b>{money(pdfData.filter((d) => d.tipo === 'Ingreso').reduce((s, d) => s + d.monto, 0))}</b> · 
                Egresos: <b>{money(pdfData.filter((d) => d.tipo === 'Egreso').reduce((s, d) => s + d.monto, 0))}</b>
              </div>

              <div className="inline-form">
                <button
                  className="primary-button"
                  onClick={descargarReportePDF}
                  disabled={pdfData.length === 0}
                >
                  Descargar PDF ({pdfData.length} movimientos) <span>↓</span>
                </button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th><th>Código</th><th>Fecha</th><th>Persona</th>
                      <th>Concepto</th><th>Monto</th><th>Registrado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdfData.slice(0, 50).map((d, i) => (
                      <tr key={`${d.codigo}-${i}`}>
                        <td><span className={d.tipo === 'Ingreso' ? 'status' : 'status void'}>{d.tipo}</span></td>
                        <td>{d.codigo}</td>
                        <td>{formatDate(d.fecha)}</td>
                        <td>{d.persona}</td>
                        <td>{d.concepto}</td>
                        <td>{money(d.monto)}</td>
                        <td>{d.registradoPor}</td>
                      </tr>
                    ))}
                    {pdfData.length === 0 && (
                      <tr><td className="empty-cell" colSpan={7}>No hay movimientos con esos filtros.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {pdfData.length > 50 && (
                <div className="table-note">Mostrando 50 de {pdfData.length}. El PDF incluye todos.</div>
              )}
            </section>
            <section className="stats-grid">
              <div className="stat-card accent-card"><div className="stat-head"><span>TOTAL INGRESOS</span><i>↗</i></div><strong>{money(totalIncome)}</strong><small>Efectivo {money(activeIncome.reduce((s, p) => s + p.cash, 0))} · QR {money(activeIncome.reduce((s, p) => s + p.qr, 0))}</small></div>
              <div className="stat-card"><div className="stat-head"><span>TOTAL EGRESOS</span><i className="rose-icon">↘</i></div><strong>{money(totalExpense)}</strong><small>Efectivo {money(activeExpenses.reduce((s, e) => s + e.cash, 0))} · QR {money(activeExpenses.reduce((s, e) => s + e.qr, 0))}</small></div>
              <div className="stat-card"><div className="stat-head"><span>SALDO GENERAL</span><i className="green-icon">◈</i></div><strong>{money(balance)}</strong><small>Desde el inicio del registro</small></div>
            </section>
            <section className="panel">
              <div className="panel-head"><div><h3>Mi firma en los comprobantes</h3><p>Este nombre y apellido aparece como ADMINISTRADOR en la firma de los recibos y comprobantes que emites</p></div></div>
              <div className="inline-form">
                <label>Nombre y apellido de {loggedUser}<input value={fullNameDraft} onChange={(event) => setFullNameDraft(event.target.value)} placeholder="Ej. Melitza Quispe" /></label>
                <button className="primary-button" onClick={saveFullName}>Guardar nombre</button>
              </div>
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
          </>
        )}

        <footer className="verse-strip"><span className="verse-mark">✦</span><p>"Se requiere que el administrador, sea hallado fiel" — <b>1 Corintios 4:2</b></p></footer>
      </main>

      {showIncomeModal && (
        <div className="modal-backdrop" onClick={() => setShowIncomeModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-title">
              <div><span className="eyebrow">NUEVO MOVIMIENTO</span><h2>Emitir recibo</h2></div>
              <button className="close-button" onClick={() => setShowIncomeModal(false)}>×</button>
            </div>

            <label>Nombre de la persona<input list="client-name-suggestions" value={incomeForm.person} onChange={(event) => fillIncomeField('person', event.target.value)} placeholder="Ej. Ana Lopez" /><datalist id="client-name-suggestions">{suggestionsFor(incomeForm.person, people.map((person) => person.name)).map((name) => <option value={name} key={name} />)}</datalist></label>
            <label>N.º de carnet<input list="client-carnet-suggestions" value={incomeForm.carnet} onChange={(event) => fillIncomeField('carnet', event.target.value)} placeholder="Ej. 7845123" /><datalist id="client-carnet-suggestions">{suggestionsFor(incomeForm.carnet, people.filter((person) => person.carnet).map((person) => person.carnet)).map((carnet) => <option value={carnet} key={carnet} />)}</datalist></label>
            <label>Teléfono<input list="client-phone-suggestions" value={incomeForm.phone} onChange={(event) => fillIncomeField('phone', event.target.value)} placeholder="Ej. 71234567" /><datalist id="client-phone-suggestions">{suggestionsFor(incomeForm.phone, people.filter((person) => person.phone).map((person) => person.phone)).map((phone) => <option value={phone} key={phone} />)}</datalist></label>

            {incomeLookup && (
              <div className="lookup-card">
                <div className="lookup-head"><strong>{incomeLookup.name}</strong>{incomeLookup.carnet && <span>Carnet {incomeLookup.carnet}</span>}{incomeLookup.phone && <span>Tel. {incomeLookup.phone}</span>}</div>
                <div className="lookup-stats">
                  <span>Pagado: <b>{money(incomeLookup.total)}</b></span>
                  <span>Veces que pagó: <b>{incomeLookup.count}</b></span>
                  <span>Debe: <b className={incomeLookup.totalDue > 0 ? 'rose-text' : ''}>{incomeLookup.totalDue > 0 ? money(incomeLookup.totalDue) : 'Al día'}</b></span>
                </div>
                {incomeLookup.events.length > 0 && <div className="event-mini-list">{incomeLookup.events.map((ev) => <span key={ev.event} className={`status ${ev.standing === 'menos-mitad' ? 'void' : ''}`}>{ev.event}: {ev.price ? `${money(ev.paid)} / ${money(ev.price)}` : money(ev.paid)}</span>)}</div>}
                {incomeLookup.receipts.length > 0 && (
                  <div className="lookup-receipts">
                    <small>Comprobantes registrados:</small>
                    {incomeLookup.receipts.map((r) => <button key={r.id} className="receipt-link" onClick={() => { setSelectedReceipt(r); setShowReceipt(true) }}>{r.receipt} · {money(r.amount)}</button>)}
                  </div>
                )}
              </div>
            )}

            <label>Evento o concepto<input list="event-suggestions" value={incomeForm.concept} onChange={(event) => setIncomeForm({ ...incomeForm, concept: event.target.value })} placeholder="Escribe libremente o elige una sugerencia" /><datalist id="event-suggestions">{suggestionsFor(incomeForm.concept, eventOptions).map((option) => <option value={option} key={option} />)}</datalist></label>

            <label>Notas o Detalles (Opcional)
              <textarea
                value={incomeForm.notes}
                onChange={(event) => setIncomeForm({ ...incomeForm, notes: event.target.value })}
                placeholder="Ej: Pago parcial acordado, observaciones, detalles adicionales..."
                rows={3}
              />
            </label>

            <div className="form-row"><label>Efectivo (Bs)<input type="number" value={incomeForm.cash} onChange={(event) => setIncomeForm({ ...incomeForm, cash: event.target.value })} placeholder="0.00" /></label><label>QR (Bs)<input type="number" value={incomeForm.qr} onChange={(event) => setIncomeForm({ ...incomeForm, qr: event.target.value })} placeholder="0.00" /></label></div>
            <div className="payment-note">Puedes combinar efectivo y QR en un mismo recibo. El concepto es libre; las sugerencias solo ayudan a escribir más rápido.</div>
            <button className="primary-button full" onClick={saveIncome}>Guardar y emitir recibo <span>→</span></button>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="modal-backdrop" onClick={() => setShowExpenseModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-title"><div><span className="eyebrow">NUEVO MOVIMIENTO</span><h2>Registrar egreso</h2></div><button className="close-button" onClick={() => setShowExpenseModal(false)}>×</button></div>
            <label>Pagado a<input value={expenseForm.recipient} onChange={(event) => setExpenseForm({ ...expenseForm, recipient: event.target.value })} placeholder="Ej. Ferretería Central" /></label>
            <label>Concepto<input value={expenseForm.concept} onChange={(event) => setExpenseForm({ ...expenseForm, concept: event.target.value })} placeholder="Ej. Materiales para campamento" /></label>
            <label>Categoría<input list="category-suggestions" value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} placeholder="Escribe libremente o elige una sugerencia" /><datalist id="category-suggestions">{suggestionsFor(expenseForm.category, categoryOptions).map((option) => <option value={option} key={option} />)}</datalist></label>
            <div className="form-row"><label>Efectivo (Bs)<input type="number" value={expenseForm.cash} onChange={(event) => setExpenseForm({ ...expenseForm, cash: event.target.value })} placeholder="0.00" /></label><label>QR (Bs)<input type="number" value={expenseForm.qr} onChange={(event) => setExpenseForm({ ...expenseForm, qr: event.target.value })} placeholder="0.00" /></label></div>
            <div className="payment-note">Puedes combinar efectivo y QR en un mismo egreso. La categoría es libre; las sugerencias solo ayudan a escribir más rápido.</div>
            <button className="primary-button full" onClick={saveExpense}>Guardar y emitir comprobante <span>→</span></button>
          </div>
        </div>
      )}

      {editingPersonId && (
        <div className="modal-backdrop" onClick={closeEditPerson}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-title"><div><span className="eyebrow">EDITAR CLIENTE</span><h2>Ficha del cliente</h2></div><button className="close-button" onClick={closeEditPerson}>×</button></div>
            <label>Nombre<input value={personEditForm.name} onChange={(event) => setPersonEditForm({ ...personEditForm, name: event.target.value })} placeholder="Nombre completo" /></label>
            <label>N.º de carnet<input value={personEditForm.carnet} onChange={(event) => setPersonEditForm({ ...personEditForm, carnet: event.target.value })} placeholder="Ej. 7845123" /></label>
            <label>Teléfono<input value={personEditForm.phone} onChange={(event) => setPersonEditForm({ ...personEditForm, phone: event.target.value })} placeholder="Opcional" /></label>
            <label>Notas<input value={personEditForm.notes} onChange={(event) => setPersonEditForm({ ...personEditForm, notes: event.target.value })} placeholder="Opcional" /></label>
            {personMessage && <div className="form-message">{personMessage}</div>}
            <div className="payment-note">Si corriges el nombre, los recibos ya emitidos a este cliente se actualizan para que su historial y sus totales se mantengan. Si el nuevo nombre ya tiene recibos propios, se unirán en un solo historial. También se completan el carnet y el teléfono en los recibos que estaban sin esos datos.</div>
            <button className="primary-button full" onClick={savePersonEdit}>Guardar cambios <span>→</span></button>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="modal-backdrop" onClick={() => setPendingDelete(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-title"><div><span className="eyebrow">ELIMINAR CLIENTE</span><h2>¿Quitar a {pendingDelete.name}?</h2></div><button className="close-button" onClick={() => setPendingDelete(null)}>×</button></div>
            {pendingDeleteRecord && (
              <div className="lookup-card">
                <div className="lookup-head"><strong>{pendingDeleteRecord.name}</strong>{pendingDeleteRecord.carnet && <span>Carnet {pendingDeleteRecord.carnet}</span>}{pendingDeleteRecord.phone && <span>Tel. {pendingDeleteRecord.phone}</span>}</div>
                <div className="lookup-stats">
                  <span>Recibos: <b>{pendingDeleteRecord.count}</b></span>
                  <span>Pagado: <b>{money(pendingDeleteRecord.total)}</b></span>
                  <span>Deuda: <b className={pendingDeleteRecord.totalDue > 0 ? 'rose-text' : ''}>{pendingDeleteRecord.totalDue > 0 ? money(pendingDeleteRecord.totalDue) : 'Al día'}</b></span>
                </div>
              </div>
            )}
            <div className="payment-note">Se quita solo del directorio de clientes: sus recibos quedan guardados en Ingresos, así que el historial y las cuentas no cambian. Si vuelve a pagar, puedes agregarlo otra vez desde las sugerencias de la página Clientes.</div>
            <div className="modal-actions-row">
              <button className="outline-button full" onClick={() => setPendingDelete(null)}>Cancelar</button>
              <button className="danger-button full" onClick={confirmRemovePerson}>Eliminar del directorio</button>
            </div>
          </div>
        </div>
      )}

      {showReceipt && selectedReceipt && (
        <div className="modal-backdrop" onClick={() => setShowReceipt(false)}>
          <div className="receipt-modal" onClick={(event) => event.stopPropagation()}>
            <div className="receipt-actions"><span>Vista previa del comprobante (2 copias)</span><button className="close-button" onClick={() => setShowReceipt(false)}>×</button></div>
            <div className="receipt-print-sheet">
              {renderReceiptCopy(selectedReceipt, 'cliente', receiptPaperRef)}
              <div className="cut-line"><span>✂ Recortar aquí</span></div>
              {renderReceiptCopy(selectedReceipt, 'administración')}
            </div>
            <div className="receipt-actions-row">
              <button className="outline-button full" onClick={() => window.print()}>Imprimir las 2 copias <span>↗</span></button>
              <button className="primary-button full" disabled={sharingReceipt} onClick={() => shareAsImage(receiptPaperRef.current, `${selectedReceipt.receipt}.png`, `Recibo ${selectedReceipt.receipt} - ${selectedReceipt.person} - ${money(selectedReceipt.amount)}`)}>{sharingReceipt ? 'Generando imagen…' : 'Enviar por WhatsApp'} <span>↗</span></button>
            </div>
          </div>
        </div>
      )}

      {showVoucher && selectedVoucher && (
        <div className="modal-backdrop" onClick={() => setShowVoucher(false)}>
          <div className="receipt-modal" onClick={(event) => event.stopPropagation()}>
            <div className="receipt-actions"><span>Vista previa del comprobante (2 copias)</span><button className="close-button" onClick={() => setShowVoucher(false)}>×</button></div>
            <div className="receipt-print-sheet">
              {renderVoucherCopy(selectedVoucher, 'beneficiario', voucherPaperRef)}
              <div className="cut-line"><span>✂ Recortar aquí</span></div>
              {renderVoucherCopy(selectedVoucher, 'administración')}
            </div>
            <div className="receipt-actions-row">
              <button className="outline-button full" onClick={() => window.print()}>Imprimir las 2 copias <span>↗</span></button>
              <button className="primary-button full" disabled={sharingReceipt} onClick={() => shareAsImage(voucherPaperRef.current, `${selectedVoucher.voucher}.png`, `Comprobante ${selectedVoucher.voucher} - ${selectedVoucher.recipient} - ${money(selectedVoucher.amount)}`)}>{sharingReceipt ? 'Generando imagen…' : 'Enviar por WhatsApp'} <span>↗</span></button>
            </div>
          </div>
        </div>
      )}

      {showUserManagement && isPrimaryAdmin && currentUser && (
        <UserManagement
          accounts={accounts}
          currentUserId={currentUser.id}
          onChange={setAccounts}
          onClose={() => setShowUserManagement(false)}
        />
      )}
    </div>
  )
}

export default App