-- ============================================
-- CORREGIR RECURSIÓN INFINITA EN PROFILES
-- ============================================

-- El problema: Las políticas RLS están causando recursión infinita
-- La solución: Usar funciones con SECURITY DEFINER para saltarse RLS

-- ============================================
-- PASO 1: Eliminar TODAS las políticas actuales
-- ============================================

DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los admins pueden ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Los admins pueden actualizar cualquier perfil" ON public.profiles;

-- Ver que se eliminaron
SELECT
  'Políticas eliminadas' as paso,
  COUNT(*) as politicas_restantes
FROM pg_policies
WHERE tablename = 'profiles';

-- ============================================
-- PASO 2: Crear función para verificar si es admin
-- ============================================

-- Esta función se ejecuta con SECURITY DEFINER, saltándose RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que se creó
SELECT
  'Función is_admin creada' as paso,
  '✅ OK' as estado;

-- ============================================
-- PASO 3: Crear políticas SIMPLES sin recursión
-- ============================================

-- Política 1: Todos pueden ver su propio perfil
CREATE POLICY "Ver propio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Política 2: Admins pueden ver todos los perfiles
-- Usa la función que saltea RLS
CREATE POLICY "Admins ven todos"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Política 3: Usuarios pueden actualizar su propio perfil (pero no el role)
CREATE POLICY "Actualizar propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- El role no puede ser cambiado por el usuario
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Política 4: Admins pueden actualizar cualquier perfil
CREATE POLICY "Admins actualizan todo"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- PASO 4: Verificar las nuevas políticas
-- ============================================

SELECT
  tablename as tabla,
  policyname as politica,
  cmd as comando,
  '✅ Configurada' as estado
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- Debe mostrar 4 políticas:
-- 1. Ver propio perfil (SELECT)
-- 2. Admins ven todos (SELECT)
-- 3. Actualizar propio perfil (UPDATE)
-- 4. Admins actualizan todo (UPDATE)

-- ============================================
-- PASO 5: Probar que funciona
-- ============================================

-- Probar la función is_admin directamente
SELECT
  id,
  email,
  role,
  public.is_admin(id) as es_admin_segun_funcion
FROM public.profiles
ORDER BY created_at
LIMIT 5;

-- Ver todos los perfiles (debería funcionar si eres admin)
SELECT
  id,
  email,
  nombre,
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- ============================================
-- PASO 6: Verificar que RLS sigue activo
-- ============================================

SELECT
  tablename,
  rowsecurity as rls_habilitado,
  CASE
    WHEN rowsecurity THEN '✅ RLS activo'
    ELSE '❌ RLS desactivado'
  END as estado
FROM pg_tables
WHERE tablename = 'profiles';

-- ============================================
-- RESUMEN
-- ============================================

SELECT '======================================' as mensaje
UNION ALL SELECT 'RESUMEN DE LA CORRECCIÓN'
UNION ALL SELECT '======================================'
UNION ALL
SELECT CONCAT(
  '✅ Función is_admin: ',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_admin'
  ) THEN 'Creada' ELSE 'No existe' END
)
UNION ALL
SELECT CONCAT(
  '✅ Políticas: ',
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles')::text,
  '/4 configuradas'
)
UNION ALL
SELECT CONCAT(
  '✅ RLS: ',
  CASE WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'profiles')
    THEN 'Activo' ELSE 'Inactivo' END
)
UNION ALL SELECT '======================================';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
¿QUÉ CAMBIÓ?

ANTES (con recursión):
- Las políticas consultaban profiles para verificar si el usuario es admin
- Esto creaba un bucle: para leer profiles necesitaba verificar si es admin
  pero para verificar si es admin necesitaba leer profiles

AHORA (sin recursión):
- La función is_admin() usa SECURITY DEFINER
- SECURITY DEFINER ejecuta la función con privilegios del creador
- Esto permite que la función lea profiles sin pasar por RLS
- Las políticas usan esta función, evitando la recursión

RESULTADO:
- Los usuarios pueden ver su propio perfil
- Los admins pueden ver todos los perfiles
- Los usuarios pueden actualizar su perfil (excepto role)
- Los admins pueden actualizar cualquier perfil
- ¡Sin recursión infinita!

DESPUÉS DE EJECUTAR ESTE SCRIPT:
1. Refresca tu aplicación (F5)
2. Ve a cualquier página
3. Los botones ADMIN y USUARIOS deberían aparecer
4. /admin/usuarios debería funcionar correctamente
*/
