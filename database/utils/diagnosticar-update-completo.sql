-- ============================================
-- DIAGNÓSTICO COMPLETO DEL PROBLEMA DE UPDATE
-- ============================================

-- ============================================
-- PASO 1: Verificar tu identidad y rol
-- ============================================

SELECT
  '=== TU USUARIO ===' as seccion,
  auth.uid() as tu_user_id,
  auth.email() as tu_email;

SELECT
  id,
  email,
  role,
  public.is_admin(id) as funcion_is_admin_resultado,
  CASE
    WHEN role = 'admin' AND public.is_admin(id) THEN '✅ TODO OK - Eres admin'
    WHEN role = 'admin' AND NOT public.is_admin(id) THEN '❌ PROBLEMA - Rol admin pero función falla'
    WHEN role != 'admin' THEN '⚠️ No eres admin'
    ELSE '❓ Estado desconocido'
  END as diagnostico
FROM public.profiles
WHERE id = auth.uid();

-- ============================================
-- PASO 2: Ver TODAS las políticas de reservas
-- ============================================

SELECT
  '=== POLÍTICAS DE RESERVAS ===' as seccion;

SELECT
  policyname as politica,
  cmd as comando,
  CASE cmd
    WHEN 'SELECT' THEN '👁️'
    WHEN 'INSERT' THEN '➕'
    WHEN 'UPDATE' THEN '✏️'
    WHEN 'DELETE' THEN '🗑️'
  END as emoji,
  qual as condicion_using,
  with_check as condicion_with_check
FROM pg_policies
WHERE tablename = 'reservas'
ORDER BY cmd, policyname;

-- ============================================
-- PASO 3: Contar políticas por tipo
-- ============================================

SELECT
  '=== RESUMEN DE POLÍTICAS ===' as seccion;

SELECT
  cmd as tipo_operacion,
  COUNT(*) as cantidad,
  CASE
    WHEN cmd = 'SELECT' AND COUNT(*) >= 1 THEN '✅ OK'
    WHEN cmd = 'INSERT' AND COUNT(*) >= 1 THEN '✅ OK'
    WHEN cmd = 'UPDATE' AND COUNT(*) >= 2 THEN '✅ OK (usuarios + admins)'
    WHEN cmd = 'UPDATE' AND COUNT(*) = 1 THEN '⚠️ Solo 1 política (falta usuarios o admins)'
    WHEN cmd = 'UPDATE' AND COUNT(*) = 0 THEN '❌ NO HAY POLÍTICAS UPDATE'
    WHEN cmd = 'DELETE' AND COUNT(*) >= 2 THEN '✅ OK'
    ELSE '⚠️ Revisar'
  END as estado
FROM pg_policies
WHERE tablename = 'reservas'
GROUP BY cmd
ORDER BY cmd;

-- ============================================
-- PASO 4: Ver políticas UPDATE específicas
-- ============================================

SELECT
  '=== DETALLE POLÍTICAS UPDATE ===' as seccion;

SELECT
  policyname as politica,
  qual as usando,
  with_check as verificacion,
  CASE
    WHEN qual LIKE '%is_admin%' THEN '✅ Usa is_admin() - Admin policy'
    WHEN qual LIKE '%user_id%' THEN '✅ Verifica user_id - User policy'
    ELSE '⚠️ Política no reconocida'
  END as tipo
FROM pg_policies
WHERE tablename = 'reservas' AND cmd = 'UPDATE'
ORDER BY policyname;

-- ============================================
-- PASO 5: Ver una reserva pendiente
-- ============================================

SELECT
  '=== RESERVAS PENDIENTES PARA PROBAR ===' as seccion;

SELECT
  id,
  nombre,
  fecha,
  hora,
  estado,
  user_id,
  created_at
FROM public.reservas
WHERE estado = 'pendiente'
ORDER BY created_at DESC
LIMIT 3;

-- ============================================
-- PASO 6: Verificar que RLS está activo
-- ============================================

SELECT
  '=== ESTADO RLS ===' as seccion;

SELECT
  schemaname as schema,
  tablename as tabla,
  rowsecurity as rls_activo,
  CASE
    WHEN rowsecurity THEN '✅ RLS activo'
    ELSE '❌ RLS desactivado (PELIGRO)'
  END as estado
FROM pg_tables
WHERE tablename IN ('profiles', 'reservas')
ORDER BY tablename;

-- ============================================
-- PASO 7: Probar la función is_admin directamente
-- ============================================

SELECT
  '=== PRUEBA FUNCIÓN is_admin ===' as seccion;

SELECT
  public.is_admin(auth.uid()) as resultado,
  CASE
    WHEN public.is_admin(auth.uid()) THEN '✅ La función dice que eres admin'
    ELSE '❌ La función dice que NO eres admin'
  END as interpretacion;

-- ============================================
-- PASO 8: Ver definición de la función is_admin
-- ============================================

SELECT
  '=== DEFINICIÓN FUNCIÓN is_admin ===' as seccion;

SELECT
  proname as nombre_funcion,
  prosecdef as tiene_security_definer,
  CASE
    WHEN prosecdef THEN '✅ Tiene SECURITY DEFINER (correcto)'
    ELSE '❌ NO tiene SECURITY DEFINER (problema)'
  END as estado_security
FROM pg_proc
WHERE proname = 'is_admin';

-- ============================================
-- PASO 9: INSTRUCCIONES PARA PRUEBA MANUAL
-- ============================================

SELECT
  '=== INSTRUCCIONES ===' as seccion;

SELECT '
PARA PROBAR UPDATE MANUALMENTE:

1. Copia un ID de la tabla "RESERVAS PENDIENTES" de arriba
2. Ejecuta este comando (reemplaza el ID):

   UPDATE public.reservas
   SET estado = ''confirmada''
   WHERE id = ''PEGA-EL-ID-AQUI'';

3. Resultados posibles:

   ✅ UPDATE 1 = Funcionó correctamente
      → El problema NO es de políticas
      → Revisar código JavaScript o Supabase client

   ❌ Error de permisos = Políticas bloqueando
      → Ver el mensaje de error específico
      → Puede ser problema con is_admin() o políticas

   ❌ Error de recursión = Políticas mal configuradas
      → Ejecutar corregir-recursion-profiles.sql
      → Luego ejecutar corregir-politicas-reservas.sql

4. Después de probar, verifica el cambio:

   SELECT id, nombre, estado
   FROM public.reservas
   WHERE id = ''EL-MISMO-ID'';

' as instrucciones;

-- ============================================
-- PASO 10: RESUMEN DIAGNÓSTICO
-- ============================================

SELECT
  '=== RESUMEN DIAGNÓSTICO ===' as seccion;

SELECT
  CONCAT(
    '📊 Políticas UPDATE: ',
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'reservas' AND cmd = 'UPDATE')::text,
    ' encontradas'
  ) as linea
UNION ALL
SELECT
  CONCAT(
    '👤 Eres admin: ',
    CASE WHEN public.is_admin(auth.uid()) THEN 'SÍ ✅' ELSE 'NO ❌' END
  )
UNION ALL
SELECT
  CONCAT(
    '🔒 RLS en reservas: ',
    CASE WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'reservas')
      THEN 'Activo ✅' ELSE 'Inactivo ❌' END
  )
UNION ALL
SELECT
  CONCAT(
    '🔧 Función is_admin: ',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin')
      THEN 'Existe ✅' ELSE 'No existe ❌' END
  )
UNION ALL
SELECT
  CONCAT(
    '🛡️ SECURITY DEFINER: ',
    CASE WHEN (SELECT prosecdef FROM pg_proc WHERE proname = 'is_admin')
      THEN 'Configurado ✅' ELSE 'Falta ❌' END
  );

-- ============================================
-- PASO 11: POSIBLES PROBLEMAS Y SOLUCIONES
-- ============================================

SELECT
  '=== POSIBLES PROBLEMAS ===' as seccion;

SELECT '
❌ PROBLEMA 1: No eres admin
   Solución: UPDATE public.profiles SET role = ''admin'' WHERE id = auth.uid();

❌ PROBLEMA 2: No hay políticas UPDATE
   Solución: Ejecutar corregir-politicas-reservas.sql

❌ PROBLEMA 3: Función is_admin no existe
   Solución: Ejecutar corregir-recursion-profiles.sql

❌ PROBLEMA 4: SECURITY DEFINER no configurado
   Solución: Ejecutar corregir-recursion-profiles.sql

❌ PROBLEMA 5: UPDATE funciona en SQL pero no en la app
   Solución:
   - Problema en el código JavaScript
   - Verificar console logs en el navegador
   - Revisar que el Supabase client esté bien configurado
   - Verificar variables de entorno (.env)

❌ PROBLEMA 6: Error de CORS
   Esto NO es un problema de CORS real, es Supabase bloqueando con RLS
   - Ejecutar este script completo para diagnosticar
   - Aplicar las soluciones según los resultados

' as soluciones;
