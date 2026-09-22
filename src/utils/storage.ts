// src/utils/storage.ts
import type { Account } from '../types'

const accountsKey = 'sec-car-accounts-v2'
export const ADMIN_KEY = import.meta.env.VITE_ADMIN_RESET_KEY || 'SEC-CAR-ADMIN'

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

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

/**
 * Crea los dos usuarios iniciales la primera vez que se abre la app.
 * Ovet Zúñiga es el ADMINISTRADOR principal.
 * Melitza Huanca es usuario normal.
 */
export function seedIfEmpty(accounts: Account[]): Account[] {
  if (accounts.length > 0) return accounts
  const now = Date.now()
  return [
    {
      id: uid(),
      name: 'Ovet Zúñiga',
      username: 'ovet',
      password: '1234',
      needsPassword: true,
      fullName: 'Ovet Zúñiga',
      role: 'admin',
      permissions: [
        'view_records',
        'create_records',
        'edit_records',
        'delete_records',
        'export_data',
        'capture_screen',
      ],
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
      permissions: ['view_records', 'create_records'],
      active: true,
      createdAt: now,
    },
  ]
}