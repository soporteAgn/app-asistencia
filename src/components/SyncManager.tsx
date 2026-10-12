'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CloudUpload, Wifi, WifiOff } from 'lucide-react';
import { db } from '@/lib/db';
import { syncUserData } from '@/lib/data-sync';
import type { Perfil } from '@/lib/permissions';

export default function SyncManager({ profile }: { profile: Perfil }) {
  const [estaEnLinea, setEstaEnLinea] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true,
  );
  const [sincronizando, setSincronizando] = useState(false);
  const [mensajeSync, setMensajeSync] = useState<string | null>(null);
  const lock = useRef(false);
  const pendientes = useLiveQuery(async () => {
    const [asistencias, trabajadores] = await Promise.all([
      db.asistencias.where('userId').equals(profile.id).toArray(),
      db.trabajadores.where('userId').equals(profile.id).toArray(),
    ]);
    return asistencias.filter((row) => !row.sincronizado).length +
      trabajadores.filter((row) => !row.sincronizado).length;
  }, [profile.id]) ?? 0;

  const sincronizar = useCallback(async () => {
    if (!navigator.onLine || lock.current) return;
    lock.current = true;
    setSincronizando(true);
    try {
      await syncUserData(profile.id, profile.role, profile.permissions);
      setMensajeSync(null);
    } catch (error) {
      console.error('Error al sincronizar datos con Supabase:', error);
      setMensajeSync(error instanceof Error
        ? `No se pudo sincronizar: ${error.message}`
        : 'No se pudieron sincronizar los datos. Se reintentará al recuperar la conexión.');
    } finally {
      lock.current = false;
      setSincronizando(false);
    }
  }, [profile]);

  useEffect(() => {
    const handleOnline = () => {
      setEstaEnLinea(true);
      void sincronizar();
    };
    const handleOffline = () => setEstaEnLinea(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const timer = navigator.onLine
      ? window.setTimeout(() => { void sincronizar(); }, 0)
      : undefined;

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sincronizar, pendientes]);

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 flex flex-col items-start gap-2 sm:bottom-4 sm:left-auto sm:right-4">
      <div className={`flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold shadow-lg ${
        estaEnLinea
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
          : 'border-amber-300 bg-amber-50 text-amber-800'
      }`}>
        {estaEnLinea
          ? <Wifi size={14} className="shrink-0 text-emerald-600" />
          : <WifiOff size={14} className="shrink-0 text-amber-600" />}
        <span>{estaEnLinea ? 'Conectado' : 'Modo offline'}</span>
        {pendientes > 0 && (
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-white">
            {sincronizando ? 'Sincronizando...' : `${pendientes} pendiente(s)`}
          </span>
        )}
      </div>
      {mensajeSync && (
        <div role="status" className="max-w-full rounded-lg bg-rose-900 px-4 py-2 text-xs text-white shadow-xl">
          <CloudUpload size={14} className="mr-2 inline text-rose-200" />
          {mensajeSync}
        </div>
      )}
    </div>
  );
}
