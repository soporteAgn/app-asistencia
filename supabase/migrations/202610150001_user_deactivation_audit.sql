alter table public.profiles
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id) on delete set null,
  add column if not exists deleted_by_name text;

alter table public.profiles
  add constraint profiles_deletion_audit_consistent check (
    (deleted_at is null and deleted_by is null and deleted_by_name is null)
    or (deleted_at is not null and deleted_by_name is not null)
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
      and deleted_at is null
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
        and deleted_at is null
        and module_name = any(permissions)
    );
$$;
