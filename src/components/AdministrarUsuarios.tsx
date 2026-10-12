'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, LoaderCircle, MailPlus, RefreshCw, Shield, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { MODULOS, type Modulo } from '@/lib/permissions';
import { getSupabaseBrowserClient } from '@/lib/supabase';

type UsuarioAdministrable = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  permissions: Modulo[];
  created_at: string;
};

export default function AdministrarUsuarios() {
  const { user: usuarioActual } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioAdministrable[]>([]);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<'admin' | 'user'>('user');
  const [permisos, setPermisos] = useState<Modulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ error: boolean; texto: string } | null>(null);

  const solicitar = useCallback(async (method: 'GET' | 'POST' | 'PATCH', body?: object) => {
    const { data: { session }, error: sessionError } = await getSupabaseBrowserClient().auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');

    const response = await fetch('/api/admin/users', {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      const error = typeof result === 'object' && result !== null && 'error' in result
        ? result.error
        : 'No fue posible completar la operación.';
      throw new Error(typeof error === 'string' ? error : 'No fue posible completar la operación.');
    }
    return result;
  }, []);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    try {
      const result = await solicitar('GET') as { users: UsuarioAdministrable[] };
      setUsuarios(result.users);
      setMensaje(null);
    } catch (error) {
      setMensaje({ error: true, texto: error instanceof Error ? error.message : 'No fue posible cargar los usuarios.' });
    } finally {
      setCargando(false);
    }
  }, [solicitar]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void cargarUsuarios();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [cargarUsuarios]);

  const invitarUsuario = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGuardando(true);
    try {
      const result = await solicitar('POST', {
        email: correo,
        fullName: nombre,
        role: rol,
        permissions: rol === 'admin' ? MODULOS.map(({ id }) => id) : permisos,
      }) as { message: string };
      setMensaje({ error: false, texto: result.message });
      setNombre('');
      setCorreo('');
      setRol('user');
      setPermisos([]);
      await cargarUsuarios();
    } catch (error) {
      setMensaje({ error: true, texto: error instanceof Error ? error.message : 'No fue posible invitar al usuario.' });
    } finally {
      setGuardando(false);
    }
  };

  const actualizarUsuario = async (usuario: UsuarioAdministrable) => {
    setGuardando(true);
    try {
      await solicitar('PATCH', {
        id: usuario.id,
        role: usuario.role,
        permissions: usuario.role === 'admin' ? MODULOS.map(({ id }) => id) : usuario.permissions,
      });
      setMensaje({ error: false, texto: `Permisos guardados para ${usuario.email}.` });
      await cargarUsuarios();
    } catch (error) {
      setMensaje({ error: true, texto: error instanceof Error ? error.message : 'No fue posible guardar los permisos.' });
    } finally {
      setGuardando(false);
    }
  };

  const actualizarPermisos = (usuarioId: string, modulo: Modulo, activo: boolean) => {
    setUsuarios((actuales) => actuales.map((usuario) => {
      if (usuario.id !== usuarioId) return usuario;
      const siguientes = activo
        ? [...new Set([...usuario.permissions, modulo])]
        : usuario.permissions.filter((permiso) => permiso !== modulo);
      return { ...usuario, permissions: siguientes };
    }));
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-[#1a3821]">
          <Shield className="text-[#2e6f40]" /> Administración de usuarios
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Invita usuarios y asigna los módulos que pueden consultar. Los administradores tienen acceso completo.
        </p>
      </div>

      <form onSubmit={invitarUsuario} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
          <MailPlus size={18} className="text-[#2e6f40]" /> Invitar usuario
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-600">
            Nombre
            <input required value={nombre} onChange={(event) => setNombre(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2e6f40]" />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Correo electrónico
            <input required type="email" value={correo} onChange={(event) => setCorreo(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2e6f40]" />
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-600">
          Rol
          <select value={rol} onChange={(event) => setRol(event.target.value as 'admin' | 'user')}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2e6f40] sm:max-w-xs">
            <option value="user">Usuario</option>
            <option value="admin">Administrador de TI</option>
          </select>
        </label>
        {rol === 'user' && (
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium text-slate-600">Permisos de visualización</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {MODULOS.map((modulo) => (
                <label key={modulo.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" checked={permisos.includes(modulo.id)}
                    onChange={(event) => setPermisos((actuales) => event.target.checked
                      ? [...actuales, modulo.id]
                      : actuales.filter((permiso) => permiso !== modulo.id))}
                    className="accent-[#2e6f40]" />
                  {modulo.nombre}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <button disabled={guardando} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2e6f40] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#235732] disabled:cursor-not-allowed disabled:opacity-60">
          {guardando ? <LoaderCircle size={17} className="animate-spin" /> : <MailPlus size={17} />}
          Enviar invitación
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800"><Users size={18} /> Usuarios registrados</h3>
          <button type="button" onClick={() => void cargarUsuarios()} aria-label="Actualizar usuarios"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw size={17} /></button>
        </div>
        {cargando ? (
          <p className="p-5 text-sm text-slate-500">Cargando usuarios...</p>
        ) : usuarios.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No hay usuarios para mostrar.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {usuarios.map((usuario) => {
              const esActual = usuario.id === usuarioActual?.id;
              return (
                <article key={usuario.id} className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{usuario.full_name || usuario.email}</p>
                      <p className="text-sm text-slate-500">{usuario.email}{esActual ? ' · Tú' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select aria-label={`Rol de ${usuario.email}`} value={usuario.role}
                        disabled={esActual}
                        onChange={(event) => setUsuarios((actuales) => actuales.map((actual) => actual.id === usuario.id
                          ? {
                              ...actual,
                              role: event.target.value as 'admin' | 'user',
                              permissions: event.target.value === 'admin' ? MODULOS.map(({ id }) => id) : actual.permissions,
                            }
                          : actual))}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 disabled:opacity-60">
                        <option value="user">Usuario</option>
                        <option value="admin">Administrador TI</option>
                      </select>
                      <button type="button" disabled={guardando || esActual} onClick={() => void actualizarUsuario(usuario)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                        <Check size={16} /> Guardar
                      </button>
                    </div>
                  </div>
                  {usuario.role === 'user' && !esActual && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {MODULOS.map((modulo) => (
                        <label key={modulo.id} className="flex items-center gap-2 text-sm text-slate-600">
                          <input type="checkbox" checked={usuario.permissions.includes(modulo.id)}
                            onChange={(event) => actualizarPermisos(usuario.id, modulo.id, event.target.checked)}
                            className="accent-[#2e6f40]" />
                          {modulo.nombre}
                        </label>
                      ))}
                    </div>
                  )}
                  {usuario.role === 'admin' && <p className="text-xs text-emerald-700">Acceso completo a todos los módulos.</p>}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {mensaje && (
        <p role="status" className={`rounded-lg border p-3 text-sm ${
          mensaje.error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}>{mensaje.texto}</p>
      )}
    </section>
  );
}
