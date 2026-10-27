create table if not exists public.cuadrillas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.cuadrillas (nombre)
values
  ('Cuadrilla A - Cosecha'),
  ('Cuadrilla B - Riego'),
  ('Cuadrilla C - Empaque'),
  ('Mantenimiento')
on conflict (nombre) do nothing;

alter table public.cuadrillas enable row level security;

drop policy if exists cuadrillas_select_personal on public.cuadrillas;
create policy cuadrillas_select_personal on public.cuadrillas
  for select to authenticated
  using (
    (select public.has_module_permission('personal'))
    or (select public.has_module_permission('asistencia'))
    or (select public.has_module_permission('checador'))
  );

drop policy if exists cuadrillas_manage_admin on public.cuadrillas;
create policy cuadrillas_manage_admin on public.cuadrillas
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, update, delete on public.cuadrillas to authenticated;
