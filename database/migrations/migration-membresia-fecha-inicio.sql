-- =====================================================
-- MIGRACIÓN: Fecha de inicio personalizada en membresías
-- =====================================================
-- Permite al admin especificar una fecha de inicio
-- diferente a la actual al activar una membresía.
-- Caso de uso: regularizar socios cuya membresía
-- empezó días/semanas atrás.
-- =====================================================

-- Eliminar la versión anterior (5 parámetros) para evitar ambigüedad
DROP FUNCTION IF EXISTS public.activar_membresia(UUID, INTEGER, DECIMAL, TEXT, TEXT);

-- Crear la función con el nuevo parámetro p_fecha_inicio
CREATE OR REPLACE FUNCTION public.activar_membresia(
  p_user_id UUID,
  p_duracion_dias INTEGER,
  p_precio DECIMAL DEFAULT NULL,
  p_metodo_pago TEXT DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_fecha_inicio DATE DEFAULT NULL
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

  -- Establecer fechas: usar fecha proporcionada o CURRENT_DATE
  v_fecha_inicio := COALESCE(p_fecha_inicio, CURRENT_DATE);
  v_fecha_fin := v_fecha_inicio + p_duracion_dias;

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
