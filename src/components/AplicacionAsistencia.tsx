'use client';

import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import ChecadorFacial from '@/components/ChecadorFacial';
import GestionPersonal from '@/components/GestionPersonal';
import ReportesExportar from '@/components/ReportesExportar';
import SyncManager from '@/components/SyncManager';
import AdministrarUsuarios from '@/components/AdministrarUsuarios';
import { db, type Trabajador } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/lib/auth';
import type { Perfil, Modulo } from '@/lib/permissions';
import PanelAsistencia from '@/components/PanelAsistencia';
import {
  Users,
  UserCheck,
  Camera,
  Menu,
  X,
  FileSpreadsheet,
  ShieldCheck,
  LogOut
} from 'lucide-react';

export default function AplicacionAsistencia({ user, profile }: { user: User; profile: Perfil }) {
  const { signOut } = useAuth();
  const canView = (modulo: Modulo) =>
    profile.role === 'admin' || profile.permissions.includes(modulo);
  type Tab = 'asistencia' | 'checador' | 'personal' | 'reportes' | 'usuarios';
  const [tabActual, setTabActual] = useState<Tab>(() => {
    if (profile.role === 'admin' || profile.permissions.includes('asistencia')) return 'asistencia';
    return (['checador', 'personal', 'reportes'] as const)
      .find((modulo) => profile.permissions.includes(modulo)) ?? 'asistencia';
  });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setAhora(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

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
            {(canView('checador') || canView('asistencia')) && (
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
                <FileSpreadsheet size={18} /> Reportes 
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
                {tabActual === 'asistencia' ? 'Asistencia del día'
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
          <PanelAsistencia trabajadores={trabajadores} asistencias={asistencias} ahora={ahora} />
        ) : tabActual === 'checador' && (canView('checador') || canView('asistencia')) ? (
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
