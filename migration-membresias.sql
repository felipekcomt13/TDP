-- =====================================================
-- MIGRACIÓN: Sistema de Membresías/Socios
-- =====================================================
-- Ejecutar este script en Supabase SQL Editor
-- =====================================================

-- 1. Crear tabla de membresías
CREATE TABLE IF NOT EXISTS public.membresias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'expirada', 'cancelada')),
  precio_pagado DECIMAL(10,2),
  metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'yape', 'plin', 'transferencia', 'otro')),
  referencia_pago TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notas TEXT
);

-- 2. Agregar columnas a profiles (si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'es_socio') THEN
    ALTER TABLE public.profiles ADD COLUMN es_socio BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'membresia_activa_id') THEN
    ALTER TABLE public.profiles ADD COLUMN membresia_activa_id UUID REFERENCES public.membresias(id);
  END IF;
END $$;

-- 3. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_membresias_user_id ON public.membresias(user_id);
CREATE INDEX IF NOT EXISTS idx_membresias_estado ON public.membresias(estado);
CREATE INDEX IF NOT EXISTS idx_membresias_fecha_fin ON public.membresias(fecha_fin);
CREATE INDEX IF NOT EXISTS idx_profiles_es_socio ON public.profiles(es_socio);

-- 4. Habilitar RLS en la tabla de membresías
ALTER TABLE public.membresias ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para membresías

-- Los usuarios pueden ver sus propias membresías
CREATE POLICY "Usuarios pueden ver sus propias membresias"
  ON public.membresias
  FOR SELECT
  USING (auth.uid() = user_id);

-- Los admins pueden ver todas las membresías
CREATE POLICY "Admins pueden ver todas las membresias"
  ON public.membresias
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Los admins pueden insertar membresías
CREATE POLICY "Admins pueden crear membresias"
  ON public.membresias
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Los admins pueden actualizar membresías
CREATE POLICY "Admins pueden actualizar membresias"
  ON public.membresias
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Función RPC: Activar membresía
CREATE OR REPLACE FUNCTION public.activar_membresia(
  p_user_id UUID,
  p_duracion_dias INTEGER,
  p_precio DECIMAL DEFAULT NULL,
  p_metodo_pago TEXT DEFAULT NULL,
  p_notas TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_nueva_membresia_id UUID;
  v_fecha_inicio DATE;
  v_fecha_fin DATE;
BEGIN
  -- Verificar que el usuario que ejecuta es admin
  v_admin_id := auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_admin_id AND role = 'admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos de administrador');
  END IF;

  -- Verificar que el usuario objetivo existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'El usuario no existe');
  END IF;

  -- Establecer fechas
  v_fecha_inicio := CURRENT_DATE;
  v_fecha_fin := CURRENT_DATE + p_duracion_dias;

  -- Desactivar membresía anterior si existe
  UPDATE public.membresias
  SET estado = 'expirada',
      updated_at = NOW()
  WHERE user_id = p_user_id AND estado = 'activa';

  -- Crear nueva membresía
  INSERT INTO public.membresias (
    user_id,
    fecha_inicio,
    fecha_fin,
    estado,
    precio_pagado,
    metodo_pago,
    notas,
    created_by
  ) VALUES (
    p_user_id,
    v_fecha_inicio,
    v_fecha_fin,
    'activa',
    p_precio,
    p_metodo_pago,
    p_notas,
    v_admin_id
  )
  RETURNING id INTO v_nueva_membresia_id;

  -- Actualizar perfil del usuario
  UPDATE public.profiles
  SET es_socio = true,
      membresia_activa_id = v_nueva_membresia_id
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'membresia_id', v_nueva_membresia_id,
    'fecha_inicio', v_fecha_inicio,
    'fecha_fin', v_fecha_fin,
    'mensaje', 'Membresía activada exitosamente'
  );
END;
$$;

-- 7. Función RPC: Desactivar membresía
CREATE OR REPLACE FUNCTION public.desactivar_membresia(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Verificar que el usuario que ejecuta es admin
  v_admin_id := auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_admin_id AND role = 'admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos de administrador');
  END IF;

  -- Verificar que el usuario objetivo existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'El usuario no existe');
  END IF;

  -- Cancelar membresía activa
  UPDATE public.membresias
  SET estado = 'cancelada',
      updated_at = NOW()
  WHERE user_id = p_user_id AND estado = 'activa';

  -- Actualizar perfil del usuario
  UPDATE public.profiles
  SET es_socio = false,
      membresia_activa_id = NULL
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'mensaje', 'Membresía desactivada exitosamente'
  );
END;
$$;

-- 8. Función RPC: Obtener membresía activa de un usuario
CREATE OR REPLACE FUNCTION public.obtener_membresia_activa(p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_membresia RECORD;
BEGIN
  -- Si no se especifica user_id, usar el usuario actual
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Si se especifica otro usuario, verificar que sea admin
  IF p_user_id IS NOT NULL AND p_user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RETURN json_build_object('success', false, 'error', 'No tienes permisos para ver otras membresías');
    END IF;
  END IF;

  -- Buscar membresía activa
  SELECT *
  INTO v_membresia
  FROM public.membresias
  WHERE user_id = v_user_id AND estado = 'activa'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_membresia.id IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'tiene_membresia', false,
      'membresia', NULL
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'tiene_membresia', true,
    'membresia', json_build_object(
      'id', v_membresia.id,
      'fecha_inicio', v_membresia.fecha_inicio,
      'fecha_fin', v_membresia.fecha_fin,
      'estado', v_membresia.estado,
      'dias_restantes', v_membresia.fecha_fin - CURRENT_DATE
    )
  );
END;
$$;

-- 9. Función para actualizar membresías expiradas (ejecutar periódicamente con pg_cron o manualmente)
CREATE OR REPLACE FUNCTION public.actualizar_membresias_expiradas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Marcar membresías vencidas como expiradas
  WITH expiradas AS (
    UPDATE public.membresias
    SET estado = 'expirada',
        updated_at = NOW()
    WHERE estado = 'activa' AND fecha_fin < CURRENT_DATE
    RETURNING user_id
  )
  SELECT COUNT(*) INTO v_count FROM expiradas;

  -- Actualizar perfiles de usuarios con membresías expiradas
  UPDATE public.profiles
  SET es_socio = false,
      membresia_activa_id = NULL
  WHERE membresia_activa_id IN (
    SELECT id FROM public.membresias WHERE estado = 'expirada'
  );

  RETURN v_count;
END;
$$;

-- 10. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_membresia_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_membresia_updated_at ON public.membresias;
CREATE TRIGGER trigger_membresia_updated_at
  BEFORE UPDATE ON public.membresias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_membresia_updated_at();

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
-- Notas:
-- 1. Ejecutar actualizar_membresias_expiradas() periódicamente
--    para marcar membresías vencidas automáticamente.
-- 2. Puedes configurar pg_cron en Supabase para ejecutarlo diariamente:
--    SELECT cron.schedule('actualizar-membresias', '0 0 * * *', 'SELECT actualizar_membresias_expiradas()');
-- =====================================================
