'use client';

import React, { useState } from 'react';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function PantallaNuevaContrasena() {
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
