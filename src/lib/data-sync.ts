import { db, type Puesto, type Rancho, type RegistroAsistencia, type Trabajador } from '@/lib/db';
import type { Modulo } from '@/lib/permissions';
import { getSupabaseBrowserClient } from '@/lib/supabase';

type TrabajadorRemoto = {
  id: string;
  user_id: string;
  nombre: string;
  cuadrilla: string;
  rancho: string;
  estado: Trabajador['estado'];
  puesto: string | null;
  hora_entrada_programada: string | null;
  hora_salida_programada: string | null;
  vacaciones_inicio: string | null;
  vacaciones_fin: string | null;
};

type RanchoRemoto = {
  id: string;
  nombre: string;
  activo: boolean;
};

type PuestoRemoto = {
  id: string;
  nombre: string;
  hora_entrada: string;
  hora_salida: string;
  activo: boolean;
};

type AsistenciaRemota = {
  id: string;
  user_id: string;
  trabajador_id: string | null;
  nombre: string;
  cuadrilla: string;
  rancho: string;
  hora_entrada: string;
  hora_salida_comida: string | null;
  hora_regreso_comida: string | null;
  hora_salida: string | null;
  fecha: string;
};

export async function syncUserData(userId: string, role: string, permissions: Modulo[]) {
  if (!navigator.onLine) return;
  const puedeSincronizarPersonal = role === 'admin';
  const puedeLeerPersonal =
    role === 'admin' ||
    permissions.includes('personal') ||
    permissions.includes('asistencia') ||
    permissions.includes('checador');
  const puedeLeerAsistencias =
    role === 'admin' ||
    permissions.includes('asistencia') ||
    permissions.includes('checador') ||
    permissions.includes('reportes');
  const puedeRegistrarAsistencia =
    role === 'admin' ||
    permissions.includes('asistencia') ||
    permissions.includes('checador');

  if (role === 'admin') {
    await db.transaction('rw', db.trabajadores, db.asistencias, async () => {
      await db.trabajadores.filter((row) => !row.userId).modify({ userId, sincronizado: false });
      await db.asistencias.filter((row) => !row.userId).modify({ userId, sincronizado: false });
    });
  }

  const supabase = getSupabaseBrowserClient();

  if (!puedeLeerPersonal) {
    await db.trabajadores.where('userId').equals(userId).delete();
  }
  if (!puedeLeerAsistencias) {
    await db.asistencias.where('userId').equals(userId).delete();
  }

  if (puedeSincronizarPersonal) {
    const locales = await db.trabajadores.where('userId').equals(userId).toArray();
    for (const trabajador of locales.filter((row) => !row.sincronizado)) {
      if (!trabajador.id) continue;
      const cloudId = trabajador.cloudId ?? crypto.randomUUID();
      const { error } = await supabase.from('trabajadores').upsert({
        id: cloudId,
        user_id: userId,
        nombre: trabajador.nombre,
        cuadrilla: trabajador.cuadrilla,
        rancho: trabajador.rancho,
        estado: trabajador.estado,
        puesto: trabajador.puesto ?? null,
        hora_entrada_programada: trabajador.horaEntradaProgramada ?? null,
        hora_salida_programada: trabajador.horaSalidaProgramada ?? null,
        vacaciones_inicio: trabajador.vacacionesInicio ?? null,
        vacaciones_fin: trabajador.vacacionesFin ?? null,
      });
      if (error) throw error;
      await db.trabajadores.update(trabajador.id, { cloudId, sincronizado: true });
    }
  }

  if (puedeRegistrarAsistencia) {
    const pendientes = (await db.asistencias.where('userId').equals(userId).toArray())
      .filter((registro) => !registro.sincronizado);
    for (const registro of pendientes) {
      if (!registro.id) continue;
      const cloudId = registro.cloudId ?? crypto.randomUUID();
      const trabajador = await db.trabajadores.get(registro.trabajadorId);
      const { error } = await supabase.from('asistencias').upsert({
        id: cloudId,
        user_id: userId,
        trabajador_id: trabajador?.cloudId ?? null,
        nombre: registro.nombre,
        cuadrilla: registro.cuadrilla,
        rancho: registro.rancho,
        hora_entrada: registro.horaEntrada,
        hora_salida_comida: registro.horaSalidaComida ?? null,
        hora_regreso_comida: registro.horaRegresoComida ?? null,
        hora_salida: registro.horaSalida ?? null,
        fecha: registro.fecha,
      });
      if (error) throw error;
      await db.asistencias.update(registro.id, { cloudId, sincronizado: true });
    }
  }

  if (puedeLeerPersonal) {
    const { data, error } = await supabase.from('trabajadores')
      .select('id, user_id, nombre, cuadrilla, rancho, estado, puesto, hora_entrada_programada, hora_salida_programada, vacaciones_inicio, vacaciones_fin');
    if (error) throw error;
    await db.transaction('rw', db.trabajadores, async () => {
      for (const remoto of (data ?? []) as TrabajadorRemoto[]) {
        const local = await db.trabajadores.filter(
          (row) => row.userId === userId && row.cloudId === remoto.id,
        ).first();
        const valores: Omit<Trabajador, 'id'> = {
          cloudId: remoto.id,
          userId,
          sincronizado: true,
          nombre: remoto.nombre,
          cuadrilla: remoto.cuadrilla,
          rancho: remoto.rancho,
          estado: remoto.estado,
          puesto: remoto.puesto ?? undefined,
          horaEntradaProgramada: remoto.hora_entrada_programada?.slice(0, 5) ?? null,
          horaSalidaProgramada: remoto.hora_salida_programada?.slice(0, 5) ?? null,
          vacacionesInicio: remoto.vacaciones_inicio ?? null,
          vacacionesFin: remoto.vacaciones_fin ?? null,
          vectorFacial: local?.vectorFacial ?? null,
        };
        if (local?.id) {
          const coincide = local.nombre === valores.nombre &&
            local.cuadrilla === valores.cuadrilla &&
            local.rancho === valores.rancho &&
            local.estado === valores.estado &&
            local.puesto === valores.puesto &&
            local.horaEntradaProgramada === valores.horaEntradaProgramada &&
            local.horaSalidaProgramada === valores.horaSalidaProgramada &&
            local.vacacionesInicio === valores.vacacionesInicio &&
            local.vacacionesFin === valores.vacacionesFin &&
            local.sincronizado;
          if (!coincide) await db.trabajadores.update(local.id, valores);
        } else {
          await db.trabajadores.add(valores);
        }
      }

    });
  }

  if (puedeLeerPersonal) {
    const [{ data: ranchosData, error: ranchosError }, { data: puestosData, error: puestosError }] = await Promise.all([
      supabase.from('ranchos').select('id, nombre, activo'),
      supabase.from('puestos').select('id, nombre, hora_entrada, hora_salida, activo'),
    ]);
    if (ranchosError) throw ranchosError;
    if (puestosError) throw puestosError;
    await db.transaction('rw', db.ranchos, db.puestos, async () => {
      for (const remoto of (ranchosData ?? []) as RanchoRemoto[]) {
        const local = await db.ranchos.where('cloudId').equals(remoto.id).first();
        const valores: Omit<Rancho, 'id'> = {
          cloudId: remoto.id,
          nombre: remoto.nombre,
          activo: remoto.activo,
        };
        if (local?.id) await db.ranchos.update(local.id, valores);
        else await db.ranchos.add(valores);
      }
      for (const remoto of (puestosData ?? []) as PuestoRemoto[]) {
        const local = await db.puestos.where('cloudId').equals(remoto.id).first();
        const valores: Omit<Puesto, 'id'> = {
          cloudId: remoto.id,
          nombre: remoto.nombre,
          horaEntrada: remoto.hora_entrada.slice(0, 5),
          horaSalida: remoto.hora_salida.slice(0, 5),
          activo: remoto.activo,
        };
        if (local?.id) await db.puestos.update(local.id, valores);
        else await db.puestos.add(valores);
      }
    });
  }

  if (puedeLeerAsistencias) {
    const { data, error } = await supabase.from('asistencias')
      .select('id, user_id, trabajador_id, nombre, cuadrilla, rancho, hora_entrada, hora_salida_comida, hora_regreso_comida, hora_salida, fecha');
    if (error) throw error;
    await db.transaction('rw', db.trabajadores, db.asistencias, async () => {
      for (const remoto of (data ?? []) as AsistenciaRemota[]) {
        const local = await db.asistencias.filter(
          (row) => row.userId === userId && row.cloudId === remoto.id,
        ).first();
        const trabajador = remoto.trabajador_id
          ? await db.trabajadores.filter(
              (row) => row.userId === userId && row.cloudId === remoto.trabajador_id,
            ).first()
          : undefined;
        const valores: Omit<RegistroAsistencia, 'id'> = {
          cloudId: remoto.id,
          userId,
          trabajadorId: trabajador?.id ?? 0,
          nombre: remoto.nombre,
          cuadrilla: remoto.cuadrilla,
          rancho: remoto.rancho,
          horaEntrada: remoto.hora_entrada,
          horaSalidaComida: remoto.hora_salida_comida ?? undefined,
          horaRegresoComida: remoto.hora_regreso_comida ?? undefined,
          horaSalida: remoto.hora_salida ?? undefined,
          fecha: remoto.fecha,
          sincronizado: true,
        };
        if (local?.id) {
          const coincide = local.trabajadorId === valores.trabajadorId &&
            local.nombre === valores.nombre &&
            local.cuadrilla === valores.cuadrilla &&
            local.rancho === valores.rancho &&
            local.horaEntrada === valores.horaEntrada &&
            local.horaSalidaComida === valores.horaSalidaComida &&
            local.horaRegresoComida === valores.horaRegresoComida &&
            local.horaSalida === valores.horaSalida &&
            local.fecha === valores.fecha &&
            local.sincronizado;
          if (!coincide) await db.asistencias.update(local.id, valores);
        } else {
          await db.asistencias.add(valores);
        }
      }
    });
  }
}
