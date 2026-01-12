-- ============================================
-- SOLUCIONAR PROBLEMA DE PROFILES VACÍA
-- ============================================

-- PASO 1: Verificar el estado actual
-- ============================================

-- Ver usuarios en auth.users
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  '👤 En auth.users' as ubicacion
FROM auth.users
ORDER BY created_at DESC;

-- Ver usuarios en profiles
SELECT
  id,
  email,
  nombre,
  role,
  '📋 En profiles' as ubicacion
FROM public.profiles
ORDER BY created_at DESC;

-- Contar la diferencia
SELECT
  (SELECT COUNT(*) FROM auth.users) as usuarios_en_auth,
  (SELECT COUNT(*) FROM public.profiles) as usuarios_en_profiles,
  (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM public.profiles) as diferencia,
  CASE
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.profiles)
      THEN '✅ Sincronizados'
    ELSE '❌ Falta sincronizar'
  END as estado;

-- ============================================
-- PASO 2: Crear/Recrear el Trigger
-- ============================================

-- Eliminar trigger y función si existen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Crear la función mejorada con manejo de errores
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO NOTHING; -- Evita errores si ya existe

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log del error pero no fallar la creación del usuario
    RAISE WARNING 'Error al crear perfil: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verificar que se creó
SELECT
  tgname as trigger_nombre,
  '✅ Trigger creado' as estado
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- ============================================
-- PASO 3: Migrar Usuarios Existentes
-- ============================================

-- Crear perfiles para usuarios que ya existen pero no tienen perfil
INSERT INTO public.profiles (id, email, nombre, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'nombre', split_part(au.email, '@', 1)) as nombre,
  'user' as role
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL  -- Solo los que NO tienen perfil
ON CONFLICT (id) DO NOTHING;

-- Ver cuántos se migraron
SELECT
  COUNT(*) as perfiles_creados,
  '✅ Usuarios migrados a profiles' as resultado
FROM public.profiles;

-- ============================================
-- PASO 4: Hacer Admin al Primer Usuario
-- ============================================

-- Ver todos los usuarios para elegir cuál hacer admin
SELECT
  email,
  nombre,
  role,
  created_at,
  ROW_NUMBER() OVER (ORDER BY created_at) as numero
FROM public.profiles
ORDER BY created_at;

-- Opción A: Hacer admin al primer usuario (más antiguo)
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1
);

-- Opción B: Hacer admin por email (REEMPLAZA CON TU EMAIL)
-- Descomenta y reemplaza con tu email real:
/*
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tu-email@ejemplo.com';
*/

-- ============================================
-- PASO 5: Verificar Resultados
-- ============================================

-- Ver todos los usuarios con su información completa
SELECT
  p.email,
  p.nombre,
  p.role,
  p.created_at,
  au.email_confirmed_at,
  CASE
    WHEN p.role = 'admin' THEN '👑 ADMIN'
    ELSE '👤 Usuario'
  END as tipo,
  CASE
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Email confirmado'
    ELSE '⚠️ Email sin confirmar'
  END as estado_email
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;

-- Verificar que hay al menos un admin
SELECT
  COUNT(*) as total_admins,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Hay administradores'
    ELSE '❌ NO hay administradores'
  END as estado
FROM public.profiles
WHERE role = 'admin';

-- Mostrar los admins
SELECT
  email,
  nombre,
  '👑 ADMINISTRADOR' as rol,
  created_at
FROM public.profiles
WHERE role = 'admin';

-- ============================================
-- PASO 6: Probar el Trigger (Opcional)
-- ============================================

-- Para probar que el trigger funciona, puedes crear un usuario de prueba
-- desde el dashboard de Supabase (Authentication → Users → Add user)
-- y luego verificar que se creó automáticamente en profiles:

/*
SELECT
  au.email as email_en_auth,
  p.email as email_en_profiles,
  p.role,
  CASE
    WHEN p.id IS NOT NULL THEN '✅ Perfil creado automáticamente'
    ELSE '❌ Perfil NO creado (trigger no funciona)'
  END as estado_trigger
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'email-del-usuario-de-prueba@ejemplo.com';
*/

-- ============================================
-- RESUMEN FINAL
-- ============================================

SELECT '======================================' as mensaje
UNION ALL SELECT 'RESUMEN DE LA MIGRACIÓN'
UNION ALL SELECT '======================================'
UNION ALL
SELECT CONCAT(
  '👤 Usuarios en auth.users: ',
  (SELECT COUNT(*) FROM auth.users)
)
UNION ALL
SELECT CONCAT(
  '📋 Usuarios en profiles: ',
  (SELECT COUNT(*) FROM public.profiles)
)
UNION ALL
SELECT CONCAT(
  '👑 Administradores: ',
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin')
)
UNION ALL
SELECT CONCAT(
  '✅ Trigger activo: ',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')
    THEN 'Sí'
    ELSE 'No'
  END
)
UNION ALL SELECT '======================================';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
DESPUÉS DE EJECUTAR ESTE SCRIPT:

1. ✅ La tabla profiles tendrá todos los usuarios de auth.users
2. ✅ El trigger estará activo para nuevos usuarios
3. ✅ Habrá al menos un administrador
4. ✅ Los nuevos registros crearán automáticamente el perfil

SIGUIENTE PASO:
- En tu aplicación, cierra sesión
- Vuelve a iniciar sesión
- Deberías ver los botones ADMIN y USUARIOS en el navbar
- Ve a /admin/usuarios y verás la lista de usuarios

SI EL PROBLEMA PERSISTE:
- Verifica que las políticas RLS estén configuradas
- Ejecuta: actualizar-politicas-admin.sql
- Revisa la consola del navegador (F12) para ver errores
*/
