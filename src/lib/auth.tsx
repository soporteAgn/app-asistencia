'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, supabaseIsConfigured } from '@/lib/supabase';
import type { Modulo, Perfil } from '@/lib/permissions';

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: Perfil | null;
  error: string | null;
  passwordRecovery: boolean;
  canView: (modulo: Modulo) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const CACHE_PREFIX = 'campo-sync-profile:';

function guardarPerfilEnCache(perfil: Perfil) {
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${perfil.id}`, JSON.stringify(perfil));
  } catch (error) {
    console.error('No se pudo guardar el perfil offline:', error);
  }
}

function leerPerfilDeCache(id: string): Perfil | null {
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${id}`);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      value.id === id &&
      'role' in value &&
      (value.role === 'admin' || value.role === 'user') &&
      'permissions' in value &&
      Array.isArray(value.permissions)
    ) {
      return value as Perfil;
    }
  } catch (error) {
    console.error('No se pudo leer el perfil offline:', error);
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = supabaseIsConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Perfil | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const cargarPerfil = useCallback(async (session: Session | null) => {
    if (!session) {
      setUser(null);
      setProfile(null);
      setError(null);
      setPasswordRecovery(false);
      setLoading(false);
      return;
    }

    setUser(session.user);
    const cache = leerPerfilDeCache(session.user.id);
    if (cache) {
      setProfile(cache);
      setLoading(false);
    }

    try {
      const { data, error: profileError } = await getSupabaseBrowserClient()
        .from('profiles')
        .select('id, email, full_name, role, permissions')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;
      const perfil = data as Perfil;
      guardarPerfilEnCache(perfil);
      setProfile(perfil);
      setError(null);
    } catch {
      if (!cache) {
        setProfile(null);
        setError(navigator.onLine
          ? 'No fue posible cargar tu perfil. Pide al administrador que verifique tu cuenta.'
          : 'No hay un perfil guardado en este dispositivo. Conéctate a internet para iniciar sesión por primera vez.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let vigente = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!vigente) return;
      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }
      void cargarPerfil(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (vigente) {
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
        window.setTimeout(() => {
          if (vigente) void cargarPerfil(session);
        }, 0);
      }
    });
    return () => {
      vigente = false;
      listener.subscription.unsubscribe();
    };
  }, [configured, cargarPerfil]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error: signInError } = await getSupabaseBrowserClient().auth
      .signInWithPassword({ email, password });
    if (signInError) throw signInError;
    await cargarPerfil(data.session);
  }, [cargarPerfil]);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await getSupabaseBrowserClient().auth.signOut();
    if (signOutError) throw signOutError;
    setPasswordRecovery(false);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error: resetError } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(
      email,
      { redirectTo: window.location.origin },
    );
    if (resetError) throw resetError;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error: updateError } = await getSupabaseBrowserClient().auth.updateUser({ password });
    if (updateError) throw updateError;
    setPasswordRecovery(false);
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    await cargarPerfil(data.session);
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [cargarPerfil]);

  const refreshProfile = useCallback(async () => {
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    await cargarPerfil(data.session);
  }, [cargarPerfil]);

  const value = useMemo<AuthContextValue>(() => ({
    configured,
    loading,
    user,
    profile,
    error,
    passwordRecovery,
    canView: (modulo) => profile?.role === 'admin' || Boolean(profile?.permissions.includes(modulo)),
    signIn,
    sendPasswordReset,
    updatePassword,
    signOut,
    refreshProfile,
  }), [configured, loading, user, profile, error, passwordRecovery, signIn, sendPasswordReset, updatePassword, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
