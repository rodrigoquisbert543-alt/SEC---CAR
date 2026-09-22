// src/types/index.ts

// ============================================================
// PERMISOS GRANULARES DE SEC-CAR
// ============================================================
export type Permission =
  // === INGRESOS ===
  | 'ingresos_ver'
  | 'ingresos_crear'
  | 'ingresos_anular'
  | 'ingresos_imprimir'

  // === EGRESOS ===
  | 'egresos_ver'
  | 'egresos_crear'
  | 'egresos_anular'

  // === CLIENTES ===
  | 'clientes_ver'
  | 'clientes_crear'
  | 'clientes_editar'
  | 'clientes_eliminar'

  // === EVENTOS ===
  | 'eventos_ver'
  | 'eventos_crear'
  | 'eventos_editar'
  | 'eventos_eliminar'

  // === REPORTES ===
  | 'reportes_ver'
  | 'reportes_exportar'
  | 'reportes_limpiar'

  // === ADMINISTRACIÓN ===
  | 'usuarios_gestionar'
  | 'firma_editar'

export type Role = 'admin' | 'user'

export type Account = {
  id: string
  name: string
  username: string
  password: string
  needsPassword: boolean
  fullName: string
  role: Role
  permissions: Permission[]
  active: boolean
  createdAt: number
}

// ============================================================
// CATÁLOGO DE PERMISOS AGRUPADOS
// ============================================================
export type PermissionCategory =
  | 'ingresos'
  | 'egresos'
  | 'clientes'
  | 'eventos'
  | 'reportes'
  | 'administracion'

export interface PermissionItem {
  id: Permission
  label: string
  description: string
  danger?: boolean
}

export interface PermissionGroup {
  category: PermissionCategory
  label: string
  description: string
  icon: string
  permissions: PermissionItem[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    category: 'ingresos',
    label: 'Ingresos',
    description: 'Recibos de pago emitidos a clientes',
    icon: '↗',
    permissions: [
      { id: 'ingresos_ver',      label: 'Ver recibos',         description: 'Consultar el historial completo de ingresos' },
      { id: 'ingresos_crear',    label: 'Emitir recibos',      description: 'Registrar nuevos pagos y generar comprobantes' },
      { id: 'ingresos_anular',   label: 'Anular recibos',      description: 'Marcar recibos como anulados o reactivarlos', danger: true },
      { id: 'ingresos_imprimir', label: 'Imprimir / Enviar',   description: 'Imprimir comprobantes o enviarlos por WhatsApp' },
    ],
  },
  {
    category: 'egresos',
    label: 'Egresos',
    description: 'Pagos y gastos del centro',
    icon: '↘',
    permissions: [
      { id: 'egresos_ver',    label: 'Ver egresos',       description: 'Consultar el historial de gastos' },
      { id: 'egresos_crear',  label: 'Registrar egresos', description: 'Anotar nuevos pagos y gastos' },
      { id: 'egresos_anular', label: 'Anular egresos',    description: 'Marcar egresos como anulados o reactivarlos', danger: true },
    ],
  },
  {
    category: 'clientes',
    label: 'Clientes',
    description: 'Directorio de personas registradas',
    icon: '♙',
    permissions: [
      { id: 'clientes_ver',      label: 'Ver clientes',      description: 'Consultar el directorio y sus totales' },
      { id: 'clientes_crear',    label: 'Agregar clientes',  description: 'Registrar nuevas personas en el directorio' },
      { id: 'clientes_editar',   label: 'Editar clientes',   description: 'Modificar nombre, carnet, teléfono y notas' },
      { id: 'clientes_eliminar', label: 'Eliminar clientes', description: 'Quitar personas del directorio', danger: true },
    ],
  },
  {
    category: 'eventos',
    label: 'Eventos y conceptos',
    description: 'Retiros, campamentos y categorías',
    icon: '◷',
    permissions: [
      { id: 'eventos_ver',      label: 'Ver eventos',       description: 'Consultar eventos y estadísticas de pago' },
      { id: 'eventos_crear',    label: 'Crear eventos',     description: 'Añadir nuevos eventos o conceptos' },
      { id: 'eventos_editar',   label: 'Editar precios',    description: 'Definir cuánto cuesta cada evento' },
      { id: 'eventos_eliminar', label: 'Eliminar eventos',  description: 'Quitar eventos del catálogo', danger: true },
    ],
  },
  {
    category: 'reportes',
    label: 'Reportes',
    description: 'Estadísticas y respaldo de datos',
    icon: '▤',
    permissions: [
      { id: 'reportes_ver',      label: 'Ver reportes',       description: 'Consultar totales, saldos y estadísticas' },
      { id: 'reportes_exportar', label: 'Exportar datos',     description: 'Descargar el historial en CSV' },
      { id: 'reportes_limpiar',  label: 'Limpiar historial',  description: 'Vaciar todos los ingresos y egresos', danger: true },
    ],
  },
  {
    category: 'administracion',
    label: 'Administración',
    description: 'Cuentas de usuario y firma personal',
    icon: '⚙',
    permissions: [
      { id: 'usuarios_gestionar', label: 'Gestionar usuarios', description: 'Crear, editar y eliminar cuentas del sistema', danger: true },
      { id: 'firma_editar',       label: 'Editar su firma',    description: 'Cambiar el nombre que aparece en los comprobantes' },
    ],
  },
]

// Lista plana (por si la necesitas en algún lado)
export const ALL_PERMISSIONS: PermissionItem[] = PERMISSION_GROUPS.flatMap(g => g.permissions)

// Permisos por defecto para un usuario nuevo (los más básicos)
export const DEFAULT_USER_PERMISSIONS: Permission[] = [
  'ingresos_ver',
  'ingresos_crear',
  'clientes_ver',
  'eventos_ver',
  'reportes_ver',
]