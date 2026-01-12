-- ============================================
-- CORREGIR POLÍTICAS RLS DE RESERVAS
-- ============================================

-- El problema: Los admins no pueden actualizar reservas
-- El error de CORS es engañoso - el verdadero problema es RLS

-- ============================================
-- PASO 1: Ver políticas actuales de reservas
-- ============================================

SELECT
  tablename,
  policyname,
  cmd as comando,
  '📋 Política actual' as estado
FROM pg_policies
WHERE tablename = 'reservas'
ORDER BY cmd, policyname;

-- ============================================
-- PASO 2: Eliminar políticas problemáticas de UPDATE
-- ============================================

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias reservas" ON public.reservas;
DROP POLICY IF EXISTS "Los admins pueden actualizar cualquier reserva" ON public.reservas;

-- ============================================
-- PASO 3: Crear políticas de UPDATE correctas
-- ============================================

-- Política: Los usuarios pueden actualizar sus propias reservas
CREATE POLICY "Usuarios actualizan propias reservas"
  ON public.reservas FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Los admins pueden actualizar cualquier reserva
-- Usa la función is_admin que ya creamos
CREATE POLICY "Admins actualizan todas las reservas"
  ON public.reservas FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- PASO 4: Verificar que las políticas están bien
-- ============================================

SELECT
  tablename,
  policyname,
  cmd as comando,
  '✅ Política configurada' as estado
FROM pg_policies
WHERE tablename = 'reservas'
ORDER BY cmd, policyname;

-- Debe haber al menos 7 políticas para reservas:
-- 2 INSERT (usuarios anónimos, usuarios autenticados)
-- 1 SELECT (todos pueden ver)
-- 2 UPDATE (usuarios sus propias, admins todas)
-- 2 DELETE (usuarios sus propias, admins todas)

-- ============================================
-- PASO 5: Probar la actualización
-- ============================================

-- Ver una reserva pendiente para probar
SELECT
  id,
  nombre,
  fecha,
  hora,
  estado,
  user_id,
  '📋 Reserva de prueba' as info
FROM public.reservas
WHERE estado = 'pendiente'
ORDER BY created_at DESC
LIMIT 5;

-- Puedes probar manualmente actualizando una:
-- UPDATE public.reservas
-- SET estado = 'confirmada'
-- WHERE id = 'id-de-la-reserva-aqui';

-- ============================================
-- PASO 6: Verificar RLS activo
-- ============================================

SELECT
  tablename,
  rowsecurity as rls_habilitado,
  CASE
    WHEN rowsecurity THEN '✅ RLS activo'
    ELSE '❌ RLS desactivado'
  END as estado
FROM pg_tables
WHERE tablename = 'reservas';

-- ============================================
-- RESUMEN
-- ============================================

SELECT '======================================' as mensaje
UNION ALL SELECT 'POLÍTICAS DE RESERVAS CORREGIDAS'
UNION ALL SELECT '======================================'
UNION ALL
SELECT CONCAT(
  '✅ Políticas totales: ',
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'reservas')::text
)
UNION ALL
SELECT CONCAT(
  '✅ Políticas UPDATE: ',
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'reservas' AND cmd = 'UPDATE')::text,
  '/2 (usuarios + admins)'
)
UNION ALL
SELECT CONCAT(
  '✅ RLS: ',
  CASE WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'reservas')
    THEN 'Activo' ELSE 'Inactivo' END
)
UNION ALL SELECT '======================================';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
¿QUÉ ERA EL PROBLEMA?

El error de CORS era engañoso. El verdadero problema:
- Las políticas de UPDATE no estaban configuradas correctamente
- Los admins no podían actualizar el campo "estado" de las reservas
- Supabase bloqueaba la operación con RLS
- El navegador mostraba un error de CORS confuso

¿QUÉ SE CORRIGIÓ?

1. Se eliminaron las políticas de UPDATE antiguas
2. Se crearon nuevas políticas que usan is_admin()
3. Ahora los admins SÍ pueden actualizar reservas

DESPUÉS DE EJECUTAR ESTE SCRIPT:

1. Refresca tu aplicación (F5)
2. Ve a /admin
3. Intenta confirmar una reserva pendiente
4. ¡Debería funcionar sin error de CORS!

SI AÚN DA ERROR:

1. Verifica que la función is_admin() existe:
   SELECT * FROM pg_proc WHERE proname = 'is_admin';

2. Si no existe, ejecuta primero:
   corregir-recursion-profiles.sql

3. Luego ejecuta este script de nuevo
*/
