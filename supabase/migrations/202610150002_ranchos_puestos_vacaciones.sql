create table if not exists public.ranchos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.puestos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  hora_entrada time not null,
  hora_salida time not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint puestos_horario_valido check (hora_salida > hora_entrada)
);

insert into public.ranchos (nombre)
values
  ('Rancho El Paraíso'),
  ('Rancho La Esperanza'),
  ('Rancho San Miguel'),
  ('Rancho Los Olivos')
on conflict (nombre) do nothing;

insert into public.puestos (nombre, hora_entrada, hora_salida)
values
  ('Riego', '06:00', '14:00'),
  ('Empaque', '08:00', '16:00')
on conflict (nombre) do nothing;

alter table public.trabajadores
  add column if not exists puesto text,
  add column if not exists hora_entrada_programada time,
  add column if not exists hora_salida_programada time,
  add column if not exists vacaciones_inicio date,
  add column if not exists vacaciones_fin date,
  add constraint trabajadores_horario_programado_valido check (
    (hora_entrada_programada is null and hora_salida_programada is null)
    or (
      hora_entrada_programada is not null
      and hora_salida_programada is not null
      and hora_salida_programada > hora_entrada_programada
    )
  ),
  add constraint trabajadores_vacaciones_validas check (
    (vacaciones_inicio is null and vacaciones_fin is null)
    or (
      vacaciones_inicio is not null
      and vacaciones_fin is not null
      and vacaciones_fin >= vacaciones_inicio
    )
  );

alter table public.ranchos enable row level security;
alter table public.puestos enable row level security;

drop policy if exists ranchos_select_personal on public.ranchos;
create policy ranchos_select_personal on public.ranchos
  for select to authenticated
  using (
    (select public.has_module_permission('personal'))
    or (select public.has_module_permission('asistencia'))
    or (select public.has_module_permission('checador'))
  );

drop policy if exists ranchos_manage_admin on public.ranchos;
create policy ranchos_manage_admin on public.ranchos
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists puestos_select_personal on public.puestos;
create policy puestos_select_personal on public.puestos
  for select to authenticated
  using (
    (select public.has_module_permission('personal'))
    or (select public.has_module_permission('asistencia'))
    or (select public.has_module_permission('checador'))
  );

drop policy if exists puestos_manage_admin on public.puestos;
create policy puestos_manage_admin on public.puestos
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, update on public.ranchos to authenticated;
grant select, insert, update on public.puestos to authenticated;
grant update on public.trabajadores to authenticated;
