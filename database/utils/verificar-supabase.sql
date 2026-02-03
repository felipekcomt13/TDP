-- ============================================
-- SCRIPT DE VERIFICACIÓN DE SUPABASE
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para verificar que todo esté configurado correctamente

-- ============================================
-- 1. VERIFICAR TABLAS
-- ============================================

SELECT
  'TABLAS' as verificacion,
  COUNT(*) as cantidad,
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ OK'
    ELSE '❌ FALTAN TABLAS'
  END as estado
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'reservas');

-- Detalle de tablas
SELECT
  table_name as tabla,
  '✅' as existe
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'reservas')
ORDER BY table_name;

-- ============================================
-- 2. VERIFICAR COLUMNAS DE PROFILES
-- ============================================

SELECT
  'COLUMNAS PROFILES' as verificacion,
  COUNT(*) as cantidad,
  CASE
    WHEN COUNT(*) >= 4 THEN '✅ OK'
    ELSE '❌ FALTAN COLUMNAS'
  END as estado
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('id', 'email', 'nombre', 'role', 'created_at');

-- ============================================
-- 3. VERIFICAR COLUMNAS DE RESERVAS
-- ============================================

SELECT
  'COLUMNAS RESERVAS' as verificacion,
  COUNT(*) as cantidad,
  CASE
    WHEN COUNT(*) >= 12 THEN '✅ OK'
    ELSE '❌ FALTAN COLUMNAS'
  END as estado
FROM information_schema.columns
WHERE table_name = 'reservas';

-- ============================================
-- 4. VERIFICAR ROW LEVEL SECURITY (RLS)
-- ============================================

SELECT
  tablename as tabla,
  CASE
    WHEN rowsecurity THEN '✅ RLS HABILITADO'
    ELSE '❌ RLS DESHABILITADO'
  END as estado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'reservas')
ORDER BY tablename;

-- ============================================
-- 5. VERIFICAR POLÍTICAS RLS
-- ============================================

SELECT
  'POLÍTICAS RLS' as verificacion,
  tablename as tabla,
  COUNT(*) as cantidad_politicas,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ TIENE POLÍTICAS'
    ELSE '❌ SIN POLÍTICAS'
  END as estado
FROM pg_policies
WHERE tablename IN ('profiles', 'reservas')
GROUP BY tablename
ORDER BY tablename;

-- Detalle de políticas por tabla
SELECT
  tablename as tabla,
  policyname as politica,
  cmd as comando,
  '✅' as configurada
FROM pg_policies
WHERE tablename IN ('profiles', 'reservas')
ORDER BY tablename, policyname;

-- ============================================
-- 6. VERIFICAR TRIGGER Y FUNCIÓN
-- ============================================

-- Verificar función
SELECT
  'FUNCIÓN handle_new_user' as verificacion,
  routine_name as nombre,
  CASE
    WHEN routine_name = 'handle_new_user' THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- Verificar trigger
SELECT
  'TRIGGER on_auth_user_created' as verificacion,
  tgname as nombre,
  CASE
    WHEN tgname = 'on_auth_user_created' THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as estado
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- ============================================
-- 7. VERIFICAR ÍNDICES
-- ============================================

SELECT
  'ÍNDICES RESERVAS' as verificacion,
  COUNT(*) as cantidad,
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ OK'
    ELSE '⚠️ FALTAN ÍNDICES (no crítico)'
  END as estado
FROM pg_indexes
WHERE tablename = 'reservas'
  AND indexname LIKE 'idx_%';

-- ============================================
-- 8. CONTAR DATOS
-- ============================================

-- Contar usuarios
SELECT
  'USUARIOS' as tipo,
  COUNT(*) as cantidad,
  '📊 Info' as estado
FROM auth.users;

-- Contar perfiles
SELECT
  'PERFILES' as tipo,
  COUNT(*) as cantidad,
  CASE
    WHEN COUNT(*) = (SELECT COUNT(*) FROM auth.users) THEN '✅ Coinciden'
    ELSE '⚠️ No coinciden con auth.users'
  END as estado
FROM profiles;

-- Contar reservas
SELECT
  'RESERVAS' as tipo,
  COUNT(*) as cantidad,
  '📊 Info' as estado
FROM reservas;

-- ============================================
-- 9. VERIFICAR USUARIOS ADMIN
-- ============================================

SELECT
  'ADMINISTRADORES' as verificacion,
  COUNT(*) as cantidad,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Hay al menos 1 admin'
    ELSE '⚠️ No hay administradores'
  END as estado
FROM profiles
WHERE role = 'admin';

-- Mostrar administradores
SELECT
  email,
  nombre,
  role,
  created_at
FROM profiles
WHERE role = 'admin'
ORDER BY created_at;

-- ============================================
-- 10. VERIFICAR EMAIL CONFIRMATION
-- ============================================

SELECT
  'EMAIL CONFIRMATION' as configuracion,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ Deshabilitado (recomendado para dev)'
    WHEN COUNT(*) = COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END)
      THEN '✅ Habilitado - Todos confirmados'
    ELSE '⚠️ Habilitado - Hay emails sin confirmar'
  END as estado,
  COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as emails_sin_confirmar
FROM auth.users;

-- ============================================
-- RESUMEN FINAL
-- ============================================

SELECT
  '==================================' as mensaje
UNION ALL
SELECT 'RESUMEN DE VERIFICACIÓN'
UNION ALL
SELECT '==================================='
UNION ALL
SELECT CONCAT(
  '✅ Tablas: ',
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('profiles', 'reservas')),
  '/2'
)
UNION ALL
SELECT CONCAT(
  '✅ RLS Habilitado: ',
  (SELECT COUNT(*) FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('profiles', 'reservas')
   AND rowsecurity),
  '/2'
)
UNION ALL
SELECT CONCAT(
  '✅ Políticas: ',
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename IN ('profiles', 'reservas'))
)
UNION ALL
SELECT CONCAT(
  '✅ Trigger: ',
  (SELECT COUNT(*) FROM pg_trigger
   WHERE tgname = 'on_auth_user_created')
)
UNION ALL
SELECT CONCAT(
  '📊 Usuarios: ',
  (SELECT COUNT(*) FROM auth.users)
)
UNION ALL
SELECT CONCAT(
  '📊 Reservas: ',
  (SELECT COUNT(*) FROM reservas)
)
UNION ALL
SELECT CONCAT(
  '👤 Admins: ',
  (SELECT COUNT(*) FROM profiles WHERE role = 'admin')
)
UNION ALL
SELECT '==================================';

-- ============================================
-- FIN DE VERIFICACIÓN
-- ============================================

-- Si todos los checks muestran ✅, tu configuración está correcta
-- Si hay ❌, revisa la sección correspondiente en supabase-setup.sql
-- Los ⚠️ son advertencias que no impiden el funcionamiento
