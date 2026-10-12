create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint profiles_valid_permissions check (
    permissions <@ array['asistencia', 'checador', 'personal', 'reportes']::text[]
  )
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.has_module_permission(module_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and module_name = any(permissions)
    );
$$;

create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert or update of email on auth.users
  for each row execute function public.create_profile_for_new_auth_user();

create table if not exists public.trabajadores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  nombre text not null,
  cuadrilla text not null,
  rancho text not null,
  estado text not null check (estado in ('Activo', 'Baja')),
  created_at timestamptz not null default now()
);

create table if not exists public.asistencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  trabajador_id uuid references public.trabajadores (id) on delete set null,
  nombre text not null,
  cuadrilla text not null,
  rancho text not null,
  hora_entrada text not null,
  fecha date not null,
  created_at timestamptz not null default now()
);

create index if not exists asistencias_fecha_idx on public.asistencias (fecha);
create index if not exists asistencias_trabajador_fecha_idx on public.asistencias (trabajador_id, fecha);

alter table public.profiles enable row level security;
alter table public.trabajadores enable row level security;
alter table public.asistencias enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists trabajadores_select_allowed on public.trabajadores;
create policy trabajadores_select_allowed on public.trabajadores
  for select to authenticated
  using (
    (select public.has_module_permission('personal'))
    or (select public.has_module_permission('asistencia'))
    or (select public.has_module_permission('checador'))
  );

drop policy if exists trabajadores_insert_personal on public.trabajadores;
create policy trabajadores_insert_personal on public.trabajadores
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_admin())
  );

drop policy if exists trabajadores_update_personal on public.trabajadores;
create policy trabajadores_update_personal on public.trabajadores
  for update to authenticated
  using ((select public.is_admin()))
  with check (
    user_id = (select auth.uid())
    and (select public.is_admin())
  );

drop policy if exists trabajadores_delete_admin on public.trabajadores;
create policy trabajadores_delete_admin on public.trabajadores
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists asistencias_select_allowed on public.asistencias;
create policy asistencias_select_allowed on public.asistencias
  for select to authenticated
  using (
    (select public.has_module_permission('asistencia'))
    or (select public.has_module_permission('checador'))
    or (select public.has_module_permission('reportes'))
  );

drop policy if exists asistencias_insert_allowed on public.asistencias;
create policy asistencias_insert_allowed on public.asistencias
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (select public.has_module_permission('asistencia'))
      or (select public.has_module_permission('checador'))
    )
  );

drop policy if exists asistencias_update_admin on public.asistencias;
drop policy if exists asistencias_update_owner on public.asistencias;
create policy asistencias_update_owner on public.asistencias
  for update to authenticated
  using (
    (select public.is_admin())
    or (
      user_id = (select auth.uid())
      and (
        (select public.has_module_permission('asistencia'))
        or (select public.has_module_permission('checador'))
      )
    )
  )
  with check (
    user_id = (select auth.uid())
    and (
      (select public.is_admin())
      or (select public.has_module_permission('asistencia'))
      or (select public.has_module_permission('checador'))
    )
  );

drop policy if exists asistencias_delete_admin on public.asistencias;
create policy asistencias_delete_admin on public.asistencias
  for delete to authenticated
  using ((select public.is_admin()));

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.trabajadores to authenticated;
grant select, insert, update, delete on public.asistencias to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_module_permission(text) to authenticated;
