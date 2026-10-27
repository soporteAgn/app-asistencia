"use client";

import React, { useState } from "react";
import { db, type Trabajador } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/lib/auth";
import { obtenerFechaLocal } from "@/lib/asistencia";
import CatalogosPersonal from "@/components/personal/CatalogosPersonal";
import TablaPersonal from "@/components/personal/TablaPersonal";
import AltaTrabajadorModal, {
  type AltaTrabajadorFormData,
} from "@/components/personal/AltaTrabajadorModal";
import useCatalogosPersonal from "@/components/personal/useCatalogosPersonal";
import {
  UserPlus,
  Users,
} from "lucide-react";

export default function GestionPersonal() {
  const { user, profile } = useAuth();
  const puedeAdministrarPersonal = profile?.role === "admin";
  const [modalAbierto, setModalAbierto] = useState(false);

  const [idsSys21Editados, setIdsSys21Editados] = useState<
    Record<number, string>
  >({});
  const [cargandoAlta, setCargandoAlta] = useState(false);
  const [puestosElegidos, setPuestosElegidos] = useState<
    Record<number, string>
  >({});
  const [editandoVacaciones, setEditandoVacaciones] = useState<number | null>(
    null,
  );
  const [vacacionesInicio, setVacacionesInicio] = useState("");
  const [vacacionesFin, setVacacionesFin] = useState("");
  const [trabajadorAReenrolar, setTrabajadorAReenrolar] =
    useState<Trabajador | null>(null);
  const [mensajeRostro, setMensajeRostro] = useState<string | null>(null);

  // Consultar personal registrado localmente en tiempo real
  const personal = useLiveQuery(
    () =>
      user ? db.trabajadores.where("userId").equals(user.id).toArray() : [],
    [user?.id],
  );
  const personalVigente =
    personal?.filter((trabajador) => trabajador.estado === "Activo") ?? [];
  const ranchos =
    useLiveQuery(() => db.ranchos.orderBy("nombre").toArray(), []) ?? [];
  const cuadrillasCatalogo = useLiveQuery(
    () => db.cuadrillas.orderBy("nombre").toArray(),
    [],
  );
  const cuadrillas = cuadrillasCatalogo ?? [];
  const puestos =
    useLiveQuery(() => db.puestos.orderBy("nombre").toArray(), []) ?? [];
  const catalogos = useCatalogosPersonal();
  const ranchosActivos = ranchos.filter(
    (ranchoDisponible) => ranchoDisponible.activo,
  );
  const cuadrillasActivas = cuadrillas.filter(
    (cuadrillaDisponible) => cuadrillaDisponible.activo,
  );
  const puestosActivos = puestos.filter(
    (puestoDisponible) => puestoDisponible.activo,
  );
  const fechaHoy = obtenerFechaLocal();

  const asignarPuesto = async (trabajadorId: number) => {
    const trabajador = personal?.find((actual) => actual.id === trabajadorId);
    if (!trabajador) return;
    const puesto = puestosActivos.find(
      (actual) => actual.cloudId === puestosElegidos[trabajadorId],
    );
    try {
      await db.trabajadores.update(trabajadorId, {
        puesto: puesto?.nombre ?? undefined,
        horaEntradaProgramada: puesto?.horaEntrada ?? null,
        horaSalidaProgramada: puesto?.horaSalida ?? null,
        sincronizado: false,
      });
      setPuestosElegidos((actuales) => {
        const siguientes = { ...actuales };
        delete siguientes[trabajadorId];
        return siguientes;
      });
    } catch (error) {
      console.error("No se pudo guardar el puesto del trabajador:", error);
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el puesto del trabajador.",
      );
    }
  };

  const guardarIdSys21 = async (trabajador: Trabajador) => {
    if (!trabajador.id) return;
    const nuevoId = (idsSys21Editados[trabajador.id] ?? trabajador.idSys21 ?? "")
      .trim();
    const duplicado = nuevoId
      ? personal?.some(
          (actual) =>
            actual.id !== trabajador.id &&
            actual.userId === trabajador.userId &&
            actual.idSys21?.trim() === nuevoId,
        )
      : false;
    if (duplicado) {
      alert(`El ID Sys21 "${nuevoId}" ya está asignado a otro trabajador.`);
      return;
    }
    if (!personal) {
      alert("Espera a que termine de cargar la lista de trabajadores.");
      return;
    }
    try {
      await db.trabajadores.update(trabajador.id, {
        idSys21: nuevoId || null,
        sincronizado: false,
      });
      setIdsSys21Editados((actuales) => {
        const siguientes = { ...actuales };
        delete siguientes[trabajador.id!];
        return siguientes;
      });
    } catch (error) {
      console.error("No se pudo guardar el ID Sys21 del trabajador:", error);
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el ID Sys21 del trabajador.",
      );
    }
  };

  const guardarVacaciones = async (
    event: React.FormEvent<HTMLFormElement>,
    trabajadorId: number,
  ) => {
    event.preventDefault();
    if (
      !vacacionesInicio ||
      !vacacionesFin ||
      vacacionesFin < vacacionesInicio
    ) {
      alert("Indica un periodo de vacaciones válido.");
      return;
    }
    try {
      await db.trabajadores.update(trabajadorId, {
        vacacionesInicio,
        vacacionesFin,
        sincronizado: false,
      });
      setEditandoVacaciones(null);
    } catch (error) {
      console.error(
        "No se pudieron guardar las vacaciones del trabajador:",
        error,
      );
      alert(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar las vacaciones.",
      );
    }
  };

  const quitarVacaciones = async (trabajadorId: number) => {
    try {
      await db.trabajadores.update(trabajadorId, {
        vacacionesInicio: null,
        vacacionesFin: null,
        sincronizado: false,
      });
      setEditandoVacaciones(null);
    } catch (error) {
      console.error(
        "No se pudieron quitar las vacaciones del trabajador:",
        error,
      );
      alert(
        error instanceof Error
          ? error.message
          : "No se pudieron quitar las vacaciones.",
      );
    }
  };

  // Función para registrar el alta en IndexedDB
  const handleAltaTrabajador = async (
    e: React.FormEvent<HTMLFormElement>,
    datos: AltaTrabajadorFormData,
  ) => {
    e.preventDefault();
    if (trabajadorAReenrolar?.id) {
      setCargandoAlta(true);
      try {
        await db.trabajadores.update(trabajadorAReenrolar.id, {
          vectorFacial: datos.vectorFacial,
          sincronizado: false,
        });
        setMensajeRostro(
          `Rostro enrolado correctamente para ${trabajadorAReenrolar.nombre}.`,
        );
        setTrabajadorAReenrolar(null);
        setModalAbierto(false);
      } catch (error) {
        console.error("No se pudo actualizar el rostro del trabajador:", error);
        alert(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el rostro del trabajador.",
        );
      } finally {
        setCargandoAlta(false);
      }
      return;
    }
    const ranchoAsignado =
      ranchosActivos.find((opcion) => opcion.nombre === datos.rancho) ??
      ranchosActivos[0];
    const cuadrillaAsignada =
      cuadrillasActivas.find((opcion) => opcion.nombre === datos.cuadrilla) ??
      cuadrillasActivas[0];
    const idSys21Asignado = datos.idSys21.trim();
    const puestoAsignado =
      datos.puestoSeleccionado === "none"
        ? undefined
        : (puestosActivos.find(
            (opcion) => opcion.cloudId === datos.puestoSeleccionado,
          ) ?? puestosActivos[0]);
    if (
      !datos.nombre ||
      !datos.vectorFacial ||
      !ranchoAsignado ||
      !cuadrillaAsignada
    ) {
      alert(
        "Completa el nombre, selecciona un rancho y una cuadrilla, y captura la foto facial.",
      );
      return;
    }
    if (idSys21Asignado && !personal) {
      alert("Espera a que termine de cargar la lista de trabajadores.");
      return;
    }
    if (
      idSys21Asignado &&
      personal?.some(
        (trabajador) =>
          trabajador.userId === user?.id &&
          trabajador.idSys21?.trim() === idSys21Asignado,
      )
    ) {
      alert(`El ID Sys21 "${idSys21Asignado}" ya está asignado a otro trabajador.`);
      return;
    }

    setCargandoAlta(true);

    try {
      await db.trabajadores.add({
        nombre: datos.nombre,
        idSys21: idSys21Asignado || null,
        rancho: ranchoAsignado.nombre,
        cuadrilla: cuadrillaAsignada.nombre,
        estado: "Activo",
        puesto: puestoAsignado?.nombre,
        horaEntradaProgramada: puestoAsignado?.horaEntrada ?? null,
        horaSalidaProgramada: puestoAsignado?.horaSalida ?? null,
        vacacionesInicio: null,
        vacacionesFin: null,
        vectorFacial: datos.vectorFacial,
        userId: user?.id,
        cloudId: crypto.randomUUID(),
        sincronizado: false,
      });
      setMensajeRostro(
        `Trabajador ${datos.nombre} registrado y rostro enrolado en este dispositivo.`,
      );

      setModalAbierto(false);
    } catch (error) {
      console.error("Error al dar de alta:", error);
      alert("Ocurrió un error al registrar al trabajador localmente.");
    } finally {
      setCargandoAlta(false);
    }
  };

  // Función para dar de baja (cambiar estado)
  const handleBajaTrabajador = async (id: number, nombre: string) => {
    if (
      !confirm(
        `¿Dar de baja a ${nombre}? Dejará de aparecer en Gestión de Personal, pero se conservará en la base de datos como parte del historial. No podrá marcar asistencia.`,
      )
    )
      return;
    try {
      await db.trabajadores.update(id, { estado: "Baja", sincronizado: false });
    } catch (error) {
      console.error("No se pudo dar de baja al trabajador:", error);
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo dar de baja al trabajador.",
      );
    }
  };

  return (
    <div className="min-w-0 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex min-w-0 items-center gap-2 text-xl font-bold text-[#1a3821]">
          <Users className="shrink-0 text-[#2e6f40]" /> Gestión de Personal 
        </h2>
        {puedeAdministrarPersonal && (
          <button
            onClick={() => {
              setTrabajadorAReenrolar(null);
              setMensajeRostro(null);
              setModalAbierto(true);
            }}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#2e6f40] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#235732] sm:w-auto"
          >
            <UserPlus size={18} /> Registrar trabajador y enrolar rostro
          </button>
        )}
      </div>
      {mensajeRostro && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {mensajeRostro}
        </p>
      )}

      {puedeAdministrarPersonal && (
        <CatalogosPersonal
          ranchos={ranchos}
          cuadrillas={cuadrillas}
          cuadrillasCargadas={Boolean(cuadrillasCatalogo)}
          puestos={puestos}
          guardando={catalogos.guardandoCatalogo}
          mensaje={catalogos.mensajeCatalogo}
          nuevoRancho={catalogos.nuevoRancho}
          nuevaCuadrilla={catalogos.nuevaCuadrilla}
          nuevoPuesto={catalogos.nuevoPuesto}
          horaEntradaPuesto={catalogos.horaEntradaPuesto}
          horaSalidaPuesto={catalogos.horaSalidaPuesto}
          onNuevoRanchoChange={catalogos.setNuevoRancho}
          onNuevaCuadrillaChange={catalogos.setNuevaCuadrilla}
          onNuevoPuestoChange={catalogos.setNuevoPuesto}
          onHoraEntradaChange={catalogos.setHoraEntradaPuesto}
          onHoraSalidaChange={catalogos.setHoraSalidaPuesto}
          onAltaRancho={catalogos.altaRancho}
          onAltaCuadrilla={catalogos.altaCuadrilla}
          onAltaPuesto={catalogos.altaPuesto}
          onCambiarEstadoRancho={(rancho) =>
            void catalogos.cambiarEstadoRancho(rancho)
          }
          onEliminarRancho={(rancho) => void catalogos.eliminarRancho(rancho)}
          onCambiarEstadoCuadrilla={(cuadrilla) =>
            void catalogos.cambiarEstadoCuadrilla(cuadrilla)
          }
          onEliminarCuadrilla={(cuadrilla) =>
            void catalogos.eliminarCuadrilla(cuadrilla)
          }
          onCambiarEstadoPuesto={(puesto) =>
            void catalogos.cambiarEstadoPuesto(puesto)
          }
          onEliminarPuesto={(puesto) => void catalogos.eliminarPuesto(puesto)}
        />
      )}

      <TablaPersonal
        trabajadores={personalVigente}
        personalCargado={Boolean(personal)}
        puestos={puestos}
        puestosActivos={puestosActivos}
        puedeAdministrar={puedeAdministrarPersonal}
        fechaHoy={fechaHoy}
        idsSys21Editados={idsSys21Editados}
        puestosElegidos={puestosElegidos}
        editandoVacaciones={editandoVacaciones}
        vacacionesInicio={vacacionesInicio}
        vacacionesFin={vacacionesFin}
        onIdsSys21EditadosChange={setIdsSys21Editados}
        onPuestosElegidosChange={setPuestosElegidos}
        onEditandoVacacionesChange={setEditandoVacaciones}
        onVacacionesInicioChange={setVacacionesInicio}
        onVacacionesFinChange={setVacacionesFin}
        onGuardarIdSys21={(trabajador) => void guardarIdSys21(trabajador)}
        onAsignarPuesto={(id) => void asignarPuesto(id)}
        onGuardarVacaciones={(event, id) => void guardarVacaciones(event, id)}
        onQuitarVacaciones={(id) => void quitarVacaciones(id)}
        onReenrolar={(trabajador) => {
          setTrabajadorAReenrolar(trabajador);
          setMensajeRostro(null);
          setModalAbierto(true);
        }}
        onDarDeBaja={(id, nombre) => void handleBajaTrabajador(id, nombre)}
      />

      {modalAbierto && (
        <AltaTrabajadorModal
          trabajadorAReenrolar={trabajadorAReenrolar}
          ranchosActivos={ranchosActivos}
          cuadrillasActivas={cuadrillasActivas}
          puestosActivos={puestosActivos}
          cargando={cargandoAlta}
          onClose={() => {
            setModalAbierto(false);
            setTrabajadorAReenrolar(null);
          }}
          onSubmit={handleAltaTrabajador}
        />
      )}

    </div>
  );
}
