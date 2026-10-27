"use client";

import type { FormEventHandler } from "react";
import { Clock3, MapPin, Plus, Trash2, Users } from "lucide-react";
import type { Cuadrilla, Puesto, Rancho } from "@/lib/db";

interface CatalogosPersonalProps {
  ranchos: Rancho[];
  cuadrillas: Cuadrilla[];
  cuadrillasCargadas: boolean;
  puestos: Puesto[];
  guardando: boolean;
  mensaje: string | null;
  nuevoRancho: string;
  nuevaCuadrilla: string;
  nuevoPuesto: string;
  horaEntradaPuesto: string;
  horaSalidaPuesto: string;
  onNuevoRanchoChange: (value: string) => void;
  onNuevaCuadrillaChange: (value: string) => void;
  onNuevoPuestoChange: (value: string) => void;
  onHoraEntradaChange: (value: string) => void;
  onHoraSalidaChange: (value: string) => void;
  onAltaRancho: FormEventHandler<HTMLFormElement>;
  onAltaCuadrilla: FormEventHandler<HTMLFormElement>;
  onAltaPuesto: FormEventHandler<HTMLFormElement>;
  onCambiarEstadoRancho: (rancho: Rancho) => void;
  onEliminarRancho: (rancho: Rancho) => void;
  onCambiarEstadoCuadrilla: (cuadrilla: Cuadrilla) => void;
  onEliminarCuadrilla: (cuadrilla: Cuadrilla) => void;
  onCambiarEstadoPuesto: (puesto: Puesto) => void;
  onEliminarPuesto: (puesto: Puesto) => void;
}

const inputClass =
  "min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm";
const addButtonClass =
  "inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#2e6f40] px-2 py-2 text-xs font-semibold text-white disabled:opacity-60 sm:px-3 sm:text-sm";
const actionButtonClass =
  "whitespace-nowrap text-[11px] font-medium text-[#2e6f40] disabled:opacity-50 sm:text-xs";
const deleteButtonClass =
  "inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-red-600 disabled:opacity-50 sm:text-xs";

export default function CatalogosPersonal({
  ranchos,
  cuadrillas,
  cuadrillasCargadas,
  puestos,
  guardando,
  mensaje,
  nuevoRancho,
  nuevaCuadrilla,
  nuevoPuesto,
  horaEntradaPuesto,
  horaSalidaPuesto,
  onNuevoRanchoChange,
  onNuevaCuadrillaChange,
  onNuevoPuestoChange,
  onHoraEntradaChange,
  onHoraSalidaChange,
  onAltaRancho,
  onAltaCuadrilla,
  onAltaPuesto,
  onCambiarEstadoRancho,
  onEliminarRancho,
  onCambiarEstadoCuadrilla,
  onEliminarCuadrilla,
  onCambiarEstadoPuesto,
  onEliminarPuesto,
}: CatalogosPersonalProps) {
  return (
    <section className="mb-6 min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">
        Catálogos de ranchos, cuadrillas y puestos
      </h3>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
          <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-700">
            <MapPin size={17} className="shrink-0 text-[#2e6f40]" /> Ranchos
          </h4>
          <form
            onSubmit={onAltaRancho}
            className="mb-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2"
          >
            <input
              required
              value={nuevoRancho}
              onChange={(event) => onNuevoRanchoChange(event.target.value)}
              placeholder="Nombre del rancho"
              className={`flex-1 ${inputClass}`}
            />
            <button type="submit" disabled={guardando} className={addButtonClass}>
              <Plus size={16} className="shrink-0" /> Agregar
            </button>
          </form>
          <ul className="min-w-0 divide-y divide-slate-100">
            {ranchos.map((rancho) => (
              <li
                key={rancho.cloudId}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 text-sm"
              >
                <span
                  className={`min-w-0 break-words ${rancho.activo ? "text-slate-700" : "text-slate-400"}`}
                >
                  {rancho.nombre}
                  {!rancho.activo && " (inactivo)"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => onCambiarEstadoRancho(rancho)}
                    className={actionButtonClass}
                  >
                    {rancho.activo ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => onEliminarRancho(rancho)}
                    aria-label={`Eliminar definitivamente el rancho ${rancho.nombre}`}
                    title="Eliminar definitivamente"
                    className={deleteButtonClass}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
            {ranchos.length === 0 && (
              <li className="py-2 text-sm text-slate-500">
                Cargando ranchos...
              </li>
            )}
          </ul>
        </div>

        <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
          <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-700">
            <Users size={17} className="shrink-0 text-[#2e6f40]" /> Cuadrillas
          </h4>
          <form
            onSubmit={onAltaCuadrilla}
            className="mb-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2"
          >
            <input
              required
              value={nuevaCuadrilla}
              onChange={(event) => onNuevaCuadrillaChange(event.target.value)}
              placeholder="Nombre de la cuadrilla"
              className={`flex-1 ${inputClass}`}
            />
            <button type="submit" disabled={guardando} className={addButtonClass}>
              <Plus size={16} className="shrink-0" /> Agregar
            </button>
          </form>
          <ul className="min-w-0 divide-y divide-slate-100">
            {cuadrillas.map((cuadrilla) => (
              <li
                key={cuadrilla.cloudId}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 text-sm"
              >
                <span
                  className={`min-w-0 break-words ${cuadrilla.activo ? "text-slate-700" : "text-slate-400"}`}
                >
                  {cuadrilla.nombre}
                  {!cuadrilla.activo && " (inactiva)"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => onCambiarEstadoCuadrilla(cuadrilla)}
                    className={actionButtonClass}
                  >
                    {cuadrilla.activo ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => onEliminarCuadrilla(cuadrilla)}
                    aria-label={`Eliminar definitivamente la cuadrilla ${cuadrilla.nombre}`}
                    title="Eliminar definitivamente"
                    className={deleteButtonClass}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
            {cuadrillas.length === 0 && (
              <li className="py-2 text-sm text-slate-500">
                {cuadrillasCargadas
                  ? "No hay cuadrillas registradas."
                  : "Cargando cuadrillas..."}
              </li>
            )}
          </ul>
        </div>

        <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
          <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-700">
            <Clock3 size={17} className="shrink-0 text-[#2e6f40]" /> Puestos y
            horarios
          </h4>
          <form onSubmit={onAltaPuesto} className="mb-4 space-y-2">
            <input
              required
              value={nuevoPuesto}
              onChange={(event) => onNuevoPuestoChange(event.target.value)}
              placeholder="Nombre del puesto, por ejemplo Riego"
              className={`w-full ${inputClass}`}
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-medium text-slate-500">
                Entrada
                <input
                  required
                  type="time"
                  value={horaEntradaPuesto}
                  onChange={(event) => onHoraEntradaChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                />
              </label>
              <label className="text-xs font-medium text-slate-500">
                Salida
                <input
                  required
                  type="time"
                  value={horaSalidaPuesto}
                  onChange={(event) => onHoraSalidaChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center gap-1 rounded-lg bg-[#2e6f40] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Plus size={16} /> Agregar puesto
            </button>
          </form>
          <ul className="min-w-0 divide-y divide-slate-100">
            {puestos.map((puesto) => (
              <li
                key={puesto.cloudId}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 text-sm"
              >
                <span
                  className={`min-w-0 break-words ${puesto.activo ? "text-slate-700" : "text-slate-400"}`}
                >
                  {puesto.nombre}: {puesto.horaEntrada}–{puesto.horaSalida}
                  {!puesto.activo && " (inactivo)"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => onCambiarEstadoPuesto(puesto)}
                    className={actionButtonClass}
                  >
                    {puesto.activo ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => onEliminarPuesto(puesto)}
                    aria-label={`Eliminar definitivamente el puesto ${puesto.nombre}`}
                    title="Eliminar definitivamente"
                    className={deleteButtonClass}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
            {puestos.length === 0 && (
              <li className="py-2 text-sm text-slate-500">
                Cargando puestos...
              </li>
            )}
          </ul>
        </div>
      </div>
      {mensaje && (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {mensaje}
        </p>
      )}
    </section>
  );
}
