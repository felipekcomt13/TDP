-- ============================================
-- SOLUCIÓN DEFINITIVA: FUNCIONES RPC
-- ============================================

-- Problema: PostgREST está bloqueando UPDATE (PATCH) con error de CORS
-- Solución: Usar funciones RPC que bypasean PostgREST completamente

-- ============================================
-- PASO 1: Crear función para CONFIRMAR reserva
-- ============================================

CREATE OR REPLACE FUNCTION public.confirmar_reserva(reserva_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios del creador, bypasea RLS
AS $$
DECLARE
  reserva_actual record;
  usuario_actual uuid;
  es_admin_usuario boolean;
  resultado json;
BEGIN
  -- Obtener ID del usuario actual
  usuario_actual := auth.uid();

  -- Log para debugging
  RAISE NOTICE 'confirmar_reserva llamada por usuario: %', usuario_actual;

  -- Verificar que hay un usuario autenticado
  IF usuario_actual IS NULL THEN
    RAISE EXCEPTION 'No hay usuario autenticado. Debes estar logueado para confirmar reservas';
  END IF;

  -- Obtener la reserva
  SELECT * INTO reserva_actual
  FROM public.reservas
  WHERE id = reserva_id;

  -- Verificar que la reserva existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada con ID: %', reserva_id;
  END IF;

  -- Verificar si el usuario es admin
  SELECT public.is_admin(usuario_actual) INTO es_admin_usuario;

  RAISE NOTICE 'Usuario % es admin: %', usuario_actual, es_admin_usuario;

  -- Verificar permisos: solo admins pueden confirmar reservas
  IF NOT es_admin_usuario THEN
    RAISE EXCEPTION 'Solo los administradores pueden confirmar reservas';
  END IF;

  -- Actualizar la reserva
  UPDATE public.reservas
  SET estado = 'confirmada',
      updated_at = now()
  WHERE id = reserva_id;

  -- Obtener la reserva actualizada
  SELECT json_build_object(
    'id', id,
    'nombre', nombre,
    'estado', estado,
    'fecha', fecha,
    'hora', hora,
    'mensaje', 'Reserva confirmada exitosamente'
  ) INTO resultado
  FROM public.reservas
  WHERE id = reserva_id;

  RAISE NOTICE 'Reserva % confirmada exitosamente', reserva_id;

  RETURN resultado;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al confirmar reserva: %. Verifica los logs para más detalles', SQLERRM;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION public.confirmar_reserva(uuid) IS
'Confirma una reserva. Solo admins pueden confirmar.';

-- ============================================
-- PASO 2: Crear función para RECHAZAR reserva
-- ============================================

CREATE OR REPLACE FUNCTION public.rechazar_reserva(reserva_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios del creador, bypasea RLS
AS $$
DECLARE
  reserva_actual record;
  usuario_actual uuid;
  es_admin_usuario boolean;
  resultado json;
BEGIN
  -- Obtener ID del usuario actual
  usuario_actual := auth.uid();

  -- Log para debugging
  RAISE NOTICE 'rechazar_reserva llamada por usuario: %', usuario_actual;

  -- Verificar que hay un usuario autenticado
  IF usuario_actual IS NULL THEN
    RAISE EXCEPTION 'No hay usuario autenticado. Debes estar logueado para rechazar reservas';
  END IF;

  -- Obtener la reserva
  SELECT * INTO reserva_actual
  FROM public.reservas
  WHERE id = reserva_id;

  -- Verificar que la reserva existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada con ID: %', reserva_id;
  END IF;

  -- Verificar si el usuario es admin
  SELECT public.is_admin(usuario_actual) INTO es_admin_usuario;

  RAISE NOTICE 'Usuario % es admin: %', usuario_actual, es_admin_usuario;

  -- Solo los admins pueden rechazar reservas
  IF NOT es_admin_usuario THEN
    RAISE EXCEPTION 'No tienes permiso para rechazar esta reserva. Solo los admins pueden rechazar reservas';
  END IF;

  -- Actualizar la reserva
  UPDATE public.reservas
  SET estado = 'rechazada',
      updated_at = now()
  WHERE id = reserva_id;

  -- Obtener la reserva actualizada
  SELECT json_build_object(
    'id', id,
    'nombre', nombre,
    'estado', estado,
    'fecha', fecha,
    'hora', hora,
    'mensaje', 'Reserva rechazada exitosamente'
  ) INTO resultado
  FROM public.reservas
  WHERE id = reserva_id;

  RAISE NOTICE 'Reserva % rechazada exitosamente', reserva_id;

  RETURN resultado;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al rechazar reserva: %. Verifica los logs para más detalles', SQLERRM;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION public.rechazar_reserva(uuid) IS
'Rechaza una reserva. Solo admins pueden rechazar.';

-- ============================================
-- PASO 2.5: Crear función para CANCELAR reserva (usuarios)
-- ============================================

CREATE OR REPLACE FUNCTION public.cancelar_reserva(reserva_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios del creador, bypasea RLS
AS $$
DECLARE
  reserva_actual record;
  usuario_actual uuid;
  es_admin_usuario boolean;
  resultado json;
BEGIN
  -- Obtener ID del usuario actual
  usuario_actual := auth.uid();

  -- Log para debugging
  RAISE NOTICE 'cancelar_reserva llamada por usuario: %', usuario_actual;

  -- Verificar que hay un usuario autenticado
  IF usuario_actual IS NULL THEN
    RAISE EXCEPTION 'No hay usuario autenticado. Debes estar logueado para cancelar reservas';
  END IF;

  -- Obtener la reserva
  SELECT * INTO reserva_actual
  FROM public.reservas
  WHERE id = reserva_id;

  -- Verificar que la reserva existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada con ID: %', reserva_id;
  END IF;

  -- Verificar si el usuario es admin
  SELECT public.is_admin(usuario_actual) INTO es_admin_usuario;

  RAISE NOTICE 'Usuario % es admin: %', usuario_actual, es_admin_usuario;

  -- Verificar permisos:
  -- 1. Si es admin, puede cancelar cualquier reserva
  -- 2. Si no es admin, solo puede cancelar sus propias reservas PENDIENTES
  IF NOT es_admin_usuario THEN
    -- Verificar que es el dueño de la reserva
    IF reserva_actual.user_id != usuario_actual THEN
      RAISE EXCEPTION 'No tienes permiso para cancelar esta reserva';
    END IF;

    -- Verificar que la reserva está pendiente (no confirmada)
    IF reserva_actual.estado != 'pendiente' THEN
      RAISE EXCEPTION 'Solo puedes cancelar reservas pendientes. Las reservas confirmadas solo pueden ser canceladas por un administrador';
    END IF;
  END IF;

  -- Eliminar la reserva
  DELETE FROM public.reservas
  WHERE id = reserva_id;

  -- Retornar confirmación
  resultado := json_build_object(
    'id', reserva_id,
    'mensaje', 'Reserva cancelada exitosamente'
  );

  RAISE NOTICE 'Reserva % cancelada exitosamente', reserva_id;

  RETURN resultado;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al cancelar reserva: %. Verifica los logs para más detalles', SQLERRM;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION public.cancelar_reserva(uuid) IS
'Cancela una reserva. Usuarios solo pueden cancelar sus propias reservas pendientes. Admins pueden cancelar cualquier reserva.';

-- ============================================
-- PASO 3: Agregar columna updated_at si no existe
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservas' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.reservas
    ADD COLUMN updated_at timestamptz DEFAULT now();

    RAISE NOTICE '✅ Columna updated_at agregada a reservas';
  ELSE
    RAISE NOTICE '✅ Columna updated_at ya existe';
  END IF;
END $$;

-- ============================================
-- PASO 4: Otorgar permisos de ejecución
-- ============================================

-- Permitir que usuarios autenticados ejecuten las funciones
GRANT EXECUTE ON FUNCTION public.confirmar_reserva(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rechazar_reserva(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_reserva(uuid) TO authenticated;

-- Permitir que usuarios anónimos ejecuten las funciones (si es necesario)
GRANT EXECUTE ON FUNCTION public.confirmar_reserva(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.rechazar_reserva(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.cancelar_reserva(uuid) TO anon;

-- ============================================
-- PASO 5: Verificar que las funciones se crearon
-- ============================================

SELECT
  '=== FUNCIONES RPC CREADAS ===' as seccion;

SELECT
  proname as nombre_funcion,
  prosecdef as tiene_security_definer,
  CASE
    WHEN prosecdef THEN '✅ SECURITY DEFINER activo'
    ELSE '❌ Sin SECURITY DEFINER'
  END as estado,
  pg_get_function_arguments(oid) as argumentos
FROM pg_proc
WHERE proname IN ('confirmar_reserva', 'rechazar_reserva', 'cancelar_reserva')
ORDER BY proname;

-- ============================================
-- PASO 6: Verificar permisos
-- ============================================

SELECT
  '=== PERMISOS DE EJECUCIÓN ===' as seccion;

SELECT
  routine_name as funcion,
  grantee as puede_ejecutar,
  privilege_type as permiso
FROM information_schema.routine_privileges
WHERE routine_name IN ('confirmar_reserva', 'rechazar_reserva', 'cancelar_reserva')
ORDER BY routine_name, grantee;

-- ============================================
-- PASO 7: Ver reservas para probar
-- ============================================

SELECT
  '=== RESERVAS PARA PROBAR ===' as seccion;

SELECT
  id,
  nombre,
  estado,
  fecha,
  hora,
  user_id,
  '📋 Copia este ID para probar' as accion
FROM public.reservas
WHERE estado = 'pendiente'
ORDER BY created_at DESC
LIMIT 3;

-- ============================================
-- RESUMEN Y PRÓXIMOS PASOS
-- ============================================

SELECT '
╔══════════════════════════════════════════════════════════════════╗
║           ✅ FUNCIONES RPC CREADAS EXITOSAMENTE                  ║
╚══════════════════════════════════════════════════════════════════╝

📋 FUNCIONES CREADAS:
  • confirmar_reserva(reserva_id uuid) → Confirma una reserva (solo admins)
  • rechazar_reserva(reserva_id uuid) → Rechaza una reserva (solo admins)
  • cancelar_reserva(reserva_id uuid) → Cancela una reserva (usuarios: solo pendientes propias, admins: cualquiera)

🔒 SEGURIDAD:
  • Usan SECURITY DEFINER para bypassear RLS
  • Verifican permisos dentro de la función
  • Solo admins pueden confirmar reservas
  • Solo admins pueden rechazar reservas
  • Usuarios solo pueden cancelar sus propias reservas PENDIENTES
  • Admins pueden cancelar cualquier reserva

📝 PRÓXIMOS PASOS:

1. ✅ Verifica arriba que las funciones tienen "✅ SECURITY DEFINER activo"

2. ✅ Verifica que "authenticated" y "anon" tienen permiso EXECUTE

3. 🧪 PRUEBA MANUAL (opcional):
   Puedes probar las funciones directamente en SQL:

   SELECT * FROM public.confirmar_reserva(''PEGA-ID-AQUI'');

   Si funciona, verás JSON con los datos de la reserva actualizada.

4. 🚀 ACTUALIZAR LA APLICACIÓN:
   Ahora modifica src/context/ReservasContext.jsx para usar
   estas funciones con .rpc() en lugar de .update()

5. 🎯 PROBAR EN LA APP:
   - Refresca el navegador (F5)
   - Ve a /admin
   - Intenta confirmar una reserva
   - ¡Debería funcionar sin error de CORS!

═══════════════════════════════════════════════════════════════════

💡 VENTAJAS DE ESTE ENFOQUE:
  ✅ Evita completamente el error de CORS
  ✅ No depende de políticas RLS complejas
  ✅ Control total sobre la lógica de negocio
  ✅ Mensajes de error más claros
  ✅ Más fácil de debugear con RAISE NOTICE

═══════════════════════════════════════════════════════════════════
' as instrucciones;
