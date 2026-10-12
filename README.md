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
4. Ejecuta `supabase/migrations/202610100001_auth_permissions.sql` desde **SQL Editor** de Supabase, o aplica el archivo con Supabase CLI.
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
- Las plantillas faciales permanecen en IndexedDB del dispositivo y no se envían a Supabase. Deben enrolarse en cada dispositivo que las necesite.
- Los datos IndexedDB existentes sin usuario se asignan al primer administrador que conecte el dispositivo después de configurar Supabase. Revisa previamente cualquier información de prueba que quieras descartar.

## Desarrollo

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
