"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import Webcam from "react-webcam";
import { Camera, CheckCircle, X } from "lucide-react";
import type { Cuadrilla, Puesto, Rancho, Trabajador } from "@/lib/db";

export interface AltaTrabajadorFormData {
  
  idSys21: string;
  nombre: string;
  rancho: string;
  cuadrilla: string;
  puestoSeleccionado: string;
  vectorFacial: string;
}

interface AltaTrabajadorModalProps {
  trabajadorAReenrolar: Trabajador | null;
  ranchosActivos: Rancho[];
  cuadrillasActivas: Cuadrilla[];
  puestosActivos: Puesto[];
  cargando: boolean;
  onClose: () => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
    datos: AltaTrabajadorFormData,
  ) => void;
}

export default function AltaTrabajadorModal({
  trabajadorAReenrolar,
  ranchosActivos,
  cuadrillasActivas,
  puestosActivos,
  cargando,
  onClose,
  onSubmit,
}: AltaTrabajadorModalProps) {
  const [nombre, setNombre] = useState("");
  const [idSys21, setIdSys21] = useState("");
  const [rancho, setRancho] = useState("");
  const [cuadrilla, setCuadrilla] = useState("");
  const [puestoSeleccionado, setPuestoSeleccionado] = useState("");
  const [capturandoFoto, setCapturandoFoto] = useState(true);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  const [vectorFacial, setVectorFacial] = useState<string | null>(null);
  const [procesandoCaptura, setProcesandoCaptura] = useState(false);
  const [errorCaptura, setErrorCaptura] = useState<string | null>(null);
  const faceApiPromiseRef = useRef<
    Promise<typeof import("@vladmandic/face-api")> | null
  >(null);
  const webcamRef = useRef<Webcam>(null);

  const cuadrillaSeleccionada = cuadrillasActivas.some(
    (opcion) => opcion.nombre === cuadrilla,
  )
    ? cuadrilla
    : (cuadrillasActivas[0]?.nombre ?? "");

  const capturarFoto = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      setErrorCaptura(
        "No se pudo capturar la imagen. Verifica que la cámara esté activa.",
      );
      return;
    }

    setProcesandoCaptura(true);
    setErrorCaptura(null);
    setVectorFacial(null);
    try {
      if (!faceApiPromiseRef.current) {
        faceApiPromiseRef.current = import("@vladmandic/face-api").then(
          async (api) => {
            await Promise.all([
              api.nets.tinyFaceDetector.loadFromUri("/models"),
              api.nets.faceLandmark68Net.loadFromUri("/models"),
              api.nets.faceRecognitionNet.loadFromUri("/models"),
            ]);
            return api;
          },
        );
      }
      const api = await faceApiPromiseRef.current;
      const imagen = new Image();
      imagen.src = imageSrc;
      await imagen.decode();
      const resultados = await api
        .detectAllFaces(
          imagen,
          new api.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5,
          }),
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (resultados.length === 0) {
        throw new Error(
          "No se detectó ningún rostro. Colócate frente a la cámara e intenta otra vez.",
        );
      }
      if (resultados.length > 1) {
        throw new Error("Solo debe aparecer un trabajador frente a la cámara.");
      }

      setFotoCapturada(imageSrc);
      setVectorFacial(
        JSON.stringify(Array.from(resultados[0].descriptor)),
      );
      setCapturandoFoto(false);
    } catch (error) {
      faceApiPromiseRef.current = null;
      console.error("No se pudo procesar el rostro durante el alta:", error);
      setErrorCaptura(
        error instanceof Error ? error.message : "No se pudo procesar el rostro.",
      );
    } finally {
      setProcesandoCaptura(false);
    }
  }, []);

  const recapturarFoto = () => {
    setFotoCapturada(null);
    setVectorFacial(null);
    setErrorCaptura(null);
    setCapturandoFoto(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const cuadrillaAsignada = cuadrillasActivas.find(
      (opcion) => opcion.nombre === cuadrillaSeleccionada,
    );
    const ranchoAsignado =
      ranchosActivos.find((opcion) => opcion.nombre === rancho) ??
      ranchosActivos[0];
    const puestoAsignado =
      puestoSeleccionado === "none"
        ? undefined
        : (puestosActivos.find(
            (opcion) => opcion.cloudId === puestoSeleccionado,
          ) ?? puestosActivos[0]);

    onSubmit(event, {
      nombre,
      idSys21: idSys21.trim(),
      rancho: ranchoAsignado?.nombre ?? "",
      cuadrilla: cuadrillaAsignada?.nombre ?? "",
      puestoSeleccionado: puestoAsignado?.cloudId ?? "none",
      vectorFacial: vectorFacial ?? "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-[#1a3821]">
            {trabajadorAReenrolar
              ? `Enrolar rostro: ${trabajadorAReenrolar.nombre}`
              : "Alta de Nuevo Trabajador Operativo"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-8 md:grid-cols-2"
        >
          <div className="space-y-4">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Camera size={16} className="text-[#2e6f40]" /> Captura Facial
              (Biometría Offline)
            </label>

            {capturandoFoto ? (
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl border-4 border-slate-100 bg-black shadow-inner">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user" }}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => void capturarFoto()}
                  disabled={procesandoCaptura}
                  className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#2e6f40] shadow-xl transition hover:bg-slate-50"
                >
                  <Camera size={18} />{" "}
                  {procesandoCaptura
                    ? "Procesando rostro..."
                    : "Capturar y enrolar rostro"}
                </button>
              </div>
            ) : (
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl border-4 border-emerald-400 shadow-inner">
                <img
                  src={fotoCapturada ?? ""}
                  alt="Rostro capturado"
                  className="h-full w-full object-cover"
                />
                <div className="absolute right-3 top-3 rounded-full bg-emerald-500 p-1 text-white">
                  <CheckCircle size={20} />
                </div>
                <button
                  type="button"
                  onClick={recapturarFoto}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-slate-700"
                >
                  Recapturar
                </button>
              </div>
            )}
            <p className="text-center text-xs text-slate-500">
              {vectorFacial
                ? "Rostro enrolado correctamente en este dispositivo."
                : "Al capturar el rostro se enrolará automáticamente en este dispositivo."}
            </p>
            {errorCaptura && (
              <p
                role="alert"
                className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
              >
                {errorCaptura}
              </p>
            )}
          </div>

          {trabajadorAReenrolar ? (
            <div className="flex flex-col justify-center text-sm text-slate-600">
              <p>
                Captura el rostro de {trabajadorAReenrolar.nombre} para
                habilitar su reconocimiento en el checador.
              </p>
            </div>
          ) : (


            <div className="flex flex-col justify-center space-y-5">
              <label className="block text-sm font-semibold text-slate-700">
                ID Sys21
                <input
                  type="text"
                  value={idSys21}
                  onChange={(event) => setIdSys21(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border p-3 font-normal focus:ring-2 focus:ring-[#2e6f40]"
                  placeholder="Ej. 001234"
                />
              </label>


              <label className="block text-sm font-semibold text-slate-700">
                Nombre Completo
                <input
                  type="text"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  required
                  className="mt-1.5 w-full rounded-lg border p-3 font-normal focus:ring-2 focus:ring-[#2e6f40]"
                  placeholder="Ej. Juan Pérez García"
                />
              </label>
              
              <label className="block text-sm font-semibold text-slate-700">
                Rancho Asignado
                <select
                  value={rancho || ranchosActivos[0]?.nombre || ""}
                  onChange={(event) => setRancho(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border bg-white p-3 font-normal focus:ring-2 focus:ring-[#2e6f40]"
                  required
                >
                  {ranchosActivos.map((opcion) => (
                    <option key={opcion.cloudId} value={opcion.nombre}>
                      {opcion.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Puesto y horario
                <select
                  value={
                    puestoSeleccionado ||
                    puestosActivos[0]?.cloudId ||
                    "none"
                  }
                  onChange={(event) =>
                    setPuestoSeleccionado(event.target.value)
                  }
                  className="mt-1.5 w-full rounded-lg border bg-white p-3 font-normal focus:ring-2 focus:ring-[#2e6f40]"
                >
                  <option value="none">Sin horario asignado</option>
                  {puestosActivos.map((opcion) => (
                    <option key={opcion.cloudId} value={opcion.cloudId}>
                      {opcion.nombre} ({opcion.horaEntrada}–{opcion.horaSalida})
                    </option>
                  ))}
                </select>
                {puestosActivos.length === 0 && (
                  <span className="mt-1 block text-xs font-normal text-amber-700">
                    Agrega puestos en el catálogo para asignar horarios.
                  </span>
                )}
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Cuadrilla / Función
                <select
                  value={cuadrillaSeleccionada}
                  onChange={(event) => setCuadrilla(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border bg-white p-3 font-normal focus:ring-2 focus:ring-[#2e6f40]"
                  required
                >
                  {cuadrillasActivas.map((opcion) => (
                    <option key={opcion.cloudId} value={opcion.nombre}>
                      {opcion.nombre}
                    </option>
                  ))}
                </select>
                {cuadrillasActivas.length === 0 && (
                  <span className="mt-1 block text-xs font-normal text-amber-700">
                    Agrega una cuadrilla en el catálogo para registrar
                    trabajadores.
                  </span>
                )}
              </label>
            </div>
          )}

          <div className="flex items-end">
            <button
              type="submit"
              disabled={
                cargando ||
                procesandoCaptura ||
                !vectorFacial ||
                (!trabajadorAReenrolar &&
                  (ranchosActivos.length === 0 ||
                    cuadrillasActivas.length === 0))
              }
              className="w-full rounded-lg bg-[#2e6f40] py-3 font-semibold text-white transition hover:bg-[#235732] disabled:opacity-60"
            >
              {cargando
                ? "Guardando..."
                : trabajadorAReenrolar
                  ? "Guardar rostro enrolado"
                  : !vectorFacial
                    ? "Captura y enrola el rostro para continuar"
                    : "Registrar trabajador enrolado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
