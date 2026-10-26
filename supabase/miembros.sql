-- Ejecutar una vez en Supabase > SQL Editor. Solo crea una tabla nueva; no toca las existentes.
create table if not exists public.miembros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null default 'hermano' check (tipo in ('hermano', 'siervo', 'pastor')),
  telefono text,
  cumpleanos date,
  fecha_bautizo date,
  ministerio text,
  actividades text,
  notas text,
  fechas jsonb not null default '[]'::jsonb,
  creado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.miembros enable row level security;

drop policy if exists "miembros_acceso_app" on public.miembros;
create policy "miembros_acceso_app" on public.miembros
  for all to anon, authenticated using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table public.miembros;
exception when duplicate_object then null;
end $$;
