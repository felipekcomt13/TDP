-- =====================================================
-- MIGRACIÓN: Socios Comerciales
-- =====================================================
-- Ejecutar este script en Supabase SQL Editor
-- =====================================================

-- 1. Crear tabla de socios comerciales
CREATE TABLE IF NOT EXISTS public.socios_comerciales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  beneficio TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('restaurante', 'tienda', 'gym', 'salud', 'entretenimiento', 'otro')),
  logo_url TEXT,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_socios_comerciales_activo ON public.socios_comerciales(activo);
CREATE INDEX IF NOT EXISTS idx_socios_comerciales_orden ON public.socios_comerciales(orden);
CREATE INDEX IF NOT EXISTS idx_socios_comerciales_categoria ON public.socios_comerciales(categoria);

-- 3. Habilitar RLS
ALTER TABLE public.socios_comerciales ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS (idempotente: elimina si existen y recrea)

DROP POLICY IF EXISTS "Todos pueden ver socios comerciales activos" ON public.socios_comerciales;
CREATE POLICY "Todos pueden ver socios comerciales activos"
  ON public.socios_comerciales
  FOR SELECT
  USING (activo = true);

DROP POLICY IF EXISTS "Admins pueden ver todos los socios comerciales" ON public.socios_comerciales;
CREATE POLICY "Admins pueden ver todos los socios comerciales"
  ON public.socios_comerciales
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins pueden insertar socios comerciales" ON public.socios_comerciales;
CREATE POLICY "Admins pueden insertar socios comerciales"
  ON public.socios_comerciales
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins pueden actualizar socios comerciales" ON public.socios_comerciales;
CREATE POLICY "Admins pueden actualizar socios comerciales"
  ON public.socios_comerciales
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins pueden eliminar socios comerciales" ON public.socios_comerciales;
CREATE POLICY "Admins pueden eliminar socios comerciales"
  ON public.socios_comerciales
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_socios_comerciales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_socios_comerciales_updated_at ON public.socios_comerciales;
CREATE TRIGGER trigger_update_socios_comerciales_updated_at
  BEFORE UPDATE ON public.socios_comerciales
  FOR EACH ROW
  EXECUTE FUNCTION update_socios_comerciales_updated_at();

-- 6. Seed de ejemplo
INSERT INTO public.socios_comerciales (nombre, descripcion, beneficio, categoria, orden, activo)
VALUES
  ('Restaurante El Canasto', 'Restaurante criollo y parrillas cerca al complejo', '15% de descuento en almuerzos para socios', 'restaurante', 1, true),
  ('Sport Center Pro', 'Tienda deportiva especializada en basketball', '10% de descuento en zapatillas y accesorios', 'tienda', 2, true),
  ('Gym Iron Fitness', 'Gimnasio completo con área de cardio y pesas', '1 semana gratis + 20% en mensualidad', 'gym', 3, true),
  ('Fisioterapia Salud Total', 'Centro de rehabilitación y fisioterapia deportiva', 'Primera consulta gratuita para socios', 'salud', 4, true),
  ('Cine Planet', 'Cadena de cines con múltiples salas', '2x1 en entradas los días miércoles', 'entretenimiento', 5, true);

-- 7. Políticas RLS para el bucket de Storage "images" (idempotente)

DROP POLICY IF EXISTS "Lectura pública de imágenes" ON storage.objects;
CREATE POLICY "Lectura pública de imágenes"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Admins pueden subir imágenes" ON storage.objects;
CREATE POLICY "Admins pueden subir imágenes"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins pueden actualizar imágenes" ON storage.objects;
CREATE POLICY "Admins pueden actualizar imágenes"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins pueden eliminar imágenes" ON storage.objects;
CREATE POLICY "Admins pueden eliminar imágenes"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 8. Funciones RPC para operaciones de actualización (evita CORS con PATCH)

CREATE OR REPLACE FUNCTION editar_socio_comercial(
  p_id UUID,
  p_nombre TEXT,
  p_descripcion TEXT,
  p_beneficio TEXT,
  p_categoria TEXT,
  p_logo_url TEXT
) RETURNS void AS $$
BEGIN
  UPDATE public.socios_comerciales
  SET nombre = p_nombre,
      descripcion = p_descripcion,
      beneficio = p_beneficio,
      categoria = p_categoria,
      logo_url = p_logo_url
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION toggle_socio_comercial(
  p_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE public.socios_comerciales
  SET activo = NOT activo
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reordenar_socios_comerciales(
  p_id_1 UUID,
  p_orden_1 INTEGER,
  p_id_2 UUID,
  p_orden_2 INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE public.socios_comerciales SET orden = p_orden_1 WHERE id = p_id_1;
  UPDATE public.socios_comerciales SET orden = p_orden_2 WHERE id = p_id_2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Función RPC batch para reordenar múltiples socios (drag & drop)
CREATE OR REPLACE FUNCTION reordenar_socios_comerciales_batch(
  p_ids UUID[],
  p_ordenes INTEGER[]
) RETURNS void AS $$
DECLARE i INTEGER;
BEGIN
  FOR i IN 1..array_length(p_ids, 1) LOOP
    UPDATE public.socios_comerciales SET orden = p_ordenes[i] WHERE id = p_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
