'use client';

import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { db, type Trabajador } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/lib/auth';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { obtenerFechaLocal } from '@/lib/asistencia';
import { UserPlus, Users, Trash2, Camera, X, CheckCircle, MapPin, Clock3, Plus, Save, CalendarDays } from 'lucide-react';

const CUADRILLAS_DISPONIBLES = ['Cuadrilla A - Cosecha', 'Cuadrilla B - Riego', 'Cuadrilla C - Empaque', 'Mantenimiento'];

export default function GestionPersonal() {
  const { user, profile } = useAuth();
  const puedeAdministrarPersonal = profile?.role === 'admin';
  const [modalAbierto, setModalAbierto] = useState(false);
  const [capturandoFoto, setCapturandoFoto] = useState(true);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  const [vectorFacialCapturado, setVectorFacialCapturado] = useState<string | null>(null);
  const [procesandoCapturaFacial, setProcesandoCapturaFacial] = useState(false);
  const [errorCapturaFacial, setErrorCapturaFacial] = useState<string | null>(null);
  const faceApiPromiseRef = useRef<Promise<typeof import('@vladmandic/face-api')> | null>(null);
  const webcamRef = useRef<Webcam>(null);

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [rancho, setRancho] = useState('');
  const [cuadrilla, setCuadrilla] = useState(CUADRILLAS_DISPONIBLES[0]);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState('');
  const [cargandoAlta, setCargandoAlta] = useState(false);
  const [nuevoRancho, setNuevoRancho] = useState('');
  const [nuevoPuesto, setNuevoPuesto] = useState('');
  const [horaEntradaPuesto, setHoraEntradaPuesto] = useState('06:00');
  const [horaSalidaPuesto, setHoraSalidaPuesto] = useState('14:00');
  const [guardandoCatalogo, setGuardandoCatalogo] = useState(false);
  const [mensajeCatalogo, setMensajeCatalogo] = useState<string | null>(null);
  const [puestosElegidos, setPuestosElegidos] = useState<Record<number, string>>({});
  const [editandoVacaciones, setEditandoVacaciones] = useState<number | null>(null);
  const [vacacionesInicio, setVacacionesInicio] = useState('');
  const [vacacionesFin, setVacacionesFin] = useState('');
  const [trabajadorAReenrolar, setTrabajadorAReenrolar] = useState<Trabajador | null>(null);
  const [mensajeRostro, setMensajeRostro] = useState<string | null>(null);

  // Consultar personal registrado localmente en tiempo real
  const personal = useLiveQuery(
    () => user ? db.trabajadores.where('userId').equals(user.id).toArray() : [],
    [user?.id],
  );
  const ranchos = useLiveQuery(() => db.ranchos.orderBy('nombre').toArray(), []) ?? [];
  const puestos = useLiveQuery(() => db.puestos.orderBy('nombre').toArray(), []) ?? [];
  const ranchosActivos = ranchos.filter((ranchoDisponible) => ranchoDisponible.activo);
  const puestosActivos = puestos.filter((puestoDisponible) => puestoDisponible.activo);
  const fechaHoy = obtenerFechaLocal();

  // Función para capturar foto de la webcam
  const capturarFoto = React.useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      setErrorCapturaFacial('No se pudo capturar la imagen. Verifica que la cámara esté activa.');
      return;
    }

    setProcesandoCapturaFacial(true);
    setErrorCapturaFacial(null);
    setVectorFacialCapturado(null);
    try {
      if (!faceApiPromiseRef.current) {
        faceApiPromiseRef.current = import('@vladmandic/face-api').then(async (api) => {
          await Promise.all([
            api.nets.tinyFaceDetector.loadFromUri('/models'),
            api.nets.faceLandmark68Net.loadFromUri('/models'),
            api.nets.faceRecognitionNet.loadFromUri('/models'),
          ]);
          return api;
        });
      }
      const api = await faceApiPromiseRef.current;
      const imagen = new Image();
      imagen.src = imageSrc;
      await imagen.decode();
      const resultados = await api
        .detectAllFaces(imagen, new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (resultados.length === 0) {
        throw new Error('No se detectó ningún rostro. Colócate frente a la cámara e intenta otra vez.');
      }
      if (resultados.length > 1) {
        throw new Error('Solo debe aparecer un trabajador frente a la cámara.');
      }

      setFotoCapturada(imageSrc);
      setVectorFacialCapturado(JSON.stringify(Array.from(resultados[0].descriptor)));
      setCapturandoFoto(false);
    } catch (error) {
      faceApiPromiseRef.current = null;
      console.error('No se pudo procesar el rostro durante el alta:', error);
      setErrorCapturaFacial(error instanceof Error ? error.message : 'No se pudo procesar el rostro.');
    } finally {
      setProcesandoCapturaFacial(false);
    }
  }, [webcamRef]);

  const altaRancho = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nombreRancho = nuevoRancho.trim();
    if (!nombreRancho) return;
    if (!navigator.onLine) {
      setMensajeCatalogo('Conéctate a internet para guardar cambios en el catálogo de ranchos.');
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const cloudId = crypto.randomUUID();
      const { data, error } = await getSupabaseBrowserClient().from('ranchos')
        .insert({ id: cloudId, nombre: nombreRancho, activo: true })
        .select('id, nombre, activo').single();
      if (error) throw error;
      await db.ranchos.add({ cloudId: data.id, nombre: data.nombre, activo: data.activo });
      setNuevoRancho('');
      setMensajeCatalogo('Rancho agregado al catálogo.');
    } catch (error) {
      console.error('No se pudo agregar el rancho:', error);
      setMensajeCatalogo(error instanceof Error ? error.message : 'No se pudo agregar el rancho.');
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  const altaPuesto = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nombrePuesto = nuevoPuesto.trim();
    if (!nombrePuesto) return;
    if (horaSalidaPuesto <= horaEntradaPuesto) {
      setMensajeCatalogo('La hora de salida debe ser posterior a la hora de entrada.');
      return;
    }
    if (!navigator.onLine) {
      setMensajeCatalogo('Conéctate a internet para guardar cambios en el catálogo de puestos.');
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const cloudId = crypto.randomUUID();
      const { data, error } = await getSupabaseBrowserClient().from('puestos')
        .insert({
          id: cloudId,
          nombre: nombrePuesto,
          hora_entrada: horaEntradaPuesto,
          hora_salida: horaSalidaPuesto,
          activo: true,
        })
        .select('id, nombre, hora_entrada, hora_salida, activo').single();
      if (error) throw error;
      await db.puestos.add({
        cloudId: data.id,
        nombre: data.nombre,
        horaEntrada: data.hora_entrada.slice(0, 5),
        horaSalida: data.hora_salida.slice(0, 5),
        activo: data.activo,
      });
      setNuevoPuesto('');
      setMensajeCatalogo('Puesto y horario agregados al catálogo.');
    } catch (error) {
      console.error('No se pudo agregar el puesto:', error);
      setMensajeCatalogo(error instanceof Error ? error.message : 'No se pudo agregar el puesto.');
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  const cambiarEstadoRancho = async (ranchoCatalogo: (typeof ranchos)[number]) => {
    if (!ranchoCatalogo.id || !navigator.onLine) {
      setMensajeCatalogo('Conéctate a internet para actualizar el catálogo.');
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const { error } = await getSupabaseBrowserClient().from('ranchos')
        .update({ activo: !ranchoCatalogo.activo }).eq('id', ranchoCatalogo.cloudId);
      if (error) throw error;
      await db.ranchos.update(ranchoCatalogo.id, { activo: !ranchoCatalogo.activo });
    } catch (error) {
      console.error('No se pudo actualizar el rancho:', error);
      setMensajeCatalogo(error instanceof Error ? error.message : 'No se pudo actualizar el rancho.');
    } finally {
      setGuardandoCatalogo(false);
    }
  };

  const cambiarEstadoPuesto = async (puestoCatalogo: (typeof puestos)[number]) => {
    if (!puestoCatalogo.id || !navigator.onLine) {
      setMensajeCatalogo('Conéctate a internet para actualizar el catálogo.');
      return;
    }
    setGuardandoCatalogo(true);
    setMensajeCatalogo(null);
    try {
      const { error } = await getSupabaseBrowserClient().from('puestos')
        .update({ activo: !puestoCatalogo.activo }).eq('id', puestoCatalogo.cloudId);
      if (error) throw error;
      await db.puestos.update(puestoCatalogo.id, { activo: !puestoCatalogo.activo });
    } catch (error) {
      console.error('No se pudo actualizar el puesto:', error);
      setMensajeCatalogo(error instanceof Error ? error.message : 'No se pudo actualizar el puesto.');
    } finally {
      setGuardandoCatalogo(false);
    }
  };

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
      console.error('No se pudo guardar el puesto del trabajador:', error);
      alert(error instanceof Error ? error.message : 'No se pudo guardar el puesto del trabajador.');
    }
  };

  const guardarVacaciones = async (event: React.FormEvent<HTMLFormElement>, trabajadorId: number) => {
    event.preventDefault();
    if (!vacacionesInicio || !vacacionesFin || vacacionesFin < vacacionesInicio) {
      alert('Indica un periodo de vacaciones válido.');
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
      console.error('No se pudieron guardar las vacaciones del trabajador:', error);
      alert(error instanceof Error ? error.message : 'No se pudieron guardar las vacaciones.');
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
      console.error('No se pudieron quitar las vacaciones del trabajador:', error);
      alert(error instanceof Error ? error.message : 'No se pudieron quitar las vacaciones.');
    }
  };

  // Función para registrar el alta en IndexedDB
  const handleAltaTrabajador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trabajadorAReenrolar?.id) {
      setCargandoAlta(true);
      try {
        await db.trabajadores.update(trabajadorAReenrolar.id, {
          vectorFacial: vectorFacialCapturado,
          sincronizado: false,
        });
        setMensajeRostro(`Rostro enrolado correctamente para ${trabajadorAReenrolar.nombre}.`);
        setTrabajadorAReenrolar(null);
        setFotoCapturada(null);
        setVectorFacialCapturado(null);
        setCapturandoFoto(true);
        setModalAbierto(false);
      } catch (error) {
        console.error('No se pudo actualizar el rostro del trabajador:', error);
        alert(error instanceof Error ? error.message : 'No se pudo actualizar el rostro del trabajador.');
      } finally {
        setCargandoAlta(false);
      }
      return;
    }
    const ranchoAsignado = ranchosActivos.find((opcion) => opcion.nombre === rancho) ?? ranchosActivos[0];
    const puestoAsignado = puestoSeleccionado === 'none'
      ? undefined
      : puestosActivos.find((opcion) => opcion.cloudId === puestoSeleccionado) ?? puestosActivos[0];
    if (!nombre || !fotoCapturada || !vectorFacialCapturado || !ranchoAsignado) {
      alert('Completa el nombre, selecciona un rancho y captura la foto facial.');
      return;
    }

    setCargandoAlta(true);

    try {
      await db.trabajadores.add({
        nombre,
        rancho: ranchoAsignado.nombre,
        cuadrilla,
        estado: 'Activo',
        puesto: puestoAsignado?.nombre,
        horaEntradaProgramada: puestoAsignado?.horaEntrada ?? null,
        horaSalidaProgramada: puestoAsignado?.horaSalida ?? null,
        vacacionesInicio: null,
        vacacionesFin: null,
        vectorFacial: vectorFacialCapturado,
        userId: user?.id,
        cloudId: crypto.randomUUID(),
        sincronizado: false,
      });
      setMensajeRostro(`Trabajador ${nombre} registrado y rostro enrolado en este dispositivo.`);

      // Limpiar formulario y cerrar modal
      setNombre('');
      setRancho('');
      setCuadrilla(CUADRILLAS_DISPONIBLES[0]);
      setPuestoSeleccionado('');
      setFotoCapturada(null);
      setVectorFacialCapturado(null);
      setErrorCapturaFacial(null);
      setCapturandoFoto(true);
      setModalAbierto(false);
    } catch (error) {
      console.error('Error al dar de alta:', error);
      alert('Ocurrió un error al registrar al trabajador localmente.');
    } finally {
      setCargandoAlta(false);
    }
  };

  // Función para dar de baja (cambiar estado)
  const handleBajaTrabajador = async (id: number, nombre: string) => {
    if (confirm(`¿Estás seguro de dar de BAJA a ${nombre}? No podrá marcar asistencia.`)) {
      await db.trabajadores.update(id, { estado: 'Baja', sincronizado: false });
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#1a3821] flex items-center gap-2">
          <Users className="text-[#2e6f40]" /> Gestión de Personal Operativo
        </h2>
        {puedeAdministrarPersonal && <button
          onClick={() => {
            setTrabajadorAReenrolar(null);
            setMensajeRostro(null);
            setFotoCapturada(null);
            setVectorFacialCapturado(null);
            setErrorCapturaFacial(null);
            setCapturandoFoto(true);
            setModalAbierto(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#2e6f40] hover:bg-[#235732] text-white text-sm font-semibold rounded-lg transition"
        >
          <UserPlus size={18} /> Registrar trabajador y enrolar rostro
        </button>}
      </div>
      {mensajeRostro && (
        <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {mensajeRostro}
        </p>
      )}

      {puedeAdministrarPersonal && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">Catálogos de ranchos y puestos</h3>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-700">
                <MapPin size={17} className="text-[#2e6f40]" /> Ranchos
              </h4>
              <form onSubmit={altaRancho} className="mb-4 flex gap-2">
                <input required value={nuevoRancho} onChange={(event) => setNuevoRancho(event.target.value)}
                  placeholder="Nombre del rancho"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button type="submit" disabled={guardandoCatalogo}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#2e6f40] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  <Plus size={16} /> Agregar
                </button>
              </form>
              <ul className="divide-y divide-slate-100">
                {ranchos.map((ranchoCatalogo) => (
                  <li key={ranchoCatalogo.cloudId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className={ranchoCatalogo.activo ? 'text-slate-700' : 'text-slate-400'}>
                      {ranchoCatalogo.nombre}{!ranchoCatalogo.activo && ' (inactivo)'}
                    </span>
                    <button type="button" disabled={guardandoCatalogo} onClick={() => void cambiarEstadoRancho(ranchoCatalogo)}
                      className="text-xs font-medium text-[#2e6f40] disabled:opacity-50">
                      {ranchoCatalogo.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </li>
                ))}
                {ranchos.length === 0 && <li className="py-2 text-sm text-slate-500">Cargando ranchos...</li>}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-700">
                <Clock3 size={17} className="text-[#2e6f40]" /> Puestos y horarios
              </h4>
              <form onSubmit={altaPuesto} className="mb-4 space-y-2">
                <input required value={nuevoPuesto} onChange={(event) => setNuevoPuesto(event.target.value)}
                  placeholder="Nombre del puesto, por ejemplo Riego"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-slate-500">Entrada
                    <input required type="time" value={horaEntradaPuesto} onChange={(event) => setHoraEntradaPuesto(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700" />
                  </label>
                  <label className="text-xs font-medium text-slate-500">Salida
                    <input required type="time" value={horaSalidaPuesto} onChange={(event) => setHoraSalidaPuesto(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700" />
                  </label>
                </div>
                <button type="submit" disabled={guardandoCatalogo}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#2e6f40] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  <Plus size={16} /> Agregar puesto
                </button>
              </form>
              <ul className="divide-y divide-slate-100">
                {puestos.map((puestoCatalogo) => (
                  <li key={puestoCatalogo.cloudId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className={puestoCatalogo.activo ? 'text-slate-700' : 'text-slate-400'}>
                      {puestoCatalogo.nombre}: {puestoCatalogo.horaEntrada}–{puestoCatalogo.horaSalida}
                      {!puestoCatalogo.activo && ' (inactivo)'}
                    </span>
                    <button type="button" disabled={guardandoCatalogo} onClick={() => void cambiarEstadoPuesto(puestoCatalogo)}
                      className="text-xs font-medium text-[#2e6f40] disabled:opacity-50">
                      {puestoCatalogo.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </li>
                ))}
                {puestos.length === 0 && <li className="py-2 text-sm text-slate-500">Cargando puestos...</li>}
              </ul>
            </div>
          </div>
          {mensajeCatalogo && <p role="status" className="mt-3 text-sm text-slate-600">{mensajeCatalogo}</p>}
        </section>
      )}

      {/* Tabla de Personal */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
              <th className="p-4">ID Local</th>
              <th className="p-4">Nombre Completo</th>
              <th className="p-4">Rancho / Cuadrilla</th>
              <th className="p-4">Puesto / horario</th>
              <th className="p-4">Vacaciones</th>
              <th className="p-4">Estado</th>
              {puedeAdministrarPersonal && <th className="p-4 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {personal?.map((t) => {
              const puestoActual = puestos.find((opcion) => opcion.nombre === t.puesto);
              const puestoElegido = puestosElegidos[t.id ?? -1] ?? puestoActual?.cloudId ?? '';
              const estaDeVacaciones = Boolean(
                t.vacacionesInicio && t.vacacionesFin &&
                t.vacacionesInicio <= fechaHoy && t.vacacionesFin >= fechaHoy,
              );
              return (
              <tr key={t.id} className={`hover:bg-slate-50 ${t.estado === 'Baja' ? 'opacity-60 bg-slate-50' : ''}`}>
                <td className="p-4 text-slate-500 font-mono">{t.id}</td>
                <td className="p-4 font-semibold text-slate-800">{t.nombre}</td>
                <td className="p-4 text-slate-600">
                  <div className="font-medium text-slate-700">{t.rancho}</div>
                  <div className="text-xs">{t.cuadrilla}</div>
                </td>
                <td className="p-4">
                  {puedeAdministrarPersonal && t.estado === 'Activo' ? (
                    <div className="flex min-w-52 items-center gap-2">
                      <select aria-label={`Puesto de ${t.nombre}`} value={puestoElegido}
                        onChange={(event) => setPuestosElegidos((actuales) => ({ ...actuales, [t.id ?? -1]: event.target.value }))}
                        className="min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
                        <option value="">Sin asignar</option>
                        {puestoActual && !puestoActual.activo && (
                          <option value={puestoActual.cloudId}>{puestoActual.nombre} (inactivo)</option>
                        )}
                        {puestosActivos.map((opcion) => (
                          <option key={opcion.cloudId} value={opcion.cloudId}>
                            {opcion.nombre} ({opcion.horaEntrada}–{opcion.horaSalida})
                          </option>
                        ))}
                      </select>
                      <button type="button" title="Guardar puesto y horario"
                        disabled={!t.id || puestoElegido === (puestoActual?.cloudId ?? '')}
                        onClick={() => t.id && void asignarPuesto(t.id)}
                        className="rounded p-1.5 text-[#2e6f40] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40">
                        <Save size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-600">
                      <div>{t.puesto || 'Sin asignar'}</div>
                      <div className="text-xs">{t.horaEntradaProgramada && t.horaSalidaProgramada
                        ? `${t.horaEntradaProgramada}–${t.horaSalidaProgramada}` : ''}</div>
                    </div>
                  )}
                </td>
                <td className="p-4">
                  {estaDeVacaciones ? (
                    <p className="mb-2 text-xs font-medium text-sky-700">
                      De vacaciones hasta {t.vacacionesFin}
                    </p>
                  ) : t.vacacionesInicio && t.vacacionesFin ? (
                    <p className="mb-2 text-xs text-slate-500">
                      Periodo: {t.vacacionesInicio} a {t.vacacionesFin}
                    </p>
                  ) : null}
                  {puedeAdministrarPersonal && t.estado === 'Activo' && (
                    <>
                      <button type="button" onClick={() => {
                        setEditandoVacaciones(editandoVacaciones === t.id ? null : (t.id ?? null));
                        setVacacionesInicio(t.vacacionesInicio ?? fechaHoy);
                        setVacacionesFin(t.vacacionesFin ?? fechaHoy);
                      }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#2e6f40] hover:underline">
                        <CalendarDays size={14} /> {t.vacacionesInicio ? 'Editar vacaciones' : 'Registrar vacaciones'}
                      </button>
                      {editandoVacaciones === t.id && (
                        <form onSubmit={(event) => void guardarVacaciones(event, t.id!)} className="mt-2 min-w-48 space-y-2">
                          <label className="block text-[11px] text-slate-500">Desde
                            <input required type="date" value={vacacionesInicio}
                              onChange={(event) => setVacacionesInicio(event.target.value)}
                              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                          </label>
                          <label className="block text-[11px] text-slate-500">Hasta
                            <input required type="date" min={vacacionesInicio} value={vacacionesFin}
                              onChange={(event) => setVacacionesFin(event.target.value)}
                              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                          </label>
                          <div className="flex gap-2">
                            <button type="submit" className="rounded bg-[#2e6f40] px-2 py-1 text-xs font-semibold text-white">Guardar</button>
                            {t.vacacionesInicio && (
                              <button type="button" onClick={() => t.id && void quitarVacaciones(t.id)}
                                className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700">Quitar</button>
                            )}
                          </div>
                        </form>
                      )}
                    </>
                  )}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    t.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {t.estado}
                  </span>
                </td>
                {puedeAdministrarPersonal && <td className="p-4 text-right">
                  {t.estado === 'Activo' && (
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => {
                            setTrabajadorAReenrolar(t);
                            setMensajeRostro(null);
                            setFotoCapturada(null);
                            setVectorFacialCapturado(null);
                            setErrorCapturaFacial(null);
                            setCapturandoFoto(true);
                            setModalAbierto(true);
                          }}
                          className="rounded p-1.5 text-[#2e6f40] hover:bg-emerald-50"
                          title={t.vectorFacial ? 'Actualizar rostro' : 'Enrolar rostro'}
                          aria-label={`${t.vectorFacial ? 'Actualizar' : 'Enrolar'} rostro de ${t.nombre}`}
                        >
                          <Camera size={16} />
                        </button>
                        <button
                          onClick={() => handleBajaTrabajador(t.id!, t.nombre)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          title="Dar de Baja"
                          aria-label={`Dar de baja a ${t.nombre}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL DE ALTA TRABAJADOR */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-8 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#1a3821]">
                {trabajadorAReenrolar ? `Enrolar rostro: ${trabajadorAReenrolar.nombre}` : 'Alta de Nuevo Trabajador Operativo'}
              </h3>
              <button onClick={() => {
                setModalAbierto(false);
                setTrabajadorAReenrolar(null);
              }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAltaTrabajador} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Columna Izquierda: Cámara y Foto */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Camera size={16} className="text-[#2e6f40]" /> Captura Facial (Biometría Offline)
                </label>
                
                {capturandoFoto ? (
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black border-4 border-slate-100 shadow-inner">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: "user" }}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                        onClick={() => void capturarFoto()}
                        disabled={procesandoCapturaFacial}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-white text-[#2e6f40] rounded-full text-sm font-bold shadow-xl hover:bg-slate-50 transition flex items-center gap-2"
                      >
                        <Camera size={18} /> {procesandoCapturaFacial ? 'Procesando rostro...' : 'Capturar y enrolar rostro'}
                    </button>
                  </div>
                ) : (
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden border-4 border-emerald-400 shadow-inner">
                    <img src={fotoCapturada!} alt="Rostro capturado" className="w-full h-full object-cover" />
                    <div className="absolute top-3 right-3 p-1 bg-emerald-500 text-white rounded-full">
                        <CheckCircle size={20} />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFotoCapturada(null);
                        setVectorFacialCapturado(null);
                        setErrorCapturaFacial(null);
                        setCapturandoFoto(true);
                      }}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800 text-white rounded-full text-xs font-semibold shadow-lg hover:bg-slate-700"
                    >
                      Recapturar
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-500 text-center">
                  {vectorFacialCapturado
                    ? 'Rostro enrolado correctamente en este dispositivo.'
                    : 'Al capturar el rostro se enrolará automáticamente en este dispositivo.'}
                </p>
                {errorCapturaFacial && (
                  <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{errorCapturaFacial}</p>
                )}
              </div>

              {trabajadorAReenrolar ? (
                <div className="flex flex-col justify-center text-sm text-slate-600">
                  <p>Captura el rostro de {trabajadorAReenrolar.nombre} para habilitar su reconocimiento en el checador.</p>
                </div>
              ) : (
                <div className="space-y-5 flex flex-col justify-center">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Completo</label>
                    <input
                      id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#2e6f40]"
                      placeholder="Ej. Juan Pérez García"
                    />
                  </div>
                  <div>
                    <label htmlFor="rancho" className="block text-sm font-semibold text-slate-700 mb-1.5">Rancho Asignado</label>
                    <select
                      id="rancho" value={rancho || ranchosActivos[0]?.nombre || ''} onChange={(e) => setRancho(e.target.value)}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#2e6f40] bg-white"
                      required
                    >
                      {ranchosActivos.map((ranchoDisponible) => (
                        <option key={ranchoDisponible.cloudId} value={ranchoDisponible.nombre}>{ranchoDisponible.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="puesto" className="block text-sm font-semibold text-slate-700 mb-1.5">Puesto y horario</label>
                    <select id="puesto" value={puestoSeleccionado || puestosActivos[0]?.cloudId || 'none'}
                      onChange={(event) => setPuestoSeleccionado(event.target.value)}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#2e6f40] bg-white">
                      <option value="none">Sin horario asignado</option>
                      {puestosActivos.map((puestoDisponible) => (
                        <option key={puestoDisponible.cloudId} value={puestoDisponible.cloudId}>
                          {puestoDisponible.nombre} ({puestoDisponible.horaEntrada}–{puestoDisponible.horaSalida})
                        </option>
                      ))}
                    </select>
                    {puestosActivos.length === 0 && (
                      <p className="mt-1 text-xs text-amber-700">Agrega puestos en el catálogo para asignar horarios.</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="cuadrilla" className="block text-sm font-semibold text-slate-700 mb-1.5">Cuadrilla / Función</label>
                    <select
                      id="cuadrilla" value={cuadrilla} onChange={(e) => setCuadrilla(e.target.value)}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#2e6f40] bg-white"
                    >
                      {CUADRILLAS_DISPONIBLES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={cargandoAlta || procesandoCapturaFacial || !vectorFacialCapturado || (!trabajadorAReenrolar && ranchosActivos.length === 0)}
                  className="w-full rounded-lg bg-[#2e6f40] py-3 font-semibold text-white transition hover:bg-[#235732] disabled:opacity-60"
                >
                  {cargandoAlta
                    ? 'Guardando...'
                    : trabajadorAReenrolar
                      ? 'Guardar rostro enrolado'
                      : !vectorFacialCapturado
                        ? 'Captura y enrola el rostro para continuar'
                        : 'Registrar trabajador enrolado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
