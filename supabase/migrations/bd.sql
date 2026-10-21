
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT ''::text,
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['admin'::text, 'user'::text])),
  permissions ARRAY NOT NULL DEFAULT '{}'::text[] CHECK (permissions <@ ARRAY['asistencia'::text, 'checador'::text, 'personal'::text, 'reportes'::text]),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);


CREATE TABLE public.trabajadores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nombre text NOT NULL,
  cuadrilla text NOT NULL,
  rancho text NOT NULL,
  estado text NOT NULL CHECK (estado = ANY (ARRAY['Activo'::text, 'Baja'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  puesto text,
  hora_entrada_programada time without time zone,
  hora_salida_programada time without time zone,
  vacaciones_inicio date,
  vacaciones_fin date,
  CONSTRAINT trabajadores_pkey PRIMARY KEY (id),
  CONSTRAINT trabajadores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);


CREATE TABLE public.asistencias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trabajador_id uuid,
  nombre text NOT NULL,
  cuadrilla text NOT NULL,
  rancho text NOT NULL,
  hora_entrada text NOT NULL,
  fecha date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  hora_salida_comida text,
  hora_regreso_comida text,
  hora_salida text,
  CONSTRAINT asistencias_pkey PRIMARY KEY (id),
  CONSTRAINT asistencias_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT asistencias_trabajador_id_fkey FOREIGN KEY (trabajador_id) REFERENCES public.trabajadores(id)
);


CREATE TABLE public.ranchos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ranchos_pkey PRIMARY KEY (id)
);



CREATE TABLE public.puestos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  hora_entrada time without time zone NOT NULL,
  hora_salida time without time zone NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT puestos_pkey PRIMARY KEY (id)
);