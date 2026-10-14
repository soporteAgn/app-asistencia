'use client';

import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import ChecadorFacial from '@/components/ChecadorFacial';
import GestionPersonal from '@/components/GestionPersonal';
import ReportesExportar from '@/components/ReportesExportar';
import SyncManager from '@/components/SyncManager';
import AdministrarUsuarios from '@/components/AdministrarUsuarios';
import { db, type Trabajador } from '@/lib/db';
import {
  formatearDuracionComida,
  nombrePasoMarcacion,
  obtenerFechaLocal,
  obtenerSiguientePaso,
  registrarSiguienteMarcacion,
} from '@/lib/asistencia';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/lib/auth';
import type { Perfil, Modulo } from '@/lib/permissions';
import {
  Users,
  UserCheck,
  Clock,
  Camera,
  Search,
  CheckCircle2,
  Menu,
  X,
  FileSpreadsheet,
  ShieldCheck,
  LogOut,
  LockKeyhole,
  Leaf,
  LoaderCircle
} from 'lucide-react';

export default function Home() {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f4]">
        <LoaderCircle className="animate-spin text-[#2e6f40]" size={32} />
      </div>
    );
  }

  if (!auth.configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f4] p-4">
        <div className="max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-lg">
          <h1 className="text-xl font-bold text-slate-800">Configura el acceso seguro</h1>
          <p className="mt-2 text-sm text-slate-600">
            Agrega las variables de Supabase indicadas en <code>.env.example</code> a tu archivo <code>.env.local</code>,
            y ejecuta las instrucciones de la carpeta <code>supabase</code>.
          </p>
        </div>
      </div>
    );
  }

  if (auth.passwordRecovery) {
    return <PantallaNuevaContrasena />;
  }

  if (!auth.user || !auth.profile) {
    return <PantallaLogin errorSesion={auth.error} />;
  }

  return <AplicacionAsistencia user={auth.user} profile={auth.profile} />;
}

function PantallaLogin({ errorSesion }: { errorSesion: string | null }) {
  const { signIn, sendPasswordReset } = useAuth();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(errorSesion);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const entrar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await signIn(correo, contrasena);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No fue posible iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  const recuperarContrasena = async () => {
    setError(null);
    setMensaje(null);
    if (!correo.trim()) {
      setError('Escribe tu correo electrónico y luego pulsa “¿Olvidaste tu contraseña?”.');
      return;
    }
    setCargando(true);
    try {
      await sendPasswordReset(correo.trim());
      setMensaje('Si el correo está registrado, recibirás un enlace para crear una contraseña nueva. Revisa también correo no deseado.');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'No fue posible enviar el correo de recuperación.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f4] p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#ebf3ed] text-[#2e6f40]">
            <Leaf size={30} />
          </div>
          <p className="text-sm font-semibold text-[#2e6f40]">AGRÍCOLA NIETO</p>
          <h1 className="mt-2 text-2xl font-bold text-[#1a3821]">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-slate-500">Ingresa con tu cuenta autorizada</p>
        </div>
        <form onSubmit={entrar} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Correo electrónico
            <input type="email" autoComplete="username" required value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-[#2e6f40]" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Contraseña
            <input type="password" autoComplete="current-password" required value={contrasena}
              onChange={(event) => setContrasena(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-[#2e6f40]" />
          </label>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          {mensaje && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</p>}
          <button disabled={cargando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2e6f40] px-4 py-3 font-semibold text-white transition hover:bg-[#235732] disabled:cursor-not-allowed disabled:opacity-60">
            {cargando ? <LoaderCircle size={18} className="animate-spin" /> : <LockKeyhole size={18} />}
            Entrar
          </button>
          <button type="button" onClick={() => void recuperarContrasena()} disabled={cargando}
            className="w-full py-2 text-sm font-medium text-[#2e6f40] hover:underline disabled:opacity-60">
            ¿Olvidaste tu contraseña?
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">El acceso se administra desde la cuenta de TI.</p>
      </section>
    </main>
  );
}

function PantallaNuevaContrasena() {
  const { updatePassword, signOut } = useAuth();
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cancelar = async () => {
    try {
      await signOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'No fue posible cancelar la recuperación.');
    }
  };

  const guardar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (contrasena.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (contrasena !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setGuardando(true);
    try {
      await updatePassword(contrasena);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No fue posible actualizar la contraseña.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f4] p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#ebf3ed] text-[#2e6f40]">
            <LockKeyhole size={27} />
          </div>
          <h1 className="text-2xl font-bold text-[#1a3821]">Crear nueva contraseña</h1>
          <p className="mt-2 text-sm text-slate-500">Elige una contraseña nueva para tu cuenta.</p>
        </div>
        <form onSubmit={guardar} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Nueva contraseña
            <input required type="password" minLength={8} autoComplete="new-password" value={contrasena}
              onChange={(event) => setContrasena(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-[#2e6f40]" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirma la nueva contraseña
            <input required type="password" minLength={8} autoComplete="new-password" value={confirmacion}
              onChange={(event) => setConfirmacion(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-[#2e6f40]" />
          </label>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <button disabled={guardando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2e6f40] px-4 py-3 font-semibold text-white transition hover:bg-[#235732] disabled:cursor-not-allowed disabled:opacity-60">
            {guardando ? <LoaderCircle size={18} className="animate-spin" /> : <LockKeyhole size={18} />}
            Guardar nueva contraseña
          </button>
        </form>
        <button type="button" onClick={() => void cancelar()}
          className="mt-4 w-full py-2 text-sm font-medium text-slate-500 hover:underline">
          Cancelar y volver al inicio
        </button>
      </section>
    </main>
  );
}

function AplicacionAsistencia({ user, profile }: { user: User; profile: Perfil }) {
  const { signOut } = useAuth();
  const canView = (modulo: Modulo) =>
    profile.role === 'admin' || profile.permissions.includes(modulo);
  type Tab = 'asistencia' | 'checador' | 'personal' | 'reportes' | 'usuarios';
  const [tabActual, setTabActual] = useState<Tab>(() => {
    if (profile.role === 'admin' || profile.permissions.includes('asistencia')) return 'asistencia';
    return (['checador', 'personal', 'reportes'] as const)
      .find((modulo) => profile.permissions.includes(modulo)) ?? 'asistencia';
  });
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);

  const trabajadores = useLiveQuery(
    async () => (await db.trabajadores.where('userId').equals(user.id).toArray()).filter(
      (trabajador): trabajador is Trabajador & { id: number } => typeof trabajador.id === 'number',
    ),
    [user.id],
  );
  const asistencias = useLiveQuery(
    () => db.asistencias.where('userId').equals(user.id).toArray(),
    [user.id],
  );

  const marcarAsistencia = async (trabajador: Trabajador & { id: number }) => {
    try {
      const { paso, hora } = await registrarSiguienteMarcacion(trabajador, user.id);
      alert(`${nombrePasoMarcacion(paso)} de ${trabajador.nombre} registrada a las ${hora}.`);
    } catch (error) {
      console.error('No se pudo registrar la marcación:', error);
      alert(error instanceof Error ? error.message : 'No se pudo registrar la marcación.');
    }
  };

  const fechaHoy = obtenerFechaLocal();
  const asistenciasHoy = asistencias?.filter((registro) => registro.fecha === fechaHoy) ?? [];
  const totalTrabajadores = canView('asistencia') ? trabajadores?.length || 0 : 0;
  const totalPresentes = canView('asistencia') ? asistenciasHoy.length : 0;
  const sinRegistro = totalTrabajadores - totalPresentes;

  const trabajadoresFiltrados = trabajadores?.filter(t =>
    t.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    t.rancho.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#f4f6f4] text-slate-800">
      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
        />
      )}
      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between border-r border-slate-200 bg-white p-4 transition-transform duration-200 md:inset-y-auto md:relative md:h-screen md:z-auto md:translate-x-0 md:shrink-0 ${
        menuAbierto ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div>
          <div className="mb-8 flex items-center justify-between gap-2 px-2 text-xl font-bold text-[#2e6f40]">
            🌱 Agricola Nieto
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              aria-label="Cerrar menú"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <X size={20} />
            </button>
          </div>
          <div role="navigation" aria-label="Navegación principal" className="space-y-1">
            {canView('asistencia') && (
              <button onClick={() => { setTabActual('asistencia'); setMenuAbierto(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  tabActual === 'asistencia' ? 'bg-[#ebf3ed] text-[#2e6f40]' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <UserCheck size={18} /> Asistencia
              </button>
            )}
            {canView('checador') && (
              <button onClick={() => { setTabActual('checador'); setMenuAbierto(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  tabActual === 'checador' ? 'bg-[#ebf3ed] text-[#2e6f40]' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <Camera size={18} /> Checador Facial
              </button>
            )}
            {canView('personal') && (
              <button onClick={() => { setTabActual('personal'); setMenuAbierto(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  tabActual === 'personal' ? 'bg-[#ebf3ed] text-[#2e6f40]' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <Users size={18} /> Gestión de Personal
              </button>
            )}
            {canView('reportes') && (
              <button onClick={() => { setTabActual('reportes'); setMenuAbierto(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  tabActual === 'reportes' ? 'bg-[#ebf3ed] text-[#2e6f40]' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <FileSpreadsheet size={18} /> Reportes Excel
              </button>
            )}
            {profile.role === 'admin' && (
              <button onClick={() => { setTabActual('usuarios'); setMenuAbierto(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  tabActual === 'usuarios' ? 'bg-[#ebf3ed] text-[#2e6f40]' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <ShieldCheck size={18} /> Usuarios y permisos
              </button>
            )}
          </div>
        </div>
        <div className="border-t pt-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">{profile.full_name || profile.email}</p>
          <p>{profile.role === 'admin' ? 'Administrador de TI' : 'Usuario'}</p>
          <button type="button" onClick={() => void signOut().catch((error: unknown) => {
            console.error('No se pudo cerrar sesión:', error);
            alert(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.');
          })}
            className="mt-3 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 font-medium text-slate-600 hover:bg-slate-100">
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-6 pr-14">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              aria-expanded={menuAbierto}
              className="mt-0.5 rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-50 md:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#1a3821] sm:text-2xl">
                {tabActual === 'asistencia' ? 'Resumen de asistencia'
                  : tabActual === 'checador' ? 'Checador facial'
                    : tabActual === 'personal' ? 'Gestión de personal'
                      : tabActual === 'reportes' ? 'Reportes Excel'
                        : 'Usuarios y permisos'}
              </h1>
              <p className="text-sm text-slate-500">Operación del día • Villagrán, Gto.</p>
            </div>
          </div>
        </header>

        {tabActual === 'asistencia' && canView('asistencia') ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase">Personal Registrado</span>
                  <Users size={18} className="text-[#2e6f40]" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{totalTrabajadores}</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase">Presentes Hoy</span>
                  <UserCheck size={18} className="text-emerald-600" />
                </div>
                <p className="text-3xl font-bold text-emerald-600">{totalPresentes}</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase">Sin Registro</span>
                  <Clock size={18} className="text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-amber-600">{sinRegistro < 0 ? 0 : sinRegistro}</p>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por trabajador o rancho..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                    <th className="p-4">Trabajador</th>
                    <th className="p-4">Cuadrilla / Rancho</th>
                    <th className="p-4">Hora Entrada</th>
                    <th className="p-4">Salida a comer</th>
                    <th className="p-4">Regreso comida</th>
                    <th className="p-4">Tiempo comida</th>
                    <th className="p-4">Hora Salida</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {trabajadoresFiltrados?.map((trabajador) => {
                    const registro = asistenciasHoy.find(a => a.trabajadorId === trabajador.id);
                    const siguientePaso = obtenerSiguientePaso(registro);
                    const estado = !registro
                      ? 'Sin entrada'
                      : registro.horaSalida
                        ? 'Turno finalizado'
                        : registro.horaSalidaComida && !registro.horaRegresoComida
                          ? 'En comida'
                          : 'En turno';
                    return (
                      <tr key={trabajador.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-semibold text-slate-800">{trabajador.nombre}</td>
                        <td className="p-4 text-slate-600">
                          <div>{trabajador.cuadrilla}</div>
                          <div className="text-xs text-slate-400">{trabajador.rancho}</div>
                        </td>
                        <td className="p-4 text-slate-600">{registro ? registro.horaEntrada : '--:--'}</td>
                        <td className="p-4 text-slate-600">{registro?.horaSalidaComida ?? '--:--'}</td>
                        <td className="p-4 text-slate-600">{registro?.horaRegresoComida ?? '--:--'}</td>
                        <td className="p-4 text-slate-600">{formatearDuracionComida(registro)}</td>
                        <td className="p-4 text-slate-600">{registro?.horaSalida ?? '--:--'}</td>
                        <td className="p-4">
                          {registro ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              <CheckCircle2 size={12} /> {estado}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              Sin Entrada
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {siguientePaso && (
                            <button
                              onClick={() => void marcarAsistencia(trabajador)}
                              className="px-3 py-1.5 bg-[#2e6f40] text-white text-xs font-semibold rounded-lg hover:bg-[#235732] transition"
                            >
                              Marcar {nombrePasoMarcacion(siguientePaso)}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </>
        ) : tabActual === 'checador' && canView('checador') ? (
          <ChecadorFacial />
        ) : tabActual === 'personal' && canView('personal') ? (
          <GestionPersonal />
        ) : tabActual === 'reportes' && canView('reportes') ? (
          <ReportesExportar />
        ) : tabActual === 'usuarios' && profile.role === 'admin' ? (
          <AdministrarUsuarios />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Tu cuenta todavía no tiene permisos para ver módulos. Solicita acceso al administrador de TI.
          </div>
        )}
      </main>
      <SyncManager profile={profile} />
    </div>
  );
}
