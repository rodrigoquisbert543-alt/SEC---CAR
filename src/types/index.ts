// src/types/index.ts

export type Permission =
  | 'view_records'
  | 'create_records'
  | 'edit_records'
  | 'delete_records'
  | 'export_data'
  | 'capture_screen'

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

export const ALL_PERMISSIONS: { id: Permission; label: string; description: string }[] = [
  { id: 'view_records',   label: 'Ver registros',     description: 'Puede consultar los registros existentes' },
  { id: 'create_records', label: 'Crear registros',   description: 'Puede agregar nuevos registros' },
  { id: 'edit_records',   label: 'Editar registros',  description: 'Puede modificar registros existentes' },
  { id: 'delete_records', label: 'Eliminar registros',description: 'Puede borrar registros' },
  { id: 'export_data',    label: 'Exportar datos',    description: 'Puede exportar a CSV/PDF' },
  { id: 'capture_screen', label: 'Capturar pantalla', description: 'Puede tomar capturas de la app' },
]