"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { db, type Cuadrilla, type Puesto, type Rancho } from "@/lib/db";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function useCatalogosPersonal() {
  const [nuevoRancho, setNuevoRancho] = useState("");
  const [nuevaCuadrilla, setNuevaCuadrilla] = useState("");
  const [nuevoPuesto, setNuevoPuesto] = useState("");
  const [horaEntradaPuesto, setHoraEntradaPuesto] = useState("06:00");
  const [horaSalidaPuesto, setHoraSalidaPuesto] = useState("14:00");
  const [guardandoCatalogo, setGuardandoCatalogo] = useState(false);
  const [mensajeCatalogo, setMensajeCatalogo] = useState<string | null>(null);

  const altaRancho = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nombreRancho = nuevoRancho.trim();
    if (!nombreRancho) return;
    if (!navigator.onLine) {
      setMensajeCatalogo(
        "Conéctate a internet para guardar cambios en el catálogo de ranchos.",
      );
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const cloudId = crypto.randomUUID();
      const { data, error } = await getSupabaseBrowserClient()
        .from("ranchos")
        .insert({ id: cloudId, nombre: nombreRancho, activo: true })
        .select("id, nombre, activo")
        .single();
      if (error) throw error;
      await db.ranchos.add({
        cloudId: data.id,
        nombre: data.nombre,
        activo: data.activo,
      });
      setNuevoRancho("");
      setMensajeCatalogo("Rancho agregado al catálogo.");
    } catch (error) {
      console.error("No se pudo agregar el rancho:", error);
      setMensajeCatalogo(
        error instanceof Error ? error.message : "No se pudo agregar el rancho.",
      );
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  const altaCuadrilla = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nombreCuadrilla = nuevaCuadrilla.trim();
    if (!nombreCuadrilla) return;
    if (!navigator.onLine) {
      setMensajeCatalogo(
        "Conéctate a internet para guardar cambios en el catálogo de cuadrillas.",
      );
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const cloudId = crypto.randomUUID();
      const { data, error } = await getSupabaseBrowserClient()
        .from("cuadrillas")
        .insert({ id: cloudId, nombre: nombreCuadrilla, activo: true })
        .select("id, nombre, activo")
        .single();
      if (error) throw error;
      await db.cuadrillas.add({
        cloudId: data.id,
        nombre: data.nombre,
        activo: data.activo,
      });
      setNuevaCuadrilla("");
      setMensajeCatalogo("Cuadrilla agregada al catálogo.");
    } catch (error) {
      console.error("No se pudo agregar la cuadrilla:", error);
      setMensajeCatalogo(
        error instanceof Error
          ? error.message
          : "No se pudo agregar la cuadrilla.",
      );
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  const altaPuesto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nombrePuesto = nuevoPuesto.trim();
    if (!nombrePuesto) return;
    if (horaSalidaPuesto <= horaEntradaPuesto) {
      setMensajeCatalogo(
        "La hora de salida debe ser posterior a la hora de entrada.",
      );
      return;
    }
    if (!navigator.onLine) {
      setMensajeCatalogo(
        "Conéctate a internet para guardar cambios en el catálogo de puestos.",
      );
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const cloudId = crypto.randomUUID();
      const { data, error } = await getSupabaseBrowserClient()
        .from("puestos")
        .insert({
          id: cloudId,
          nombre: nombrePuesto,
          hora_entrada: horaEntradaPuesto,
          hora_salida: horaSalidaPuesto,
          activo: true,
        })
        .select("id, nombre, hora_entrada, hora_salida, activo")
        .single();
      if (error) throw error;
      await db.puestos.add({
        cloudId: data.id,
        nombre: data.nombre,
        horaEntrada: data.hora_entrada.slice(0, 5),
        horaSalida: data.hora_salida.slice(0, 5),
        activo: data.activo,
      });
      setNuevoPuesto("");
      setMensajeCatalogo("Puesto y horario agregados al catálogo.");
    } catch (error) {
      console.error("No se pudo agregar el puesto:", error);
      setMensajeCatalogo(
        error instanceof Error ? error.message : "No se pudo agregar el puesto.",
      );
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  const cambiarEstadoRancho = async (rancho: Rancho) => {
    if (!rancho.id || !navigator.onLine) {
      setMensajeCatalogo("Conéctate a internet para actualizar el catálogo.");
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const { error } = await getSupabaseBrowserClient()
        .from("ranchos")
        .update({ activo: !rancho.activo })
        .eq("id", rancho.cloudId);
      if (error) throw error;
      await db.ranchos.update(rancho.id, { activo: !rancho.activo });
    } catch (error) {
      console.error("No se pudo actualizar el rancho:", error);
      setMensajeCatalogo(
        error instanceof Error ? error.message : "No se pudo actualizar el rancho.",
      );
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  const eliminarRancho = async (rancho: Rancho) => {
    if (!rancho.id || !navigator.onLine) {
      setMensajeCatalogo(
        "Conéctate a internet para eliminar el rancho del catálogo.",
      );
      return;
    }
    if (
      !confirm(
        `¿Eliminar definitivamente el rancho "${rancho.nombre}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const { error } = await getSupabaseBrowserClient()
        .from("ranchos")
        .delete()
        .eq("id", rancho.cloudId);
      if (error) throw error;
      await db.ranchos.delete(rancho.id);
      setMensajeCatalogo("Rancho eliminado definitivamente del catálogo.");
    } catch (error) {
      console.error("No se pudo eliminar el rancho:", error);
      setMensajeCatalogo(
        error instanceof Error ? error.message : "No se pudo eliminar el rancho.",
      );
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  const cambiarEstadoCuadrilla = async (cuadrilla: Cuadrilla) => {
    if (!cuadrilla.id || !navigator.onLine) {
      setMensajeCatalogo("Conéctate a internet para actualizar el catálogo.");
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const { error } = await getSupabaseBrowserClient()
        .from("cuadrillas")
        .update({ activo: !cuadrilla.activo })
        .eq("id", cuadrilla.cloudId);
      if (error) throw error;
      await db.cuadrillas.update(cuadrilla.id, {
        activo: !cuadrilla.activo,
      });
    } catch (error) {
      console.error("No se pudo actualizar la cuadrilla:", error);
      setMensajeCatalogo(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la cuadrilla.",
      );
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  const eliminarCuadrilla = async (cuadrilla: Cuadrilla) => {
    if (!cuadrilla.id || !navigator.onLine) {
      setMensajeCatalogo(
        "Conéctate a internet para eliminar la cuadrilla del catálogo.",
      );
      return;
    }
    if (
      !confirm(
        `¿Eliminar definitivamente la cuadrilla "${cuadrilla.nombre}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const { error } = await getSupabaseBrowserClient()
        .from("cuadrillas")
        .delete()
        .eq("id", cuadrilla.cloudId);
      if (error) throw error;
      await db.cuadrillas.delete(cuadrilla.id);
      setMensajeCatalogo("Cuadrilla eliminada definitivamente del catálogo.");
    } catch (error) {
      console.error("No se pudo eliminar la cuadrilla:", error);
      setMensajeCatalogo(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la cuadrilla.",
      );
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  const cambiarEstadoPuesto = async (puesto: Puesto) => {
    if (!puesto.id || !navigator.onLine) {
      setMensajeCatalogo("Conéctate a internet para actualizar el catálogo.");
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const { error } = await getSupabaseBrowserClient()
        .from("puestos")
        .update({ activo: !puesto.activo })
        .eq("id", puesto.cloudId);
      if (error) throw error;
      await db.puestos.update(puesto.id, { activo: !puesto.activo });
    } catch (error) {
      console.error("No se pudo actualizar el puesto:", error);
      setMensajeCatalogo(
        error instanceof Error ? error.message : "No se pudo actualizar el puesto.",
      );
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  const eliminarPuesto = async (puesto: Puesto) => {
    if (!puesto.id || !navigator.onLine) {
      setMensajeCatalogo(
        "Conéctate a internet para eliminar el puesto del catálogo.",
      );
      return;
    }
    if (
      !confirm(
        `¿Eliminar definitivamente el puesto "${puesto.nombre}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const { error } = await getSupabaseBrowserClient()
        .from("puestos")
        .delete()
        .eq("id", puesto.cloudId);
      if (error) throw error;
      await db.puestos.delete(puesto.id);
      setMensajeCatalogo("Puesto eliminado definitivamente del catálogo.");
    } catch (error) {
      console.error("No se pudo eliminar el puesto:", error);
      setMensajeCatalogo(
        error instanceof Error ? error.message : "No se pudo eliminar el puesto.",
      );
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  return {
    nuevoRancho,
    setNuevoRancho,
    nuevaCuadrilla,
    setNuevaCuadrilla,
    nuevoPuesto,
    setNuevoPuesto,
    horaEntradaPuesto,
    setHoraEntradaPuesto,
    horaSalidaPuesto,
    setHoraSalidaPuesto,
    guardandoCatalogo,
    mensajeCatalogo,
    altaRancho,
    altaCuadrilla,
    altaPuesto,
    cambiarEstadoRancho,
    eliminarRancho,
    cambiarEstadoCuadrilla,
    eliminarCuadrilla,
    cambiarEstadoPuesto,
    eliminarPuesto,
  };
}
