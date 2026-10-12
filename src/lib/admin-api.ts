import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import type { Modulo } from '@/lib/permissions';

const PERMISOS_VALIDOS = new Set<Modulo>(['asistencia', 'checador', 'personal', 'reportes']);
type AdminAuth =
  | { adminClient: SupabaseClient; error: null; status: 200; userId: string }
  | { error: string; status: 401 | 403 | 500 | 503 };

export function normalizarPermisos(value: unknown): Modulo[] | null {
  if (!Array.isArray(value) || !value.every(
    (item): item is Modulo => typeof item === 'string' && PERMISOS_VALIDOS.has(item as Modulo),
  )) return null;
  return [...new Set(value)];
}

export async function obtenerClienteAdmin(request: NextRequest): Promise<AdminAuth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return { error: 'La configuración segura de Supabase está incompleta.', status: 503 as const };
  }

  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return { error: 'Se requiere una sesión válida.', status: 401 as const };

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: 'La sesión no es válida o expiró.', status: 401 as const };
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await adminClient.from('profiles')
    .select('role').eq('id', authData.user.id).maybeSingle();
  if (profileError) {
    console.error('No se pudo verificar el rol administrativo:', profileError);
    return { error: 'No fue posible verificar los permisos administrativos.', status: 500 as const };
  }
  if (profile?.role !== 'admin') {
    return { error: 'Solo un administrador de TI puede gestionar usuarios.', status: 403 as const };
  }

  return { adminClient, error: null, status: 200, userId: authData.user.id };
}
