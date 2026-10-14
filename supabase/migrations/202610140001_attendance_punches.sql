alter table public.asistencias
  add column if not exists hora_salida_comida text,
  add column if not exists hora_regreso_comida text,
  add column if not exists hora_salida text;
