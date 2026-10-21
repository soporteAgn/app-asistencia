## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  Unique |
| `full_name` | `text` |  |
| `role` | `text` |  |
| `permissions` | `_text` |  |
| `created_at` | `timestamptz` |  |

## Table `trabajadores`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `nombre` | `text` |  |
| `cuadrilla` | `text` |  |
| `rancho` | `text` |  |
| `estado` | `text` |  |
| `created_at` | `timestamptz` |  |
| `puesto` | `text` |  Nullable |
| `hora_entrada_programada` | `time` |  Nullable |
| `hora_salida_programada` | `time` |  Nullable |
| `vacaciones_inicio` | `date` |  Nullable |
| `vacaciones_fin` | `date` |  Nullable |

## Table `asistencias`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `trabajador_id` | `uuid` |  Nullable |
| `nombre` | `text` |  |
| `cuadrilla` | `text` |  |
| `rancho` | `text` |  |
| `hora_entrada` | `text` |  |
| `fecha` | `date` |  |
| `created_at` | `timestamptz` |  |
| `hora_salida_comida` | `text` |  Nullable |
| `hora_regreso_comida` | `text` |  Nullable |
| `hora_salida` | `text` |  Nullable |

## Table `ranchos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `text` |  Unique |
| `activo` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `puestos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `text` |  Unique |
| `hora_entrada` | `time` |  |
| `hora_salida` | `time` |  |
| `activo` | `bool` |  |
| `created_at` | `timestamptz` |  |

## RLS Policies

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `profiles_update_admin` | UPDATE | authenticated | PERMISSIVE | `( SELECT is_admin() AS is_admin)` | `( SELECT is_admin() AS is_admin)` |
| `profiles_select_self_or_admin` | SELECT | authenticated | PERMISSIVE | `((id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_admin() AS is_admin))` | — |

### `ranchos`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ranchos_manage_admin` | ALL | authenticated | PERMISSIVE | `( SELECT is_admin() AS is_admin)` | `( SELECT is_admin() AS is_admin)` |
| `ranchos_select_personal` | SELECT | authenticated | PERMISSIVE | `(( SELECT has_module_permission('personal'::text) AS has_module_permission) OR ( SELECT has_module_permission('asistencia'::text) AS has_module_permission) OR ( SELECT has_module_permission('checador'::text) AS has_module_permission))` | — |

### `puestos`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `puestos_manage_admin` | ALL | authenticated | PERMISSIVE | `( SELECT is_admin() AS is_admin)` | `( SELECT is_admin() AS is_admin)` |
| `puestos_select_personal` | SELECT | authenticated | PERMISSIVE | `(( SELECT has_module_permission('personal'::text) AS has_module_permission) OR ( SELECT has_module_permission('asistencia'::text) AS has_module_permission) OR ( SELECT has_module_permission('checador'::text) AS has_module_permission))` | — |

### `trabajadores`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `trabajadores_delete_admin` | DELETE | authenticated | PERMISSIVE | `( SELECT is_admin() AS is_admin)` | — |
| `trabajadores_update_personal` | UPDATE | authenticated | PERMISSIVE | `( SELECT is_admin() AS is_admin)` | `((user_id = ( SELECT auth.uid() AS uid)) AND ( SELECT is_admin() AS is_admin))` |
| `trabajadores_insert_personal` | INSERT | authenticated | PERMISSIVE | — | `((user_id = ( SELECT auth.uid() AS uid)) AND ( SELECT is_admin() AS is_admin))` |
| `trabajadores_select_allowed` | SELECT | authenticated | PERMISSIVE | `(( SELECT has_module_permission('personal'::text) AS has_module_permission) OR ( SELECT has_module_permission('asistencia'::text) AS has_module_permission) OR ( SELECT has_module_permission('checador'::text) AS has_module_permission))` | — |

### `asistencias`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `asistencias_delete_admin` | DELETE | authenticated | PERMISSIVE | `( SELECT is_admin() AS is_admin)` | — |
| `asistencias_update_owner` | UPDATE | authenticated | PERMISSIVE | `(( SELECT is_admin() AS is_admin) OR ((user_id = ( SELECT auth.uid() AS uid)) AND (( SELECT has_module_permission('asistencia'::text) AS has_module_permission) OR ( SELECT has_module_permission('checador'::text) AS has_module_permission))))` | `((user_id = ( SELECT auth.uid() AS uid)) AND (( SELECT is_admin() AS is_admin) OR ( SELECT has_module_permission('asistencia'::text) AS has_module_permission) OR ( SELECT has_module_permission('checador'::text) AS has_module_permission)))` |
| `asistencias_insert_allowed` | INSERT | authenticated | PERMISSIVE | — | `((user_id = ( SELECT auth.uid() AS uid)) AND (( SELECT has_module_permission('asistencia'::text) AS has_module_permission) OR ( SELECT has_module_permission('checador'::text) AS has_module_permission)))` |
| `asistencias_select_allowed` | SELECT | authenticated | PERMISSIVE | `(( SELECT has_module_permission('asistencia'::text) AS has_module_permission) OR ( SELECT has_module_permission('checador'::text) AS has_module_permission) OR ( SELECT has_module_permission('reportes'::text) AS has_module_permission))` | — |

