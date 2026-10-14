'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CloudUpload, Wifi, WifiOff } from 'lucide-react';
import { db } from '@/lib/db';
import { syncUserData } from '@/lib/data-sync';
import type { Perfil } from '@/lib/permissions';

function detalleError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (!error || typeof error !== 'object') {
    return 'No se pudieron sincronizar los datos. Se reintentará al recuperar la conexión.';
  }

  const detalle = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  const partes = [detalle.message, detalle.details, detalle.hint]
    .filter((parte): parte is string => typeof parte === 'string' && parte.length > 0);
  const mensaje = partes.join(' ');
  const columnasMarcaciones = /hora_salida_comida|hora_regreso_comida|hora_salida/.test(mensaje);

  if (
    columnasMarcaciones &&
    (detalle.code === 'PGRST204' || detalle.code === '42703' || /column .* does not exist|schema cache/i.test(mensaje))
  ) {
    return 'Supabase aún no tiene las columnas nuevas de asistencia. Ejecuta el archivo supabase/migrations/202610140001_attendance_punches.sql en el SQL Editor de tu proyecto y vuelve a sincronizar.';
  }

  return mensaje
    ? `${typeof detalle.code === 'string' ? `[${detalle.code}] ` : ''}${mensaje}`
    : 'No se pudieron sincronizar los datos. Se reintentará al recuperar la conexión.';
}

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
      const detalle = detalleError(error);
      console.error('Error al sincronizar datos con Supabase:', detalle, error);
      setMensajeSync(`No se pudo sincronizar: ${detalle}`);
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
