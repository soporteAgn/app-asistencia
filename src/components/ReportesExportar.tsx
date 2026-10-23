'use client';

import React, { useState } from 'react';
import { db, type Trabajador } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/lib/auth';
import { formatearDuracionComida } from '@/lib/asistencia';
import { Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const RANCHOS_LISTA = ['Todos', 'Rancho El Paraíso', 'Rancho La Esperanza', 'Rancho San Miguel', 'Rancho Los Olivos'];

type FilaReporte = {
  trabajadorId?: number;
  trabajador: string;
  cuadrilla: string;
  rancho: string;
  fecha: string;
  estado: 'Asistencia' | 'Falta' | 'Vacaciones' | 'Vacaciones con asistencia' | 'Pendiente';
  horaEntrada: string;
  horaSalidaComida: string;
  horaRegresoComida: string;
  duracionComida: string;
  horaSalida: string;
  sincronizacion: string;
};

function valorFecha(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function fechaDesdeValor(valor: string) {
  const [anio, mes, dia] = valor.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function minutosDesdeHora(hora: string) {
  const partes = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!partes) return null;
  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

function minutosDeSalidaProgramada(trabajador: Trabajador) {
  return minutosDesdeHora(trabajador.horaSalidaProgramada ?? '17:00');
}

function tieneVacacionesAutorizadas(trabajador: Trabajador | undefined, fecha: string) {
  return Boolean(
    trabajador?.vacacionesInicio &&
    trabajador.vacacionesFin &&
    trabajador.vacacionesInicio <= fecha &&
    trabajador.vacacionesFin >= fecha,
  );
}

export default function ReportesExportar() {
  const { user } = useAuth();
  const fechaHoy = valorFecha(new Date());
  const [fechaInicio, setFechaInicio] = useState(fechaHoy);
  const [fechaFin, setFechaFin] = useState(fechaHoy);
  const [ranchoFiltro, setRanchoFiltro] = useState('Todos');

  // Consultar todas las asistencias locales
  const asistencias = useLiveQuery(
    () => user ? db.asistencias.where('userId').equals(user.id).toArray() : [],
    [user?.id],
  );

  const trabajadores = useLiveQuery(
    () => user ? db.trabajadores.where('userId').equals(user.id).toArray() : [],
    [user?.id],
  );

  const exportarExcel = () => {
    if (!asistencias || !trabajadores) {
      alert('Espera a que termine de cargar la información para exportar.');
      return;
    }

    if (trabajadores.length === 0) {
      alert('No hay trabajadores sincronizados. Sincroniza el padrón para incluir faltas y vacaciones en el reporte.');
      return;
    }

    if (fechaInicio > fechaFin) {
      alert('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    const filtrados = asistencias.filter((asistencia) =>
      asistencia.fecha >= fechaInicio &&
      asistencia.fecha <= fechaFin &&
      (ranchoFiltro === 'Todos' || asistencia.rancho === ranchoFiltro),
    );
    const personalActivo = trabajadores.filter((trabajador) =>
      trabajador.estado === 'Activo' &&
      (ranchoFiltro === 'Todos' || trabajador.rancho === ranchoFiltro),
    );
    const marcacionesPorDia = new Set(
      filtrados.map((asistencia) => `${asistencia.trabajadorId}|${asistencia.fecha}`),
    );
    const trabajadoresPorId = new Map<number, Trabajador>();
    for (const trabajador of trabajadores) {
      if (typeof trabajador.id === 'number') {
        trabajadoresPorId.set(trabajador.id, trabajador);
      }
    }
    const filas: FilaReporte[] = filtrados.map((asistencia) => ({
      trabajadorId: asistencia.trabajadorId,
      trabajador: asistencia.nombre,
      cuadrilla: asistencia.cuadrilla,
      rancho: asistencia.rancho,
      fecha: asistencia.fecha,
      estado: fechaDesdeValor(asistencia.fecha).getDay() !== 0 &&
        tieneVacacionesAutorizadas(trabajadoresPorId.get(asistencia.trabajadorId), asistencia.fecha)
        ? 'Vacaciones con asistencia'
        : 'Asistencia',
      horaEntrada: asistencia.horaEntrada,
      horaSalidaComida: asistencia.horaSalidaComida ?? '',
      horaRegresoComida: asistencia.horaRegresoComida ?? '',
      duracionComida: formatearDuracionComida(asistencia),
      horaSalida: asistencia.horaSalida ?? '',
      sincronizacion: asistencia.sincronizado ? 'Sincronizado' : 'Pendiente (Offline)',
    }));

    const ahora = new Date();
    const hoy = valorFecha(ahora);
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const fechaActual = fechaDesdeValor(fechaInicio);
    const fechaFinal = fechaDesdeValor(fechaFin);

    for (const trabajador of personalActivo) {
      if (typeof trabajador.id !== 'number') {
        alert(`No se pudo identificar al trabajador ${trabajador.nombre}. Sincroniza el personal e inténtalo de nuevo.`);
        return;
      }

      const fecha = new Date(fechaActual);
      while (fecha <= fechaFinal) {
        const fechaRegistro = valorFecha(fecha);
        if (fecha.getDay() !== 0 && !marcacionesPorDia.has(`${trabajador.id}|${fechaRegistro}`)) {
          const estaDeVacaciones = tieneVacacionesAutorizadas(trabajador, fechaRegistro);
          let horarioCerrado = fechaRegistro < hoy;
          if (!estaDeVacaciones && fechaRegistro === hoy) {
            const minutoCierre = minutosDeSalidaProgramada(trabajador);
            if (minutoCierre === null) {
              alert(`El horario de salida de ${trabajador.nombre} no es válido.`);
              return;
            }
            horarioCerrado = minutosAhora >= minutoCierre;
          }
          const estado: FilaReporte['estado'] = estaDeVacaciones
            ? 'Vacaciones'
            : horarioCerrado
              ? 'Falta'
              : 'Pendiente';

          filas.push({
            trabajadorId: trabajador.id,
            trabajador: trabajador.nombre,
            cuadrilla: trabajador.cuadrilla,
            rancho: trabajador.rancho,
            fecha: fechaRegistro,
            estado,
            horaEntrada: '',
            horaSalidaComida: '',
            horaRegresoComida: '',
            duracionComida: '--',
            horaSalida: '',
            sincronizacion: '',
          });
        }
        fecha.setDate(fecha.getDate() + 1);
      }
    }

    filas.sort((a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      a.trabajador.localeCompare(b.trabajador, 'es'),
    );

    if (filas.length === 0) {
      alert('No se encontraron asistencias ni días laborables para el rango y rancho seleccionados.');
      return;
    }

    const detalle = filas.map((fila, index) => ({
      'No.': index + 1,
      'Trabajador': fila.trabajador,
      'Cuadrilla': fila.cuadrilla,
      'Rancho': fila.rancho,
      'Fecha': fila.fecha,
      'Estado': fila.estado,
      'Hora de Entrada': fila.horaEntrada,
      'Salida a Comer': fila.horaSalidaComida,
      'Regreso de Comida': fila.horaRegresoComida,
      'Duración de Comida': fila.duracionComida,
      'Hora de Salida': fila.horaSalida,
      'Estado de Sincronización': fila.sincronizacion,
    }));
    const resumenPorTrabajador = new Map<string, {
      trabajador: string;
      cuadrilla: string;
      rancho: string;
      asistencias: number;
      faltas: number;
      vacaciones: number;
      pendientes: number;
    }>();

    for (const fila of filas) {
      const clave = String(fila.trabajadorId ?? `${fila.trabajador}|${fila.cuadrilla}|${fila.rancho}`);
      const resumen = resumenPorTrabajador.get(clave) ?? {
        trabajador: fila.trabajador,
        cuadrilla: fila.cuadrilla,
        rancho: fila.rancho,
        asistencias: 0,
        faltas: 0,
        vacaciones: 0,
        pendientes: 0,
      };
      if (fila.estado === 'Asistencia' || fila.estado === 'Vacaciones con asistencia') resumen.asistencias++;
      if (fila.estado === 'Falta') resumen.faltas++;
      if (fila.estado === 'Vacaciones' || fila.estado === 'Vacaciones con asistencia') resumen.vacaciones++;
      if (fila.estado === 'Pendiente') resumen.pendientes++;
      resumenPorTrabajador.set(clave, resumen);
    }

    const hojaDetalle = XLSX.utils.json_to_sheet(detalle);
    const hojaResumen = XLSX.utils.json_to_sheet(
      Array.from(resumenPorTrabajador.values())
        .sort((a, b) => a.trabajador.localeCompare(b.trabajador, 'es'))
        .map((resumen) => ({
          'Trabajador': resumen.trabajador,
          'Cuadrilla': resumen.cuadrilla,
          'Rancho': resumen.rancho,
          'Asistencias': resumen.asistencias,
          'Faltas': resumen.faltas,
          'Días de vacaciones': resumen.vacaciones,
          'Pendientes': resumen.pendientes,
        })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, hojaDetalle, 'Asistencias');
    XLSX.utils.book_append_sheet(workbook, hojaResumen, 'Resumen');

    XLSX.writeFile(workbook, `Reporte_Asistencia_${fechaInicio}_al_${fechaFin}.xlsx`);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FileSpreadsheet className="text-[#2e6f40]" size={28} />
        <div>
          <h2 className="text-xl font-bold text-[#1a3821]">Exportar a Excel</h2>
          <p className="text-xs text-slate-500">Asistencias, faltas y vacaciones por día laborable</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label htmlFor="fecha-inicio" className="block text-xs font-semibold text-slate-600 mb-1">Fecha inicio</label>
          <input
            id="fecha-inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
          />
        </div>
        
        <div>
          <label htmlFor="fecha-fin" className="block text-xs font-semibold text-slate-600 mb-1">Fecha Fin</label>
          <input
            id="fecha-fin"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Filtrar por Rancho</label>
          <select
            value={ranchoFiltro} 
            onChange={(e) => setRanchoFiltro(e.target.value)}
            className="w-full p-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#2e6f40]"
          >
            {RANCHOS_LISTA.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-[#f4f6f4] p-4 rounded-xl border border-slate-200 flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-700 text-sm">Información local disponible</p>
          <p className="text-xs text-slate-500">
            {trabajadores?.length || 0} trabajadores · {asistencias?.length || 0} asistencias
          </p>
        </div>

        <button
          onClick={exportarExcel}
          disabled={!asistencias || !trabajadores}
          className="px-5 py-2.5 bg-[#2e6f40] hover:bg-[#235732] disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg shadow transition flex items-center gap-2 text-sm"
        >
          <Download size={18} /> Descargar Excel (.xlsx)
        </button>
      </div>
    </div>
  );
}
