drop policy if exists trabajadores_select_reportes on public.trabajadores;
create policy trabajadores_select_reportes on public.trabajadores
  for select to authenticated
  using ((select public.has_module_permission('reportes')));
