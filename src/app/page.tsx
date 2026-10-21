'use client';

import { useAuth } from '@/lib/auth';
import AplicacionAsistencia from '@/components/AplicacionAsistencia';
import PantallaLogin from '@/components/PantallaLogin';
import PantallaNuevaContrasena from '@/components/PantallaNuevaContrasena';
import { LoaderCircle } from 'lucide-react';

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
