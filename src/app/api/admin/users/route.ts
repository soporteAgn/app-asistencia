import { NextRequest, NextResponse } from 'next/server';
import { MODULOS, type Modulo } from '@/lib/permissions';
import { normalizarPermisos, obtenerClienteAdmin } from '@/lib/admin-api';

const PERMISOS_ADMIN = MODULOS.map(({ id }) => id);

export async function GET(request: NextRequest) {
  const auth = await obtenerClienteAdmin(request);
  if (!('adminClient' in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.adminClient.from('profiles')
    .select('id, email, full_name, role, permissions, created_at')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('No se pudo consultar la lista de usuarios:', error);
    return NextResponse.json({ error: 'No fue posible cargar los usuarios.' }, { status: 500 });
  }
  return NextResponse.json({ users: data });
}

export async function POST(request: NextRequest) {
  const auth = await obtenerClienteAdmin(request);
  if (!('adminClient' in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la solicitud no es JSON válido.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Faltan los datos del usuario.' }, { status: 400 });
  }

  const { email, fullName, role, permissions } = body as Record<string, unknown>;
  const permisos = normalizarPermisos(permissions);
  if (
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof fullName !== 'string' ||
    !fullName.trim() ||
    (role !== 'admin' && role !== 'user') ||
    !permisos
  ) {
    return NextResponse.json({ error: 'Revisa el correo, nombre, rol y permisos seleccionados.' }, { status: 400 });
  }

  const { data, error } = await auth.adminClient.auth.admin.inviteUserByEmail(email.trim(), {
    data: { full_name: fullName.trim() },
  });
  if (error || !data.user) {
    if (error) console.error('No se pudo invitar al usuario:', error);
    return NextResponse.json({ error: error?.message ?? 'No se pudo crear la invitación.' }, { status: 400 });
  }

  const { error: profileError } = await auth.adminClient.from('profiles')
    .update({
      full_name: fullName.trim(),
      role,
      permissions: role === 'admin' ? PERMISOS_ADMIN : permisos,
    })
    .eq('id', data.user.id);
  if (profileError) {
    console.error('Se creó la invitación pero falló la asignación de permisos:', profileError);
    return NextResponse.json({
      error: 'La invitación se envió, pero no se asignaron los permisos. Revisa el perfil antes de usar la cuenta.',
    }, { status: 500 });
  }

  return NextResponse.json({ message: 'Invitación enviada correctamente.' }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await obtenerClienteAdmin(request);
  if (!('adminClient' in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la solicitud no es JSON válido.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Faltan los datos a actualizar.' }, { status: 400 });
  }

  const { id, role, permissions } = body as Record<string, unknown>;
  const permisos: Modulo[] | null = normalizarPermisos(permissions);
  if (
    typeof id !== 'string' ||
    (role !== 'admin' && role !== 'user') ||
    !permisos
  ) {
    return NextResponse.json({ error: 'El rol o los permisos no son válidos.' }, { status: 400 });
  }
  if (id === auth.userId && role !== 'admin') {
    return NextResponse.json({ error: 'No puedes quitarte a ti mismo el rol de administrador.' }, { status: 400 });
  }
  if (role !== 'admin') {
    const { count, error: countError } = await auth.adminClient.from('profiles')
      .select('id', { count: 'exact', head: true }).eq('role', 'admin');
    if (countError) {
      console.error('No se pudo comprobar el número de administradores:', countError);
      return NextResponse.json({ error: 'No fue posible comprobar los administradores.' }, { status: 500 });
    }
    const { data: target, error: targetError } = await auth.adminClient.from('profiles')
      .select('role').eq('id', id).maybeSingle();
    if (targetError) {
      console.error('No se pudo comprobar el usuario a actualizar:', targetError);
      return NextResponse.json({ error: 'No fue posible comprobar el usuario.' }, { status: 500 });
    }
    if (target?.role === 'admin' && (count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Debe permanecer al menos un administrador.' }, { status: 400 });
    }
  }

  const { error } = await auth.adminClient.from('profiles')
    .update({ role, permissions: role === 'admin' ? PERMISOS_ADMIN : permisos })
    .eq('id', id);
  if (error) {
    console.error('No se pudieron actualizar los permisos del usuario:', error);
    return NextResponse.json({ error: 'No fue posible guardar los cambios.' }, { status: 500 });
  }
  return NextResponse.json({ message: 'Permisos actualizados.' });
}
