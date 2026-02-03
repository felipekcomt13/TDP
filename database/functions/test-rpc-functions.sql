-- ============================================
-- SCRIPT DE PRUEBA PARA FUNCIONES RPC
-- ============================================

-- Este script te ayuda a probar las funciones RPC directamente
-- antes de usarlas en la aplicación

-- ============================================
-- PASO 1: Verificar que las funciones existen
-- ============================================

SELECT
  '=== VERIFICACIÓN DE FUNCIONES ===' as seccion;

SELECT
  proname as funcion,
  prosecdef as security_definer,
  pg_get_function_arguments(oid) as argumentos,
  CASE
    WHEN prosecdef THEN '✅ Configurada correctamente'
    ELSE '❌ Falta SECURITY DEFINER'
  END as estado
FROM pg_proc
WHERE proname IN ('confirmar_reserva', 'rechazar_reserva')
ORDER BY proname;

-- ============================================
-- PASO 2: Verificar permisos de ejecución
-- ============================================

SELECT
  '=== PERMISOS ===' as seccion;

SELECT
  routine_name as funcion,
  grantee as rol,
  privilege_type as permiso,
  CASE
    WHEN grantee IN ('authenticated', 'anon') AND privilege_type = 'EXECUTE'
      THEN '✅ Puede ejecutar'
    ELSE '⚠️ Verificar'
  END as estado
FROM information_schema.routine_privileges
WHERE routine_name IN ('confirmar_reserva', 'rechazar_reserva')
ORDER BY routine_name, grantee;

-- ============================================
-- PASO 3: Ver tu usuario actual
-- ============================================

SELECT
  '=== TU USUARIO ===' as seccion;

-- Nota: auth.uid() solo funciona si estás autenticado en la sesión
-- En el SQL Editor de Supabase puede devolver NULL
SELECT
  auth.uid() as tu_user_id,
  auth.email() as tu_email,
  CASE
    WHEN auth.uid() IS NULL THEN '⚠️ No autenticado en esta sesión (normal en SQL Editor)'
    ELSE '✅ Autenticado'
  END as estado_sesion;

-- Ver tu usuario desde profiles
SELECT
  id,
  email,
  role,
  public.is_admin(id) as es_admin,
  CASE
    WHEN role = 'admin' THEN '✅ Admin'
    ELSE '👤 Usuario normal'
  END as tipo_usuario
FROM public.profiles
WHERE email = 'felipekcomt13@gmail.com';

-- ============================================
-- PASO 4: Ver reservas disponibles para probar
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
  created_at,
  CASE
    WHEN estado = 'pendiente' THEN '✅ Buena para probar'
    WHEN estado = 'confirmada' THEN '⚠️ Ya confirmada'
    WHEN estado = 'rechazada' THEN '⚠️ Ya rechazada'
  END as sugerencia
FROM public.reservas
ORDER BY
  CASE estado
    WHEN 'pendiente' THEN 1
    WHEN 'confirmada' THEN 2
    WHEN 'rechazada' THEN 3
  END,
  created_at DESC
LIMIT 5;

-- ============================================
-- PASO 5: PRUEBA MANUAL DE CONFIRMAR RESERVA
-- ============================================

SELECT
  '=== INSTRUCCIONES DE PRUEBA ===' as seccion;

SELECT '
╔══════════════════════════════════════════════════════════════════╗
║                    CÓMO PROBAR LAS FUNCIONES                     ║
╚══════════════════════════════════════════════════════════════════╝

📋 OPCIÓN 1: Probar en SQL Editor (puede no funcionar si no hay sesión)

1. Copia un ID de reserva pendiente de la tabla de arriba

2. Ejecuta una de estas funciones:

   -- Para CONFIRMAR:
   SELECT * FROM public.confirmar_reserva(''PEGA-ID-AQUI'');

   -- Para RECHAZAR:
   SELECT * FROM public.rechazar_reserva(''PEGA-ID-AQUI'');

3. Resultados esperados:
   ✅ Si funciona: Verás JSON con los datos de la reserva actualizada
   ❌ Si falla: Verás un error explicando por qué

═══════════════════════════════════════════════════════════════════

📱 OPCIÓN 2: Probar desde la aplicación (RECOMENDADO)

1. Ejecuta el script fix-with-rpc-functions.sql en Supabase

2. Asegúrate de que el código de ReservasContext.jsx esté actualizado
   (debe usar .rpc() en lugar de .update())

3. Refresca tu navegador (F5)

4. Ve a http://localhost:5175/admin

5. Intenta confirmar o rechazar una reserva

6. Revisa la consola del navegador (F12 → Console):
   • Deberías ver: "🔄 Intentando confirmar reserva con RPC"
   • Si funciona: "✅ Reserva confirmada exitosamente (RPC)"
   • Si falla: Un mensaje de error detallado

═══════════════════════════════════════════════════════════════════

🔍 ERRORES COMUNES Y SOLUCIONES:

❌ "function public.confirmar_reserva does not exist"
   → Ejecuta fix-with-rpc-functions.sql primero

❌ "No hay usuario autenticado"
   → Asegúrate de estar logueado en la aplicación

❌ "No tienes permiso para confirmar esta reserva"
   → Tu usuario no es admin o no es dueño de la reserva
   → Verifica con: SELECT * FROM profiles WHERE email = ''tu-email'';

❌ "Reserva no encontrada"
   → El ID es incorrecto o la reserva fue eliminada

═══════════════════════════════════════════════════════════════════

💡 VENTAJAS DE RPC vs UPDATE:

✅ Evita completamente el error de CORS que tenías con PATCH
✅ No depende de políticas RLS complejas
✅ Ejecuta con SECURITY DEFINER (privilegios del creador)
✅ Puedes agregar lógica de negocio compleja dentro de la función
✅ Mensajes de error más claros y específicos
✅ Más fácil de debugear con RAISE NOTICE en PostgreSQL

═══════════════════════════════════════════════════════════════════
' as instrucciones;

-- ============================================
-- PASO 6: Ejemplo de uso completo
-- ============================================

-- DESCOMENTA Y PRUEBA ESTO (reemplaza con un ID real):

/*
-- Ver la reserva antes
SELECT id, nombre, estado FROM public.reservas WHERE id = 'ID-AQUI';

-- Confirmar la reserva
SELECT * FROM public.confirmar_reserva('ID-AQUI');

-- Ver la reserva después
SELECT id, nombre, estado FROM public.reservas WHERE id = 'ID-AQUI';

-- Si quieres volver a pendiente para probar de nuevo:
UPDATE public.reservas SET estado = 'pendiente' WHERE id = 'ID-AQUI';
*/
