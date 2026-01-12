-- ============================================
-- ACTUALIZAR POLÍTICAS PARA GESTIÓN DE USUARIOS
-- ============================================
-- Este script agrega políticas para que los admins
-- puedan modificar roles de otros usuarios

-- ============================================
-- 1. ELIMINAR POLÍTICAS ANTIGUAS DE PROFILES (si existen)
-- ============================================

-- Ver políticas actuales
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- Eliminar políticas antiguas que puedan estar limitando acceso
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;

-- ============================================
-- 2. CREAR NUEVAS POLÍTICAS MEJORADAS
-- ============================================

-- Política: Los usuarios pueden actualizar su propio perfil (excepto role)
CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- NO pueden cambiar su propio role
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Política: Los admins pueden actualizar cualquier perfil
CREATE POLICY "Los admins pueden actualizar cualquier perfil"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política: Los admins pueden leer todos los perfiles (si no existe)
-- Primero eliminar si existe
DROP POLICY IF EXISTS "Los admins pueden ver todos los perfiles" ON public.profiles;

-- Recrear
CREATE POLICY "Los admins pueden ver todos los perfiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 3. VERIFICAR LAS POLÍTICAS
-- ============================================

SELECT
  tablename as tabla,
  policyname as politica,
  cmd as comando,
  '✅ Configurada' as estado
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY tablename, cmd, policyname;

-- Debe haber al menos 3 políticas:
-- 1. Los usuarios pueden ver su propio perfil (SELECT)
-- 2. Los usuarios pueden actualizar su propio perfil (UPDATE)
-- 3. Los admins pueden actualizar cualquier perfil (UPDATE)
-- 4. Los admins pueden ver todos los perfiles (SELECT)

-- ============================================
-- 4. PROBAR LA FUNCIONALIDAD (Opcional)
-- ============================================

-- Ver todos los usuarios (debe funcionar si eres admin)
SELECT id, email, nombre, role FROM public.profiles;

-- Simular cambio de rol (reemplaza el UUID con uno real)
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = 'uuid-del-usuario';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
DESPUÉS DE EJECUTAR ESTE SCRIPT:

1. Los admins podrán:
   - Ver todos los perfiles
   - Cambiar el rol de cualquier usuario
   - Actualizar información de cualquier perfil

2. Los usuarios normales podrán:
   - Ver solo su propio perfil
   - Actualizar su propio nombre/email
   - NO podrán cambiar su propio rol

3. Seguridad:
   - Un usuario no puede hacerse admin a sí mismo
   - Solo los admins pueden cambiar roles
   - Los cambios están protegidos por RLS

4. En la aplicación:
   - Los admins verán el botón "USUARIOS" en el navbar
   - Podrán cambiar roles desde /admin/usuarios
   - Los cambios se reflejan inmediatamente
*/

-- ============================================
-- 5. TROUBLESHOOTING
-- ============================================

-- Si tienes problemas, ejecuta esto para ver permisos:
SELECT
  schemaname,
  tablename,
  tableowner,
  rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- Para desactivar RLS temporalmente (SOLO PARA DEBUG):
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Para reactivar:
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
