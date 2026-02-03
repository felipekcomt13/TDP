-- ============================================
-- FIX DEFINITIVO - POLÍTICAS UPDATE RESERVAS
-- ============================================

-- El problema: Las políticas UPDATE pueden tener USING pero faltar WITH CHECK
-- Supabase requiere AMBAS condiciones para permitir UPDATE

-- ============================================
-- PASO 1: Eliminar políticas UPDATE actuales
-- ============================================

DROP POLICY IF EXISTS "Usuarios actualizan propias reservas" ON public.reservas;
DROP POLICY IF EXISTS "Admins actualizan todas las reservas" ON public.reservas;

-- Verificar que se eliminaron
SELECT
  '✅ Políticas UPDATE eliminadas' as paso;

-- ============================================
-- PASO 2: Verificar que la función is_admin existe
-- ============================================

SELECT
  proname as funcion,
  prosecdef as tiene_security_definer,
  CASE
    WHEN prosecdef THEN '✅ SECURITY DEFINER configurado'
    ELSE '❌ Falta SECURITY DEFINER'
  END as estado
FROM pg_proc
WHERE proname = 'is_admin';

-- Si no existe, crearla ahora
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    CREATE FUNCTION public.is_admin(user_id uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'admin'
      );
    END;
    $func$;
    RAISE NOTICE '✅ Función is_admin creada';
  ELSE
    RAISE NOTICE '✅ Función is_admin ya existe';
  END IF;
END $$;

-- ============================================
-- PASO 3: Crear políticas UPDATE COMPLETAS
-- ============================================

-- Política 1: Usuarios pueden actualizar sus propias reservas
-- IMPORTANTE: USING y WITH CHECK deben estar presentes
CREATE POLICY "Usuarios actualizan propias reservas"
  ON public.reservas
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

SELECT '✅ Política UPDATE para usuarios creada' as resultado;

-- Política 2: Admins pueden actualizar CUALQUIER reserva
-- IMPORTANTE: USING y WITH CHECK con la función is_admin
CREATE POLICY "Admins actualizan todas las reservas"
  ON public.reservas
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

SELECT '✅ Política UPDATE para admins creada' as resultado;

-- ============================================
-- PASO 4: Verificar que se crearon correctamente
-- ============================================

SELECT
  '=== POLÍTICAS UPDATE VERIFICACIÓN ===' as seccion;

SELECT
  policyname as politica,
  qual as condicion_using,
  with_check as condicion_with_check,
  CASE
    WHEN with_check IS NOT NULL THEN '✅ WITH CHECK presente'
    ELSE '❌ FALTA WITH CHECK (problema)'
  END as estado
FROM pg_policies
WHERE tablename = 'reservas' AND cmd = 'UPDATE'
ORDER BY policyname;

-- ============================================
-- PASO 5: Contar todas las políticas
-- ============================================

SELECT
  '=== RESUMEN POLÍTICAS RESERVAS ===' as seccion;

SELECT
  cmd as tipo,
  COUNT(*) as cantidad,
  CASE
    WHEN cmd = 'SELECT' THEN '👁️ Ver'
    WHEN cmd = 'INSERT' THEN '➕ Crear'
    WHEN cmd = 'UPDATE' THEN '✏️ Actualizar'
    WHEN cmd = 'DELETE' THEN '🗑️ Eliminar'
  END as accion
FROM pg_policies
WHERE tablename = 'reservas'
GROUP BY cmd
ORDER BY cmd;

-- ============================================
-- PASO 6: Verificar RLS activo
-- ============================================

SELECT
  '=== ESTADO RLS ===' as seccion;

SELECT
  tablename as tabla,
  rowsecurity as rls_activo,
  CASE
    WHEN rowsecurity THEN '✅ RLS protegiendo la tabla'
    ELSE '❌ RLS DESACTIVADO - PELIGRO'
  END as estado
FROM pg_tables
WHERE tablename = 'reservas';

-- ============================================
-- PASO 7: PRUEBA MANUAL
-- ============================================

SELECT
  '=== PRUEBA MANUAL ===' as seccion;

-- Ver una reserva para probar
SELECT
  id,
  nombre,
  estado as estado_actual,
  user_id,
  '📋 Reserva para probar UPDATE' as info
FROM public.reservas
WHERE estado = 'pendiente'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- INSTRUCCIONES FINALES
-- ============================================

SELECT '
╔════════════════════════════════════════════════════════════════╗
║                    POLÍTICAS UPDATE CREADAS                     ║
╚════════════════════════════════════════════════════════════════╝

✅ Las políticas UPDATE ahora tienen USING y WITH CHECK
✅ La función is_admin() usa SECURITY DEFINER
✅ Los admins pueden actualizar cualquier reserva
✅ Los usuarios pueden actualizar solo sus reservas

📋 PRÓXIMOS PASOS:

1. Verifica que arriba diga "✅ WITH CHECK presente" para ambas políticas

2. Si dice "❌ FALTA WITH CHECK", hay un problema de permisos
   Solución: Contacta a soporte de Supabase o verifica permisos del usuario

3. Después de verificar, ve a tu aplicación:
   - Refresca la página (F5)
   - Ve a /admin
   - Intenta confirmar una reserva
   - Debería funcionar ahora

4. Si TODAVÍA da error de CORS:
   - Abre la pestaña Network en DevTools (F12)
   - Busca la petición PATCH a "reservas"
   - Click en ella
   - Ve a "Response" o "Preview"
   - Copia el error REAL que devuelve Supabase
   - Ese error dirá el problema exacto

═══════════════════════════════════════════════════════════════

PARA PROBAR UPDATE DIRECTAMENTE EN SQL:
(Reemplaza el ID con el de arriba)

UPDATE public.reservas
SET estado = ''confirmada''
WHERE id = ''PEGA-EL-ID-AQUI'';

Si esto funciona: Problema en la app
Si esto falla: Problema con políticas o permisos
═══════════════════════════════════════════════════════════════
' as instrucciones;
