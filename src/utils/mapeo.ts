import type { Account } from '../types'

// ============================================================
// CONVERSIONES ENTRE FORMATO APP (inglés) Y SUPABASE (español)
// ============================================================

// ---------- INGRESOS ----------
export function ingresoLocalASupabase(p: any) {
  return {
    id: p.id,
    recibo: p.receipt,
    persona: p.person,
    carnet: p.carnet || '',
    telefono: p.phone || '',
    concepto: p.concept,
    fecha: p.date,
    monto: p.amount,
    efectivo: p.cash,
    qr: p.qr,
    estado: p.status,
    emitido_por: p.issuedBy || '',
    updated_at: p.updated_at || new Date().toISOString(),
  }
}

export function ingresoSupabaseALocal(r: any) {
  return {
    id: r.id,
    receipt: r.recibo,
    person: r.persona,
    carnet: r.carnet || '',
    phone: r.telefono || '',
    concept: r.concepto,
    date: r.fecha,
    amount: r.monto,
    cash: r.efectivo || 0,
    qr: r.qr || 0,
    status: r.estado || 'Aplicado',
    issuedBy: r.emitido_por || '',
    updated_at: r.updated_at,
  }
}

// ---------- EGRESOS ----------
export function egresoLocalASupabase(e: any) {
  return {
    id: e.id,
    comprobante: e.voucher,
    destinatario: e.recipient,
    concepto: e.concept,
    categoria: e.category,
    fecha: e.date,
    monto: e.amount,
    efectivo: e.cash,
    qr: e.qr,
    estado: e.status,
    emitido_por: e.issuedBy || '',
    updated_at: e.updated_at || new Date().toISOString(),
  }
}

export function egresoSupabaseALocal(r: any) {
  return {
    id: r.id,
    voucher: r.comprobante,
    recipient: r.destinatario,
    concept: r.concepto,
    category: r.categoria,
    date: r.fecha,
    amount: r.monto,
    cash: r.efectivo || 0,
    qr: r.qr || 0,
    status: r.estado || 'Aplicado',
    issuedBy: r.emitido_por || '',
    updated_at: r.updated_at,
  }
}

// ---------- CLIENTES ----------
export function clienteLocalASupabase(c: any) {
  return {
    id: c.id,
    nombre: c.name,
    carnet: c.carnet || '',
    telefono: c.phone || '',
    notas: c.notes || '',
    updated_at: new Date().toISOString(),
  }
}

export function clienteSupabaseALocal(r: any) {
  return {
    id: r.id,
    name: r.nombre,
    carnet: r.carnet || '',
    phone: r.telefono || '',
    notes: r.notas || '',
    updated_at: r.updated_at,
  }
}

// ---------- CUENTAS ----------
// NO sincronizamos password ni needsPassword por seguridad
export function cuentaLocalASupabase(a: Account) {
  return {
    id: a.id,
    username: a.username || '',
    nombre: a.name,
    nombre_completo: a.fullName || '',
    rol: a.role,
    permisos: a.permissions,
    activo: a.active,
    avatar: a.avatar || '',
    updated_at: new Date().toISOString(),
  }
}

export function cuentaSupabaseALocal(r: any, passwordLocal: string = '', needsPassword: boolean = true): Account {
  return {
    id: r.id,
    name: r.nombre,
    username: r.username || '',
    password: passwordLocal,
    needsPassword,
    fullName: r.nombre_completo || '',
    role: r.rol || 'user',
    permissions: r.permisos || [],
    active: r.activo !== false,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    avatar: r.avatar || '',
  }
}