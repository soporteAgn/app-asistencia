# Control de asistencia — Agrícola Nieto

Aplicación Next.js para control de asistencia, gestión de personal y reportes. Supabase proporciona autenticación, perfiles, permisos por módulo y almacenamiento central de trabajadores y asistencias con Row Level Security (RLS). IndexedDB conserva una copia de los datos permitidos y las asistencias pendientes para trabajar sin conexión.

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. En **Project Settings → API**, copia la URL del proyecto y la clave pública `anon`/publishable.
3. Copia `.env.example` a `.env.local` y configura:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```

   `SUPABASE_SERVICE_ROLE_KEY` solo la usan las rutas de servidor para invitar usuarios. No la incluyas en variables `NEXT_PUBLIC_*`, código del navegador ni repositorios.
4. Ejecuta, en orden, `supabase/migrations/202610100001_auth_permissions.sql`, `supabase/migrations/202610140001_attendance_punches.sql`, `supabase/migrations/202610150001_user_deactivation_audit.sql`, `supabase/migrations/202610150002_ranchos_puestos_vacaciones.sql`, `supabase/migrations/202610230001_trabajadores_reportes_select.sql` y `supabase/migrations/202610260001_cuadrillas_catalog.sql` desde **SQL Editor** de Supabase, o aplica los archivos con Supabase CLI.
5. En **Authentication → URL Configuration**, configura la URL del sitio y añade las URL local/de producción a Redirect URLs. Configura SMTP para que lleguen las invitaciones.
6. Invita `soporteti@agnieto.com` desde **Authentication → Users**.
7. Después de que Supabase cree la cuenta, ejecuta `supabase/bootstrap-admin.sql` en **SQL Editor**. Esta instrucción asigna el rol inicial de administrador de TI y todos los módulos; no establece ni revela una contraseña.
8. En el equipo de desarrollo, crea `.env.local`, luego ejecuta `npm run dev`. El administrador inicia sesión siguiendo el enlace de invitación de Supabase y define su propia contraseña. Desde **Usuarios y permisos** podrá invitar a otros usuarios.

## Roles y datos

- Los módulos son Asistencia, Checador facial, Gestión de personal y Reportes Excel.
- Los usuarios reciben los permisos seleccionados por el administrador. Un administrador de TI siempre tiene acceso a todos los módulos.
- Las rutas administrativas verifican la sesión y el rol en el servidor; las tablas de Supabase tienen RLS para validar cada lectura/escritura independientemente de la interfaz.
- Al reconectar, trabajadores y asistencias autorizados se sincronizan con Supabase. Los permisos recién cambiados se consultan otra vez al recargar/iniciar sesión.
- En modo offline se puede continuar con la sesión previamente iniciada en ese navegador, usando los permisos y datos locales guardados. Un inicio de sesión inicial requiere conexión.
- El rostro se captura y enrola al dar de alta al trabajador desde Gestión de Personal; desde ahí también se puede enrolar o actualizar el rostro de trabajadores existentes. Las plantillas permanecen en IndexedDB del dispositivo y no se envían a Supabase, así que cada dispositivo de checado requiere su propio enrolamiento. El módulo Checador Facial solo escanea y registra la siguiente marcación.
- Las marcaciones de cada turno siguen este orden: entrada, salida a comer, regreso de comida y salida final. El reporte calcula la duración de comida entre sus dos marcaciones.
- Gestión de Personal permite mantener catálogos de ranchos, cuadrillas y puestos con horario, asignar el puesto a cada trabajador y registrar periodos de vacaciones. El reporte Excel incluye faltas al cierre del horario asignado (17:00 si no tiene horario), vacaciones y un resumen por trabajador. Los domingos no se consideran días laborables ni se cuentan como días de vacaciones.
- Los usuarios con permiso de Reportes Excel pueden consultar el padrón de trabajadores necesario para elaborar faltas y vacaciones; no necesitan permiso para editar Gestión de Personal.
- Los cambios de personal y vacaciones se sincronizan con Supabase al recuperar la conexión. Los catálogos se guardan localmente para poder consultar las opciones sincronizadas sin conexión; para crear, activar o eliminar ranchos, cuadrillas y puestos se requiere conexión.
- Los datos IndexedDB existentes sin usuario se asignan al primer administrador que conecte el dispositivo después de configurar Supabase. Revisa previamente cualquier información de prueba que quieras descartar.

## Dependencias de Desarrollo

```bash
npm install
npm run dev
```

Validaciones disponibles:

```bash
npm run lint
npx tsc --noEmit
npm run build
```
