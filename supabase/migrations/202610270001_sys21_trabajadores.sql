alter table public.trabajadores
  add column if not exists id_sys21 text;

create unique index if not exists trabajadores_user_id_id_sys21_uidx
  on public.trabajadores (user_id, id_sys21)
  where id_sys21 is not null and id_sys21 <> '';
