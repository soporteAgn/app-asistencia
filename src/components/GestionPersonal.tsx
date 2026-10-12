'use client';

import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/lib/auth';
import { UserPlus, Users, Trash2, Camera, X, CheckCircle } from 'lucide-react';

const RANCHOS_DISPONIBLES = ['Rancho El Paraíso', 'Rancho La Esperanza', 'Rancho San Miguel', 'Rancho Los Olivos'];
const CUADRILLAS_DISPONIBLES = ['Cuadrilla A - Cosecha', 'Cuadrilla B - Riego', 'Cuadrilla C - Empaque', 'Mantenimiento'];

export default function GestionPersonal() {
  const { user, profile } = useAuth();
  const puedeAdministrarPersonal = profile?.role === 'admin';
  const [modalAbierto, setModalAbierto] = useState(false);
  const [capturandoFoto, setCapturandoFoto] = useState(true);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [rancho, setRancho] = useState(RANCHOS_DISPONIBLES[0]);
  const [cuadrilla, setCuadrilla] = useState(CUADRILLAS_DISPONIBLES[0]);
  const [cargandoAlta, setCargandoAlta] = useState(false);

  // Consultar personal registrado localmente en tiempo real
  const personal = useLiveQuery(
    () => user ? db.trabajadores.where('userId').equals(user.id).toArray() : [],
    [user?.id],
  );

  // Función para capturar foto de la webcam
  const capturarFoto = React.useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setFotoCapturada(imageSrc);
      setCapturandoFoto(false);
    }
  }, [webcamRef]);

  // Función para registrar el alta en IndexedDB
  const handleAltaTrabajador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !fotoCapturada) {
      alert('Por favor completa el nombre y captura la foto facial.');
      return;
    }

    setCargandoAlta(true);

    try {
      await db.trabajadores.add({
        nombre,
        rancho,
        cuadrilla,
        estado: 'Activo',
        userId: user?.id,
        cloudId: crypto.randomUUID(),
        sincronizado: false,
        // fotoRostro: fotoCapturada // Aquí se guardaría la foto facial localmente
      });

      // Limpiar formulario y cerrar modal
      setNombre('');
      setRancho(RANCHOS_DISPONIBLES[0]);
      setCuadrilla(CUADRILLAS_DISPONIBLES[0]);
      setFotoCapturada(null);
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
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#2e6f40] hover:bg-[#235732] text-white text-sm font-semibold rounded-lg transition"
        >
          <UserPlus size={18} /> Registrar Nuevo Trabajador (Alta Facial)
        </button>}
      </div>

      {/* Tabla de Personal */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
              <th className="p-4">ID Local</th>
              <th className="p-4">Nombre Completo</th>
              <th className="p-4">Rancho / Cuadrilla</th>
              <th className="p-4">Estado</th>
              {puedeAdministrarPersonal && <th className="p-4 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {personal?.map((t) => (
              <tr key={t.id} className={`hover:bg-slate-50 ${t.estado === 'Baja' ? 'opacity-60 bg-slate-50' : ''}`}>
                <td className="p-4 text-slate-500 font-mono">{t.id}</td>
                <td className="p-4 font-semibold text-slate-800">{t.nombre}</td>
                <td className="p-4 text-slate-600">
                  <div className="font-medium text-slate-700">{t.rancho}</div>
                  <div className="text-xs">{t.cuadrilla}</div>
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
                    <button
                      onClick={() => handleBajaTrabajador(t.id!, t.nombre)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                      title="Dar de Baja"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE ALTA TRABAJADOR */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-8 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#1a3821]">Alta de Nuevo Trabajador Operativo</h3>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-slate-600">
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
                      onClick={capturarFoto}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-white text-[#2e6f40] rounded-full text-sm font-bold shadow-xl hover:bg-slate-50 transition flex items-center gap-2"
                    >
                      <Camera size={18} /> Capturar Rostro
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
                      onClick={() => { setFotoCapturada(null); setCapturandoFoto(true); }}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800 text-white rounded-full text-xs font-semibold shadow-lg hover:bg-slate-700"
                    >
                      Recapturar
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-500 text-center">La foto se procesará localmente para crear el vector facial.</p>
              </div>

              {/* Columna Derecha: Datos */}
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
                    id="rancho" value={rancho} onChange={(e) => setRancho(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#2e6f40] bg-white"
                  >
                    {RANCHOS_DISPONIBLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
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

                <div className="pt-6">
                    <button
                        type="submit" disabled={cargandoAlta}
                        className="w-full py-3 bg-[#2e6f40] hover:bg-[#235732] text-white font-semibold rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {cargandoAlta ? 'Registrando localmente...' : 'Finalizar Registro y Alta Local'}
                    </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
