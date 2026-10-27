"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { formatearDuracionComida, obtenerFechaLocal } from "@/lib/asistencia";
import type { RegistroAsistencia, Trabajador } from "@/lib/db";

type TrabajadorConId = Trabajador & { id: number };

type PanelAsistenciaProps = {
  trabajadores: TrabajadorConId[] | undefined;
  asistencias: RegistroAsistencia[] | undefined;
  ahora: Date;
};

export default function PanelAsistencia({
  trabajadores,
  asistencias,
  ahora,
}: PanelAsistenciaProps) {
  const [busqueda, setBusqueda] = useState("");

  const fechaHoy = obtenerFechaLocal(ahora);
  const trabajadoresActivos =
    trabajadores?.filter((trabajador) => trabajador.estado === "Activo") ?? [];
  const idsTrabajadoresActivos = new Set(
    trabajadoresActivos.map((trabajador) => trabajador.id),
  );
  const asistenciasHoy =
    asistencias?.filter(
      (registro) =>
        registro.fecha === fechaHoy &&
        idsTrabajadoresActivos.has(registro.trabajadorId),
    ) ?? [];
  const totalTrabajadores = trabajadoresActivos.length;
  const totalPresentes = asistenciasHoy.length;
  const trabajadoresConRegistro = new Set(
    asistenciasHoy.map((registro) => registro.trabajadorId),
  );
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
  const estaDeVacaciones = (trabajador: Trabajador) =>
    Boolean(
      trabajador.vacacionesInicio &&
      trabajador.vacacionesFin &&
      trabajador.vacacionesInicio <= fechaHoy &&
      trabajador.vacacionesFin >= fechaHoy,
    );
  const trabajadoresDeVacaciones =
    trabajadoresActivos.filter(estaDeVacaciones);
  const trabajadoresActivosSinVacaciones = trabajadoresActivos.filter(
    (trabajador) => !estaDeVacaciones(trabajador),
  );
  const sinRegistro = trabajadoresActivosSinVacaciones.filter(
    (trabajador) => !trabajadoresConRegistro.has(trabajador.id ?? -1),
  ).length;
  const faltas = trabajadoresActivos.filter((trabajador) => {
    if (
      estaDeVacaciones(trabajador) ||
      trabajadoresConRegistro.has(trabajador.id ?? -1)
    )
      return false;
    const horaProgramada = trabajador.horaSalidaProgramada
      ? /^(\d{2}):(\d{2})$/.exec(trabajador.horaSalidaProgramada)
      : null;
    const horaCierre = horaProgramada
      ? Number(horaProgramada[1]) * 60 + Number(horaProgramada[2])
      : 17 * 60;
    return minutosActuales >= horaCierre;
  }).length;

  const trabajadoresFiltrados = trabajadoresActivos.filter(
    (t) =>
      t.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.rancho.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">
              Personal Registrado
            </span>
            <Users size={18} className="text-[#2e6f40]" />
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {totalTrabajadores}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">
              De vacaciones
            </span>
            <CalendarDays size={18} className="text-sky-600" />
          </div>
          <p className="mb-2 text-3xl font-bold text-sky-600">
            {trabajadoresDeVacaciones.length}
          </p>
          {trabajadoresDeVacaciones.length > 0 ? (
            <ul className="max-h-28 divide-y divide-slate-100 overflow-y-auto">
              {trabajadoresDeVacaciones.map((trabajador) => (
                <li key={trabajador.id} className="py-1.5">
                  <p className="truncate text-xs font-medium text-slate-700">
                    {trabajador.nombre}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {trabajador.rancho}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">
              No hay personal de vacaciones hoy.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">
              Presentes Hoy
            </span>
            <UserCheck size={18} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">
            {totalPresentes}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">
              Sin Registro
            </span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-amber-600">{sinRegistro}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">
              Faltas al cierre del turno
            </span>
            <Clock size={18} className="text-rose-600" />
          </div>
          <p className="text-3xl font-bold text-rose-600">{faltas}</p>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por trabajador o rancho..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2e6f40]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="p-4">Trabajador</th>
                <th className="p-4">Cuadrilla / Rancho</th>
                <th className="p-4">Hora Entrada</th>
                <th className="p-4">Salida a comer</th>
                <th className="p-4">Regreso comida</th>
                <th className="p-4">Tiempo comida</th>
                <th className="p-4">Hora Salida</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {trabajadoresFiltrados?.map((trabajador) => {
                const registro = asistenciasHoy.find(
                  (a) => a.trabajadorId === trabajador.id,
                );
                const estaDeVacaciones = Boolean(
                  trabajador.vacacionesInicio &&
                  trabajador.vacacionesFin &&
                  trabajador.vacacionesInicio <= fechaHoy &&
                  trabajador.vacacionesFin >= fechaHoy,
                );
                const estado = estaDeVacaciones
                  ? "Vacaciones"
                  : !registro
                    ? "Sin entrada"
                    : registro.horaSalida
                      ? "Turno finalizado"
                      : registro.horaSalidaComida && !registro.horaRegresoComida
                        ? "En comida"
                        : "En turno";
                return (
                  <tr
                    key={trabajador.id}
                    className="hover:bg-slate-50 transition"
                  >
                    <td className="p-4 font-semibold text-slate-800">
                      {trabajador.nombre}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div>{trabajador.cuadrilla}</div>
                      <div className="text-xs text-slate-400">
                        {trabajador.rancho}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">
                      {registro ? registro.horaEntrada : "--:--"}
                    </td>
                    <td className="p-4 text-slate-600">
                      {registro?.horaSalidaComida ?? "--:--"}
                    </td>
                    <td className="p-4 text-slate-600">
                      {registro?.horaRegresoComida ?? "--:--"}
                    </td>
                    <td className="p-4 text-slate-600">
                      {formatearDuracionComida(registro)}
                    </td>
                    <td className="p-4 text-slate-600">
                      {registro?.horaSalida ?? "--:--"}
                    </td>
                    <td className="p-4">
                      {estaDeVacaciones ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">
                          <Clock size={12} /> Vacaciones
                        </span>
                      ) : registro ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle2 size={12} /> {estado}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {estado}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {trabajadores && trabajadoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-500">
                    {busqueda
                      ? "No hay trabajadores activos que coincidan con la búsqueda."
                      : "No hay trabajadores activos registrados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
