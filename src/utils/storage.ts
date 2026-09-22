// src/utils/storage.ts
import type { Account, Permission } from '../types'
import { PERMISSION_GROUPS } from '../types'

const accountsKey = 'sec-car-accounts-v2'
export const ADMIN_KEY = import.meta.env.VITE_ADMIN_RESET_KEY || 'SEC-CAR-ADMIN'

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// MIGRACIÓN DE PERMISOS VIEJOS → NUEVOS
// ============================================================
const PERMISSION_MIGRATION: Record<string, Permission[]> = {
  view_records:    ['ingresos_ver', 'egresos_ver', 'clientes_ver', 'eventos_ver', 'reportes_ver'],
  create_records:  ['ingresos_crear', 'egresos_crear', 'clientes_crear'],
  edit_records:    ['clientes_editar', 'eventos_editar', 'firma_editar'],
  delete_records:  ['ingresos_anular', 'egresos_anular', 'clientes_eliminar', 'eventos_eliminar', 'reportes_limpiar'],
  export_data:     ['reportes_exportar'],
  capture_screen:  ['ingresos_imprimir'],
}

// Lista plana con todos los permisos nuevos válidos
const ALL_NEW_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap(
  (group) => group.permissions.map((p) => p.id)
)

/**
 * Migra los permisos viejos (view_records, etc.) a los nuevos (ingresos_ver, etc.).
 * Si una cuenta es admin, se le asignan TODOS los permisos.
 * Si una cuenta ya tiene permisos nuevos, se respetan y se añaden los migrados.
 */
export function migratePermissions(accounts: Account[]): Account[] {
  return accounts.map((account) => {
    // Admin siempre tiene TODOS los permisos
    if (account.role === 'admin') {
      return { ...account, permissions: [...ALL_NEW_PERMISSIONS] }
    }

    // Verificar si ya tiene permisos nuevos (contiene "_" más específico)
    const tieneNuevos = account.permissions.some((p) =>
      ALL_NEW_PERMISSIONS.includes(p as Permission)
    )

    // Si ya está migrado, no hacer nada
    if (tieneNuevos && !account.permissions.some((p) => p in PERMISSION_MIGRATION)) {
      return account
    }

    // Migrar permisos viejos a nuevos
    const newPerms = new Set<Permission>()
    account.permissions.forEach((oldPerm) => {
      // Si ya es un permiso nuevo, conservarlo
      if (ALL_NEW_PERMISSIONS.includes(oldPerm as Permission)) {
        newPerms.add(oldPerm as Permission)
        return
      }
      // Si es viejo, mapearlo
      const mapped = PERMISSION_MIGRATION[oldPerm as string]
      if (mapped) mapped.forEach((p) => newPerms.add(p))
    })

    return { ...account, permissions: Array.from(newPerms) }
  })
}

// ============================================================
// CARGA / GUARDADO
// ============================================================
export function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(accountsKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Account[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAccounts(accounts: Account[]): void {
  localStorage.setItem(accountsKey, JSON.stringify(accounts))
}

// ============================================================
// SEED INICIAL (solo si no existe ningún usuario)
// ============================================================
export function seedIfEmpty(accounts: Account[]): Account[] {
  if (accounts.length > 0) return accounts

  const now = Date.now()
  const allPerms: Permission[] = ALL_NEW_PERMISSIONS

  return [
    {
      id: uid(),
      name: 'Ovet Zúñiga',
      username: 'ovet',
      password: '1234',
      needsPassword: true,
      fullName: 'Ovet Zúñiga',
      role: 'admin',
      permissions: allPerms,
      active: true,
      createdAt: now,
    },
    {
      id: uid(),
      name: 'Melitza Huanca',
      username: 'melitza',
      password: '1234',
      needsPassword: true,
      fullName: 'Melitza Huanca',
      role: 'user',
      permissions: [
        'ingresos_ver',
        'ingresos_crear',
        'clientes_ver',
        'eventos_ver',
        'reportes_ver',
      ],
      active: true,
      createdAt: now,
    },
  ]
}