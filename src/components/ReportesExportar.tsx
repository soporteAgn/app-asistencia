'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/lib/auth';
import { formatearDuracionComida } from '@/lib/asistencia';
import { Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const RANCHOS_LISTA = ['Todos', 'Rancho El Paraíso', 'Rancho La Esperanza', 'Rancho San Miguel', 'Rancho Los Olivos'];

function valorFecha(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
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

  const exportarExcel = () => {
    if (!asistencias || asistencias.length === 0) {
      alert('No hay registros de asistencia guardados en la tablet para exportar.');
      return;
    }

    // Filtrar registros según fechas y rancho seleccionado
    const filtrados = asistencias.filter(a => {
      const cumpleFecha = a.fecha >= fechaInicio && a.fecha <= fechaFin;
      const cumpleRancho = ranchoFiltro === 'Todos' || a.rancho === ranchoFiltro;
      return cumpleFecha && cumpleRancho;
    });

    if (filtrados.length === 0) {
      alert('No se encontraron registros para el rango de fechas y rancho seleccionados.');
      return;
    }

    // Mapear los datos limpios para la hoja de Excel
    const datosParaExcel = filtrados.map((item, index) => ({
      'No.': index + 1,
      'Trabajador': item.nombre,
      'Cuadrilla': item.cuadrilla,
      'Rancho': item.rancho,
      'Fecha': item.fecha,
      'Hora de Entrada': item.horaEntrada,
      'Salida a Comer': item.horaSalidaComida ?? '',
      'Regreso de Comida': item.horaRegresoComida ?? '',
      'Duración de Comida': formatearDuracionComida(item),
      'Hora de Salida': item.horaSalida ?? '',
      'Estado de Sincronización': item.sincronizado ? 'Sincronizado' : 'Pendiente (Offline)'
    }));

    // Crear el libro de trabajo (Workbook) con SheetJS
    const worksheet = XLSX.utils.json_to_sheet(datosParaExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencias");

    // Descargar el archivo .xlsx 
    XLSX.writeFile(workbook, `Reporte_Asistencia_${fechaInicio}_al_${fechaFin}.xlsx`);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FileSpreadsheet className="text-[#2e6f40]" size={28} />
        <div>
          <h2 className="text-xl font-bold text-[#1a3821]">Exportar a Excel</h2>
          {/* Falta agregar faltas al exportar */}
          <p className="text-xs text-slate-500">Incluye entrada, salida, marcaciones de comida y su duración calculada.</p>

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
          <p className="font-semibold text-slate-700 text-sm">Registros totales en la tablet</p>
          <p className="text-xs text-slate-500">Total en base de datos local: {asistencias?.length || 0} registros</p>
        </div>

        <button
          onClick={exportarExcel}
          className="px-5 py-2.5 bg-[#2e6f40] hover:bg-[#235732] text-white font-semibold rounded-lg shadow transition flex items-center gap-2 text-sm"
        >
          <Download size={18} /> Descargar Excel (.xlsx)
        </button>
      </div>
    </div>
  );
}
