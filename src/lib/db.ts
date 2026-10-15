import Dexie, { Table } from 'dexie';

export interface Trabajador {
  id?: number;
  cloudId?: string;
  userId?: string;
  sincronizado?: boolean;
  nombre: string;
  cuadrilla: string;
  rancho: string;
  estado: 'Activo' | 'Baja';
  puesto?: string;
  horaEntradaProgramada?: string | null;
  horaSalidaProgramada?: string | null;
  vacacionesInicio?: string | null;
  vacacionesFin?: string | null;
  vectorFacial?: string | null;
}

export interface Rancho {
  id?: number;
  cloudId: string;
  nombre: string;
  activo: boolean;
}

export interface Puesto {
  id?: number;
  cloudId: string;
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  activo: boolean;
}

export interface RegistroAsistencia {
  id?: number;
  cloudId?: string;
  userId?: string;
  trabajadorId: number;
  nombre: string;
  cuadrilla: string;
  rancho: string;
  horaEntrada: string;
  horaSalidaComida?: string;
  horaRegresoComida?: string;
  horaSalida?: string;
  fecha: string;
  sincronizado: boolean;
}

export class CampoSyncDB extends Dexie {
  trabajadores!: Table<Trabajador>;
  colaboradores!: Table<Trabajador>;
  asistencias!: Table<RegistroAsistencia>;
  ranchos!: Table<Rancho>;
  puestos!: Table<Puesto>;

  constructor() {
    super('CampoSyncDatabase');
    this.version(1).stores({
      trabajadores: '++id, nombre, cuadrilla, rancho, estado',
      colaboradores: '++id, nombre, cuadrilla, rancho, estado',
      asistencias: '++id, trabajadorId, fecha, sincronizado'
    });
    this.version(2).stores({
      trabajadores: '++id, nombre, cuadrilla, rancho, estado, userId, cloudId',
      colaboradores: '++id, nombre, cuadrilla, rancho, estado',
      asistencias: '++id, trabajadorId, fecha, sincronizado, userId, cloudId'
    });
    this.version(3).stores({
      trabajadores: '++id, nombre, cuadrilla, rancho, estado, userId, cloudId, sincronizado',
      colaboradores: '++id, nombre, cuadrilla, rancho, estado',
      asistencias: '++id, trabajadorId, fecha, sincronizado, userId, cloudId'
    });
    this.version(4).stores({
      trabajadores: '++id, nombre, cuadrilla, rancho, estado, userId, cloudId, sincronizado',
      colaboradores: '++id, nombre, cuadrilla, rancho, estado',
      asistencias: '++id, trabajadorId, fecha, sincronizado, userId, cloudId',
      ranchos: '++id, cloudId, nombre, activo',
      puestos: '++id, cloudId, nombre, activo',
    });
  }
}

export const db = new CampoSyncDB();
