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
  vectorFacial?: string | null;
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
  fecha: string;
  sincronizado: boolean;
}

export class CampoSyncDB extends Dexie {
  trabajadores!: Table<Trabajador>;
  colaboradores!: Table<Trabajador>;
  asistencias!: Table<RegistroAsistencia>;

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
  }
}

export const db = new CampoSyncDB();
