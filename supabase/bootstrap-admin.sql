do $$
declare
  admin_user_id uuid;
begin
  select id into admin_user_id
  from public.profiles
  where lower(email) = lower('soporteti@agnieto.com');

  if admin_user_id is null then
    raise exception 'Primero crea o invita soporteti@agnieto.com en Supabase Authentication.';
  end if;

  update public.profiles
  set role = 'admin',
      permissions = array['asistencia', 'checador', 'personal', 'reportes']::text[]
  where id = admin_user_id;
end;
$$;
