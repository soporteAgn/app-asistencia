"use client";
import React, { useState } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function PantallaLogin({
  errorSesion,
}: {
  errorSesion: string | null;
}) {
  const { signIn, sendPasswordReset } = useAuth();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
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
      setError(
        loginError instanceof Error
          ? loginError.message
          : "No fue posible iniciar sesión.",
      );
    } finally {
      setCargando(false);
    }
  };

  const recuperarContrasena = async () => {
    setError(null);
    setMensaje(null);
    if (!correo.trim()) {
      setError(
        "Escribe tu correo electrónico y luego pulsa “¿Olvidaste tu contraseña?”.",
      );
      return;
    }
    setCargando(true);
    try {
      await sendPasswordReset(correo.trim());
      setMensaje(
        "Si el correo está registrado, recibirás un enlace para crear una contraseña nueva. Revisa también correo no deseado.",
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "No fue posible enviar el correo de recuperación.",
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f4] p-4 " >
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl bg-[#ebf3ed] text-[#2e6f40]">
            <img
              src="/logo.png"
              alt="Logo de Agrícola Nieto"
              width={80}
              height={80}
              className="size-20 rounded-2xl object-contain"
            />
          </div>
          <p className="text-sm font-semibold text-[#2e6f40]">Agrícola Nieto</p>
          <h1 className="mt-2 text-2xl font-bold text-[#1a3821]">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ingresa con tu cuenta autorizada
          </p>
        </div>
        <form onSubmit={entrar} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Correo electrónico
            <input
              type="email"
              autoComplete="username"
              required
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={contrasena}
              onChange={(event) => setContrasena(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            >
              {error}
            </p>
          )}
          {mensaje && (
            <p
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {mensaje}
            </p>
          )}
          <button
            disabled={cargando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2e6f40] px-4 py-3 font-semibold text-white transition hover:bg-[#235732] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <LockKeyhole size={18} />
            )}
            Entrar
          </button>
          <button
            type="button"
            onClick={() => void recuperarContrasena()}
            disabled={cargando}
            className="w-full py-2 text-sm font-medium text-[#2e6f40] hover:underline disabled:opacity-60"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>
        
      </section>
    </main>
  );
}
