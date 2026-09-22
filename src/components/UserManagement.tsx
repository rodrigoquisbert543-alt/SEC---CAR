// src/components/UserManagement.tsx
import { useState } from 'react'
import type { Account, Permission, Role } from '../types'
import { ALL_PERMISSIONS } from '../types'
import { uid } from '../utils/storage'
import './UserManagement.css'

type Props = {
  accounts: Account[]
  currentUserId: string
  onChange: (accounts: Account[]) => void
  onClose: () => void
}

export default function UserManagement({ accounts, currentUserId, onChange, onClose }: Props) {
  const [editing, setEditing] = useState<Account | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null)
  const [error, setError] = useState('')

  const createBlank = (): Account => ({
    id: uid(),
    name: '',
    username: '',
    password: '',
    role: 'user',
    permissions: ['view_records'],
    active: true,
    createdAt: Date.now(),
  })

  const handleSave = (acc: Account) => {
    setError('')
    if (!acc.name.trim() || !acc.username.trim()) {
      setError('Nombre y usuario son obligatorios')
      return
    }
    const dup = accounts.find(
      (a) => a.username.toLowerCase() === acc.username.toLowerCase() && a.id !== acc.id
    )
    if (dup) {
      setError('Ya existe un usuario con ese nombre de usuario')
      return
    }
    if (creating && !acc.password.trim()) {
      setError('La contraseña es obligatoria para un usuario nuevo')
      return
    }

    const next = creating
      ? [...accounts, acc]
      : accounts.map((a) => (a.id === acc.id ? acc : a))

    onChange(next)
    setEditing(null)
    setCreating(false)
  }

  const handleDelete = (acc: Account) => {
    if (acc.id === currentUserId) {
      setError('No puedes eliminar tu propio usuario')
      return
    }
    onChange(accounts.filter((a) => a.id !== acc.id))
    setConfirmDelete(null)
  }

  const toggleActive = (acc: Account) => {
    if (acc.id === currentUserId) {
      setError('No puedes desactivar tu propio usuario')
      return
    }
    onChange(accounts.map((a) => (a.id === acc.id ? { ...a, active: !a.active } : a)))
  }

  return (
    <div className="um-overlay">
      <div className="um-panel">
        <header className="um-header">
          <h2>Administración de usuarios</h2>
          <button className="um-close" onClick={onClose}>✕</button>
        </header>

        {error && <p className="um-error">{error}</p>}

        <div className="um-actions">
          <button
            className="um-btn-primary"
            onClick={() => { setEditing(createBlank()); setCreating(true); setError('') }}
          >
            + Nuevo usuario
          </button>
        </div>

        <table className="um-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Permisos</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} className={!acc.active ? 'um-inactive' : ''}>
                <td>{acc.name}</td>
                <td>{acc.username}</td>
                <td><span className={`um-badge um-role-${acc.role}`}>{acc.role}</span></td>
                <td>{acc.role === 'admin' ? 'Todos' : acc.permissions.length}</td>
                <td>
                  <button
                    className={`um-toggle ${acc.active ? 'on' : 'off'}`}
                    onClick={() => toggleActive(acc)}
                  >
                    {acc.active ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="um-row-actions">
                  <button onClick={() => { setEditing(acc); setCreating(false); setError('') }}>
                    Editar
                  </button>
                  <button
                    className="um-danger"
                    onClick={() => setConfirmDelete(acc)}
                    disabled={acc.id === currentUserId}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 24, opacity: 0.6 }}>
                  No hay usuarios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <UserEditor
          account={editing}
          isNew={creating}
          onCancel={() => { setEditing(null); setCreating(false) }}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <div className="um-overlay">
          <div className="um-confirm">
            <h3>¿Eliminar usuario?</h3>
            <p>Se eliminará a <strong>{confirmDelete.name}</strong>. Esta acción no se puede deshacer.</p>
            <div className="um-actions">
              <button onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="um-btn-danger" onClick={() => handleDelete(confirmDelete)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UserEditor({
  account, isNew, onSave, onCancel,
}: {
  account: Account
  isNew: boolean
  onSave: (a: Account) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Account>(account)

  const set = <K extends keyof Account>(key: K, value: Account[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const togglePermission = (perm: Permission) => {
    setDraft((d) => ({
      ...d,
      permissions: d.permissions.includes(perm)
        ? d.permissions.filter((p) => p !== perm)
        : [...d.permissions, perm],
    }))
  }

  const setRole = (role: Role) => {
    setDraft((d) => ({
      ...d,
      role,
      permissions: role === 'user' && d.permissions.length === 0 ? ['view_records'] : d.permissions,
    }))
  }

  return (
    <div className="um-overlay">
      <div className="um-editor">
        <h3>{isNew ? 'Nuevo usuario' : `Editar: ${account.name}`}</h3>

        <div className="um-field">
          <label>Nombre completo</label>
          <input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Melitza Huanca" />
        </div>

        <div className="um-field">
          <label>Nombre de usuario</label>
          <input value={draft.username} onChange={(e) => set('username', e.target.value)} placeholder="Ej. mhuanca" autoComplete="off" />
        </div>

        <div className="um-field">
          <label>{isNew ? 'Contraseña' : 'Nueva contraseña (dejar vacío para no cambiar)'}</label>
          <input type="password" value={draft.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
        </div>

        <div className="um-field">
          <label>Rol</label>
          <div className="um-radio-row">
            <label><input type="radio" checked={draft.role === 'user'} onChange={() => setRole('user')} /> Usuario</label>
            <label><input type="radio" checked={draft.role === 'admin'} onChange={() => setRole('admin')} /> Administrador</label>
          </div>
        </div>

        <div className="um-field">
          <label>Permisos</label>
          {draft.role === 'admin' ? (
            <p className="um-hint">Los administradores tienen todos los permisos.</p>
          ) : (
            <div className="um-perm-grid">
              {ALL_PERMISSIONS.map((p) => (
                <label key={p.id} className="um-perm">
                  <input
                    type="checkbox"
                    checked={draft.permissions.includes(p.id)}
                    onChange={() => togglePermission(p.id)}
                  />
                  <div>
                    <div className="um-perm-label">{p.label}</div>
                    <div className="um-perm-desc">{p.description}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="um-actions um-actions-end">
          <button onClick={onCancel}>Cancelar</button>
          <button className="um-btn-primary" onClick={() => onSave(draft)}>Guardar</button>
        </div>
      </div>
    </div>
  )
}