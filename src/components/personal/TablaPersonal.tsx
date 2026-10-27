"use client";

import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import {
  CalendarDays,
  Camera,
  Save,
  Trash2,
} from "lucide-react";
import type { Puesto, Trabajador } from "@/lib/db";

interface TablaPersonalProps {
  trabajadores: Trabajador[];
  personalCargado: boolean;
  puestos: Puesto[];
  puestosActivos: Puesto[];
  puedeAdministrar: boolean;
  fechaHoy: string;
  idsSys21Editados: Record<number, string>;
  puestosElegidos: Record<number, string>;
  editandoVacaciones: number | null;
  vacacionesInicio: string;
  vacacionesFin: string;
  onIdsSys21EditadosChange: Dispatch<SetStateAction<Record<number, string>>>;
  onPuestosElegidosChange: Dispatch<SetStateAction<Record<number, string>>>;
  onEditandoVacacionesChange: (id: number | null) => void;
  onVacacionesInicioChange: (value: string) => void;
  onVacacionesFinChange: (value: string) => void;
  onGuardarIdSys21: (trabajador: Trabajador) => void;
  onAsignarPuesto: (id: number) => void;
  onGuardarVacaciones: (
    event: React.FormEvent<HTMLFormElement>,
    trabajadorId: number,
  ) => void;
  onQuitarVacaciones: (id: number) => void;
  onReenrolar: (trabajador: Trabajador) => void;
  onDarDeBaja: (id: number, nombre: string) => void;
}

function CeldaIdSys21({
  trabajador,
  puedeAdministrar,
  valorEditado,
  onChange,
  onGuardar,
}: {
  trabajador: Trabajador;
  puedeAdministrar: boolean;
  valorEditado: string;
  onChange: (value: string) => void;
  onGuardar: () => void;
}) {
  if (!puedeAdministrar) {
    return (
      <span className="font-mono text-slate-600">
        {trabajador.idSys21 || "—"}
      </span>
    );
  }

  return (
    <div className="flex min-w-40 items-center gap-2">
      <input
        aria-label={`ID Sys21 de ${trabajador.nombre}`}
        value={valorEditado}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Sin asignar"
        className="min-w-0 w-32 rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs"
      />
      <button
        type="button"
        title="Guardar ID Sys21"
        aria-label={`Guardar ID Sys21 de ${trabajador.nombre}`}
        disabled={
          !trabajador.id ||
          valorEditado.trim() === (trabajador.idSys21 ?? "")
        }
        onClick={onGuardar}
        className="rounded p-1.5 text-[#2e6f40] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Save size={16} />
      </button>
    </div>
  );
}

function CeldaVacaciones({
  trabajador,
  puedeAdministrar,
  fechaHoy,
  editandoVacaciones,
  vacacionesInicio,
  vacacionesFin,
  onEditandoVacacionesChange,
  onVacacionesInicioChange,
  onVacacionesFinChange,
  onGuardarVacaciones,
  onQuitarVacaciones,
}: {
  trabajador: Trabajador;
  puedeAdministrar: boolean;
  fechaHoy: string;
  editandoVacaciones: boolean;
  vacacionesInicio: string;
  vacacionesFin: string;
  onEditandoVacacionesChange: () => void;
  onVacacionesInicioChange: (value: string) => void;
  onVacacionesFinChange: (value: string) => void;
  onGuardarVacaciones: FormEventHandler<HTMLFormElement>;
  onQuitarVacaciones: () => void;
}) {
  const estaDeVacaciones = Boolean(
    trabajador.vacacionesInicio &&
      trabajador.vacacionesFin &&
      trabajador.vacacionesInicio <= fechaHoy &&
      trabajador.vacacionesFin >= fechaHoy,
  );

  return (
    <td className="p-4">
      {estaDeVacaciones ? (
        <p className="mb-2 text-xs font-medium text-sky-700">
          De vacaciones hasta {trabajador.vacacionesFin}
        </p>
      ) : trabajador.vacacionesInicio && trabajador.vacacionesFin ? (
        <p className="mb-2 text-xs text-slate-500">
          Periodo: {trabajador.vacacionesInicio} a {trabajador.vacacionesFin}
        </p>
      ) : null}
      {puedeAdministrar && trabajador.estado === "Activo" && (
        <>
          <button
            type="button"
            onClick={onEditandoVacacionesChange}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#2e6f40] hover:underline"
          >
            <CalendarDays size={14} />{" "}
            {trabajador.vacacionesInicio
              ? "Editar vacaciones"
              : "Registrar vacaciones"}
          </button>
          {editandoVacaciones && (
            <form onSubmit={onGuardarVacaciones} className="mt-2 min-w-48 space-y-2">
              <label className="block text-[11px] text-slate-500">
                Desde
                <input
                  required
                  type="date"
                  value={vacacionesInicio}
                  onChange={(event) =>
                    onVacacionesInicioChange(event.target.value)
                  }
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                />
              </label>
              <label className="block text-[11px] text-slate-500">
                Hasta
                <input
                  required
                  type="date"
                  min={vacacionesInicio}
                  value={vacacionesFin}
                  onChange={(event) => onVacacionesFinChange(event.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-[#2e6f40] px-2 py-1 text-xs font-semibold text-white"
                >
                  Guardar
                </button>
                {trabajador.vacacionesInicio && (
                  <button
                    type="button"
                    onClick={onQuitarVacaciones}
                    className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </form>
          )}
        </>
      )}
    </td>
  );
}

export default function TablaPersonal({
  trabajadores,
  personalCargado,
  puestos,
  puestosActivos,
  puedeAdministrar,
  fechaHoy,
  idsSys21Editados,
  puestosElegidos,
  editandoVacaciones,
  vacacionesInicio,
  vacacionesFin,
  onIdsSys21EditadosChange,
  onPuestosElegidosChange,
  onEditandoVacacionesChange,
  onVacacionesInicioChange,
  onVacacionesFinChange,
  onGuardarIdSys21,
  onAsignarPuesto,
  onGuardarVacaciones,
  onQuitarVacaciones,
  onReenrolar,
  onDarDeBaja,
}: TablaPersonalProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <th className="p-4">ID SYS21</th>
            <th className="p-4">Nombre Completo</th>
            <th className="p-4">Rancho / Cuadrilla</th>
            <th className="p-4">Puesto / horario</th>
            <th className="p-4">Vacaciones</th>
            <th className="p-4">Estado</th>
            {puedeAdministrar && <th className="p-4 text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {trabajadores.map((trabajador) => {
            const puestoActual = puestos.find(
              (opcion) => opcion.nombre === trabajador.puesto,
            );
            const trabajadorId = trabajador.id ?? -1;
            const puestoElegido =
              puestosElegidos[trabajadorId] ?? puestoActual?.cloudId ?? "";
            const idSys21Editado =
              idsSys21Editados[trabajadorId] ?? trabajador.idSys21 ?? "";

            return (
              <tr
                key={trabajador.id}
                className="hover:bg-slate-50"
              >
                <td className="p-4 font-mono text-slate-500">
                  {trabajador.id}
                </td>
                <td className="p-4">
                  <CeldaIdSys21
                    trabajador={trabajador}
                    puedeAdministrar={puedeAdministrar}
                    valorEditado={idSys21Editado}
                    onChange={(value) =>
                      onIdsSys21EditadosChange((actuales) => ({
                        ...actuales,
                        [trabajadorId]: value,
                      }))
                    }
                    onGuardar={() => onGuardarIdSys21(trabajador)}
                  />
                </td>
                <td className="p-4 font-semibold text-slate-800">
                  {trabajador.nombre}
                </td>
                <td className="p-4 text-slate-600">
                  <div className="font-medium text-slate-700">
                    {trabajador.rancho}
                  </div>
                  <div className="text-xs">{trabajador.cuadrilla}</div>
                </td>
                <td className="p-4">
                  {puedeAdministrar && trabajador.estado === "Activo" ? (
                    <div className="flex min-w-52 items-center gap-2">
                      <select
                        aria-label={`Puesto de ${trabajador.nombre}`}
                        value={puestoElegido}
                        onChange={(event) =>
                          onPuestosElegidosChange((actuales) => ({
                            ...actuales,
                            [trabajadorId]: event.target.value,
                          }))
                        }
                        className="min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="">Sin asignar</option>
                        {puestoActual && !puestoActual.activo && (
                          <option value={puestoActual.cloudId}>
                            {puestoActual.nombre} (inactivo)
                          </option>
                        )}
                        {puestosActivos.map((puesto) => (
                          <option key={puesto.cloudId} value={puesto.cloudId}>
                            {puesto.nombre} ({puesto.horaEntrada}–
                            {puesto.horaSalida})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        title="Guardar puesto y horario"
                        disabled={
                          !trabajador.id ||
                          puestoElegido === (puestoActual?.cloudId ?? "")
                        }
                        onClick={() =>
                          trabajador.id && onAsignarPuesto(trabajador.id)
                        }
                        className="rounded p-1.5 text-[#2e6f40] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Save size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-600">
                      <div>{trabajador.puesto || "Sin asignar"}</div>
                      <div className="text-xs">
                        {trabajador.horaEntradaProgramada &&
                        trabajador.horaSalidaProgramada
                          ? `${trabajador.horaEntradaProgramada}–${trabajador.horaSalidaProgramada}`
                          : ""}
                      </div>
                    </div>
                  )}
                </td>
                <CeldaVacaciones
                  trabajador={trabajador}
                  puedeAdministrar={puedeAdministrar}
                  fechaHoy={fechaHoy}
                  editandoVacaciones={editandoVacaciones === trabajador.id}
                  vacacionesInicio={vacacionesInicio}
                  vacacionesFin={vacacionesFin}
                  onEditandoVacacionesChange={() => {
                    onEditandoVacacionesChange(
                      editandoVacaciones === trabajador.id
                        ? null
                        : (trabajador.id ?? null),
                    );
                    onVacacionesInicioChange(
                      trabajador.vacacionesInicio ?? fechaHoy,
                    );
                    onVacacionesFinChange(
                      trabajador.vacacionesFin ?? fechaHoy,
                    );
                  }}
                  onVacacionesInicioChange={onVacacionesInicioChange}
                  onVacacionesFinChange={onVacacionesFinChange}
                  onGuardarVacaciones={(event) => {
                    if (trabajador.id) onGuardarVacaciones(event, trabajador.id);
                  }}
                  onQuitarVacaciones={() => {
                    if (trabajador.id) onQuitarVacaciones(trabajador.id);
                  }}
                />
                <td className="p-4">
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                    {trabajador.estado}
                  </span>
                </td>
                {puedeAdministrar && (
                  <td className="p-4 text-right">
                    {trabajador.estado === "Activo" && (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onReenrolar(trabajador)}
                          className="rounded p-1.5 text-[#2e6f40] hover:bg-emerald-50"
                          title={
                            trabajador.vectorFacial
                              ? "Actualizar rostro"
                              : "Enrolar rostro"
                          }
                          aria-label={`${trabajador.vectorFacial ? "Actualizar" : "Enrolar"} rostro de ${trabajador.nombre}`}
                        >
                          <Camera size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (trabajador.id) {
                              onDarDeBaja(trabajador.id, trabajador.nombre);
                            }
                          }}
                          className="rounded p-1.5 text-rose-600 hover:bg-rose-50"
                          title="Dar de Baja"
                          aria-label={`Dar de baja a ${trabajador.nombre}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {personalCargado && trabajadores.length === 0 && (
            <tr>
              <td
                colSpan={puedeAdministrar ? 8 : 7}
                className="p-4 text-center text-slate-500"
              >
                No hay trabajadores vigentes registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
