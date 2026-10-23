"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { db, type Trabajador } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import {
  nombrePasoMarcacion,
  registrarSiguienteMarcacion,
} from "@/lib/asistencia";

type FaceApi = typeof import("@vladmandic/face-api");
type Mensaje = { tipo: "exito" | "error" | "info"; texto: string };

const DISTANCIA_MAXIMA = 0.5;
const MARGEN_MINIMO = 0.04;
const DIMENSION_DESCRIPTOR = 128;

function leerDescriptor(valor: string | undefined): number[] | null {
  if (!valor) return null;

  try {
    const descriptor: unknown = JSON.parse(valor);
    if (
      Array.isArray(descriptor) &&
      descriptor.length === DIMENSION_DESCRIPTOR &&
      descriptor.every(
        (valor): valor is number =>
          typeof valor === "number" && Number.isFinite(valor),
      )
    ) {
      return descriptor;
    }
  } catch {
    return null;
  }

  return null;
}

function mensajeDeError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado al procesar el rostro.";
}

export default function ChecadorFacial() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceApiRef = useRef<FaceApi | null>(null);
  const [camaraLista, setCamaraLista] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [modelosListos, setModelosListos] = useState(false);
  const [errorModelos, setErrorModelos] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [ultimoDetectado, setUltimoDetectado] = useState<string | null>(null);
  const trabajadores = useLiveQuery(
    () =>
      user ? db.trabajadores.where("userId").equals(user.id).toArray() : [],
    [user?.id],
  );
  const trabajadoresActivos = useMemo(
    () =>
      trabajadores?.filter((trabajador) => trabajador.estado === "Activo") ??
      [],
    [trabajadores],
  );
  const puedeProcesar = camaraLista && modelosListos && !procesando;

  useEffect(() => {
    let cancelado = false;
    let stream: MediaStream | null = null;

    const abrirCamara = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Este navegador no permite acceder a la cámara. Usa HTTPS o localhost.",
          );
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "user" } },
        });

        if (cancelado) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) throw new Error("No se encontró el visor de la cámara.");
        video.srcObject = stream;
        await video.play();
        setCamaraLista(true);
        setErrorCamara(null);
      } catch (error) {
        if (cancelado) return;
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
        const nombre = error instanceof DOMException ? error.name : "";
        const detalle =
          nombre === "NotAllowedError" || nombre === "SecurityError"
            ? "Permite el acceso a la cámara en el navegador y vuelve a intentarlo."
            : nombre === "NotFoundError"
              ? "No se encontró una cámara disponible en este dispositivo."
              : mensajeDeError(error);
        setErrorCamara(detalle);
      }
    };

    void abrirCamara();
    return () => {
      cancelado = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    const cargarModelos = async () => {
      try {
        const api = await import("@vladmandic/face-api");
        await Promise.all([
          api.nets.tinyFaceDetector.loadFromUri("/models"),
          api.nets.faceLandmark68Net.loadFromUri("/models"),
          api.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);

        if (cancelado) return;
        faceApiRef.current = api;
        setModelosListos(true);
      } catch (error) {
        if (cancelado) return;
        setErrorModelos(
          `No se pudieron cargar los modelos faciales locales: ${mensajeDeError(error)}`,
        );
      }
    };

    void cargarModelos();
    return () => {
      cancelado = true;
    };
  }, []);

  const obtenerDescriptor = async () => {
    const api = faceApiRef.current;
    const video = videoRef.current;
    if (
      !api ||
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      throw new Error(
        "La cámara todavía no está lista. Espera un momento y vuelve a intentar.",
      );
    }

    const resultados = await api
      .detectAllFaces(
        video,
        new api.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5,
        }),
      )
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (resultados.length === 0)
      throw new Error(
        "No se detectó ningún rostro. Colócate frente a la cámara.",
      );
    if (resultados.length > 1)
      throw new Error("Solo debe aparecer una persona frente a la cámara.");
    return resultados[0].descriptor;
  };

  const escanearYRegistrar = async () => {
    if (!trabajadores) {
      setMensaje({
        tipo: "error",
        texto: "Aún se está cargando la lista local de trabajadores.",
      });
      return;
    }

    const enrolados: Array<{ trabajador: Trabajador; descriptor: number[] }> =
      [];
    for (const trabajador of trabajadoresActivos) {
      if (!trabajador.vectorFacial) continue;
      const descriptor = leerDescriptor(trabajador.vectorFacial);
      if (!descriptor) {
        setMensaje({
          tipo: "error",
          texto: `La plantilla facial de ${trabajador.nombre} no es válida. Vuelve a enrolarlo.`,
        });
        return;
      }
      enrolados.push({ trabajador, descriptor });
    }
    if (enrolados.length === 0) {
      setMensaje({
        tipo: "error",
        texto:
          "No hay rostros enrolados. Da de alta a los trabajadores en Gestión de Personal capturando su rostro.",
      });
      return;
    }

    setProcesando(true);
    setMensaje({
      tipo: "info",
      texto:
        "Analizando el rostro y comparándolo con las plantillas locales...",
    });

    try {
      const descriptor = await obtenerDescriptor();
      const api = faceApiRef.current;
      if (!api)
        throw new Error(
          "El motor de reconocimiento facial todavía no está listo.",
        );

      const coincidencias = enrolados
        .map(({ trabajador, descriptor: plantilla }) => ({
          trabajador,
          distancia: api.euclideanDistance(descriptor, plantilla),
        }))
        .sort((a, b) => a.distancia - b.distancia);
      const mejorCoincidencia = coincidencias[0];
      const segundaCoincidencia = coincidencias[1];

      if (mejorCoincidencia.distancia > DISTANCIA_MAXIMA) {
        throw new Error(
          "No se reconoció el rostro. Verifica que esté enrolado e intenta de nuevo.",
        );
      }
      if (
        segundaCoincidencia &&
        segundaCoincidencia.distancia - mejorCoincidencia.distancia <
        MARGEN_MINIMO
      ) {
        throw new Error(
          "La coincidencia es ambigua. Asegúrate de que solo esté una persona frente a la cámara.",
        );
      }

      const trabajadorActual = await db.trabajadores.get(
        mejorCoincidencia.trabajador.id!,
      );
      if (!trabajadorActual?.id || trabajadorActual.estado !== "Activo") {
        throw new Error(
          "El trabajador reconocido ya no está activo en la base local.",
        );
      }

      if (!user?.id)
        throw new Error(
          "No se encontró una sesión activa para guardar la marcación.",
        );
      const { paso, hora } = await registrarSiguienteMarcacion(
        trabajadorActual,
        user.id,
      );
      setUltimoDetectado(trabajadorActual.nombre);
      setMensaje({
        tipo: "exito",
        texto: `${nombrePasoMarcacion(paso)} de ${trabajadorActual.nombre} registrada localmente a las ${hora}.`,
      });
    } catch (error) {
      setMensaje({ tipo: "error", texto: mensajeDeError(error) });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#1a3821] flex items-center justify-center gap-2">
          <Camera className="text-[#2e6f40]" /> Checador Facial
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Colócate frente a la cámara y pulsa el botón para registrar tu
          siguiente marcación.
        </p>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border-4 border-slate-100 shadow-inner">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div
          className={`absolute inset-12 border-2 border-dashed rounded-3xl pointer-events-none ${procesando
              ? "border-amber-400 bg-amber-400/10"
              : "border-emerald-400/70"
            }`}
        >
          {procesando && (
            <div className="w-full h-1 bg-amber-400/80 animate-pulse shadow-lg" />
          )}
        </div>
        {!camaraLista && !errorCamara && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/60">
            Solicitando permiso para usar la cámara...
          </div>
        )}
      </div>

      {errorCamara && (
        <div className="mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle size={18} />
          <span>{errorCamara}</span>
        </div>
      )}

      {errorModelos && (
        <div className="mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle size={18} />
          <span>{errorModelos}</span>
        </div>
      )}

      {!modelosListos && !errorModelos && (
        <div className="mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 bg-amber-100 text-amber-800">
          <RefreshCw size={18} className="animate-spin" />
          <span>Cargando rostros...</span>
        </div>
      )}

      {!camaraLista && !errorCamara && (
        <div className="mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 bg-amber-100 text-amber-800">
          <RefreshCw size={18} className="animate-spin" />
          <span>Esperando permiso de cámara...</span>
        </div>
      )}

      {mensaje && (
        <div
          role="status"
          className={`mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 justify-center ${mensaje.tipo === "exito"
              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
              : mensaje.tipo === "error"
                ? "bg-rose-100 text-rose-800 border border-rose-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
        >
          {mensaje.tipo === "exito" ? (
            <CheckCircle2 size={18} />
          ) : mensaje.tipo === "error" ? (
            <AlertCircle size={18} />
          ) : (
            <RefreshCw size={18} className="animate-spin" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {ultimoDetectado && (
        <div className="mt-4 p-4 bg-[#f4f6f4] rounded-lg border border-slate-200 text-center">
          <p className="text-xs text-slate-500 uppercase font-semibold">
            Última marcación reconocida:
          </p>
          <p className="text-lg font-bold text-[#1a3821]">{ultimoDetectado}</p>
        </div>
      )}

      <button
        onClick={escanearYRegistrar}
        disabled={!puedeProcesar || !trabajadores}
        className="w-full mt-5 py-3 bg-[#2e6f40] hover:bg-[#235732] text-white font-semibold rounded-lg transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {procesando ? (
          <>
            <RefreshCw size={18} className="animate-spin" /> Procesando
            rostro...
          </>
        ) : (
          <>
            <UserCheck size={18} /> Escanear rostro y registrar marcación
          </>
        )}
      </button>
    </div>
  );
}
