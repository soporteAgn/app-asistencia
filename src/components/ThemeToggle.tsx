'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

const CLAVE_TEMA = 'control-asistencia-tema';
const EVENTO_TEMA = 'control-asistencia-cambio-tema';

/**inicia los cambios de temas**/
function suscribirTema(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENTO_TEMA, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENTO_TEMA, callback);
  };
}

function leerTemaGuardado() {
  return window.localStorage.getItem(CLAVE_TEMA) === 'oscuro';
}

export default function ThemeToggle() {
  const oscuro = useSyncExternalStore(suscribirTema, leerTemaGuardado, () => false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro);
  }, [oscuro]);

  const alternarTema = () => {
    const temaNuevo = !oscuro;
    window.localStorage.setItem(CLAVE_TEMA, temaNuevo ? 'oscuro' : 'claro');
    window.dispatchEvent(new Event(EVENTO_TEMA));
  };

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={oscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
      aria-pressed={oscuro}
      title={oscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
      className="fixed right-4 top-4 z-[60] inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-lg transition hover:bg-slate-50 dark-mode-toggle"
    >
      {oscuro ? <Sun size={17} /> : <Moon size={17} />}
      <span className="hidden sm:inline">{oscuro ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  );
}
