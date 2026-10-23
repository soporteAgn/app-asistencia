import { db, type RegistroAsistencia, type Trabajador } from '@/lib/db';

export type PasoMarcacion = 'entrada' | 'salidaComida' | 'regresoComida' | 'salida';

const NOMBRES_PASOS: Record<PasoMarcacion, string> = {
  entrada: 'entrada',
  salidaComida: 'salida a comer',
  regresoComida: 'regreso de comida',
  salida: 'salida final',
};

export function obtenerFechaLocal(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function obtenerHoraLocal(fecha = new Date()) {
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

export function obtenerSiguientePaso(registro?: RegistroAsistencia): PasoMarcacion | null {
  if (!registro) return 'entrada';
  if (!registro.horaSalidaComida) return 'salidaComida';
  if (!registro.horaRegresoComida) return 'regresoComida';
       if (!registro.horaSalida) return 'salida';
  return null;
}

export function nombrePasoMarcacion(paso: PasoMarcacion) {
  return NOMBRES_PASOS[paso];
}

export async function registrarSiguienteMarcacion(
  trabajador: Trabajador,
  userId: string,
  ahora = new Date(),
) {
  if (typeof trabajador.id !== 'number') {
    throw new Error('No se pudo identificar al trabajador para registrar la marcación.');
  }
  const trabajadorId = trabajador.id;
  const fecha = obtenerFechaLocal(ahora);
  const hora = obtenerHoraLocal(ahora);

  return db.transaction('rw', db.asistencias, async () => {
    const registro = await db.asistencias
      .where('fecha')
      .equals(fecha)
      .and((row) => row.trabajadorId === trabajadorId && row.userId === userId)
      .first();
    const paso = obtenerSiguientePaso(registro);

    if (!paso) throw new Error(`${trabajador.nombre} ya finalizó su turno hoy.`);

    if (registro) {
      if (!registro.id) throw new Error('No se pudo identificar el registro local de asistencia.');
      if (paso === 'entrada') throw new Error('El registro de asistencia ya existe y no tiene una siguiente marcación válida.');
      const horaAnterior = paso === 'regresoComida'
        ? registro.horaSalidaComida
        : paso === 'salida'
          ? registro.horaRegresoComida
          : registro.horaEntrada;
      const minutosActuales = minutosDesdeMedianoche(hora);
      const minutosAnteriores = minutosDesdeMedianoche(horaAnterior);
      if (minutosActuales === null || minutosAnteriores === null) {
        throw new Error('No se pudo validar el formato de hora de las marcaciones.');
      }
      if (minutosActuales <= minutosAnteriores) {
        throw new Error(`La hora de ${NOMBRES_PASOS[paso]} debe ser posterior a la marcación anterior (${horaAnterior}).`);
      }

      const campo: Record<Exclude<PasoMarcacion, 'entrada'>, keyof RegistroAsistencia> = {
        salidaComida: 'horaSalidaComida',
        regresoComida: 'horaRegresoComida',
        salida: 'horaSalida',
      };
      await db.asistencias.update(registro.id, {
        [campo[paso]]: hora,
        sincronizado: false,
      });
    } else {
      await db.asistencias.add({
        trabajadorId,
        nombre: trabajador.nombre,
        cuadrilla: trabajador.cuadrilla,
        rancho: trabajador.rancho,
        horaEntrada: hora,
        fecha,
        sincronizado: false,
        cloudId: crypto.randomUUID(),
        userId,
      });
    }

    return { paso, hora };
  });
}

function minutosDesdeMedianoche(hora?: string) {
  if (!hora) return null;

  const normalizada = hora
    .trim()
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b([AP])\s+M\b/g, '$1M')
    .toUpperCase();
  const partes = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/.exec(normalizada);
  if (!partes) return null;

  let horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  const meridiano = partes[3];
  if (minutos > 59) return null;

  if (meridiano) {
    if (horas < 1 || horas > 12) return null;
    if (meridiano === 'AM') horas = horas === 12 ? 0 : horas;
    else horas = horas === 12 ? 12 : horas + 12;
  } else if (horas > 23) {
    return null;
  }

  return horas * 60 + minutos;
}

export function obtenerDuracionComida(registro?: RegistroAsistencia) {
  const salida = minutosDesdeMedianoche(registro?.horaSalidaComida);
  const regreso = minutosDesdeMedianoche(registro?.horaRegresoComida);
  if (salida === null || regreso === null || regreso < salida) return null;
  return regreso - salida;
}



export function formatearDuracionComida(registro?: RegistroAsistencia) {
  const minutos = obtenerDuracionComida(registro);
  if (minutos !== null) {
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return horas > 0 ? `${horas} h ${resto} min` : `${resto} min`;
  }
  if (registro?.horaSalidaComida || registro?.horaRegresoComida) return 'Pendiente';
  return '--';
}
