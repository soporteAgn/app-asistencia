export const MODULOS = [
  { id: 'asistencia', nombre: 'Asistencia' },
  { id: 'checador', nombre: 'Checador facial' },
  { id: 'personal', nombre: 'Gestión de personal' },
  { id: 'reportes', nombre: 'Reportes Excel' },
] as const;

export type Modulo = (typeof MODULOS)[number]['id'];
export type Perfil = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  permissions: Modulo[];
};
