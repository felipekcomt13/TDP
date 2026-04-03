-- Tabla: libro_reclamaciones
-- INDECOPI - Ley 29571, Reglamento DS 011-2011-PCM, Ley 31435

create table if not exists public.libro_reclamaciones (
  id uuid primary key default gen_random_uuid(),
  correlativo text not null unique,
  fecha_registro timestamptz not null default now(),

  -- Datos del consumidor (Sección A)
  consumidor_nombre text not null,
  consumidor_dni text not null,
  consumidor_telefono text not null,
  consumidor_email text not null,
  es_menor_edad boolean not null default false,
  representante_nombre text,
  representante_dni text,
  representante_telefono text,
  representante_email text,

  -- Bien o servicio (Sección B)
  tipo_bien_servicio text not null check (tipo_bien_servicio in ('servicio', 'producto')),
  descripcion_bien_servicio text not null,
  monto numeric(10, 2),

  -- Detalle de la reclamación (Sección C)
  tipo_reclamacion text not null check (tipo_reclamacion in ('reclamo', 'queja')),
  detalle text not null,
  pedido text not null,

  -- Conformidad del consumidor (reemplaza firma, Sección D)
  acepta_terminos boolean not null default false,
  fecha_confirmacion timestamptz not null default now(),

  -- Respuesta del proveedor (Sección E)
  respuesta_proveedor text,
  fecha_respuesta timestamptz,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_proceso', 'respondido', 'cerrado')),

  created_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_libro_reclamaciones_correlativo on public.libro_reclamaciones(correlativo);
create index if not exists idx_libro_reclamaciones_estado on public.libro_reclamaciones(estado);
create index if not exists idx_libro_reclamaciones_fecha on public.libro_reclamaciones(fecha_registro desc);

-- RLS
alter table public.libro_reclamaciones enable row level security;

-- Cualquiera puede insertar (consumidores anónimos)
create policy "Cualquiera puede registrar reclamacion"
  on public.libro_reclamaciones for insert
  to anon, authenticated
  with check (true);

-- Solo admins pueden ver y actualizar
create policy "Solo admins pueden ver reclamaciones"
  on public.libro_reclamaciones for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Solo admins pueden actualizar reclamaciones"
  on public.libro_reclamaciones for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
