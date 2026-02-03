-- ============================================
-- CREAR PRIMER ADMINISTRADOR
-- ============================================

-- MÉTODO 1: Si conoces tu email
-- Reemplaza 'tu-email@ejemplo.com' con tu email real

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tu-email@ejemplo.com';

-- Verificar el cambio
SELECT
  email,
  nombre,
  role,
  '✅ Ahora eres admin' as estado
FROM public.profiles
WHERE email = 'tu-email@ejemplo.com';

-- ============================================
-- MÉTODO 2: Si no estás seguro de tu email
-- ============================================

-- Ver todos los usuarios y elegir cuál hacer admin
SELECT
  id,
  email,
  nombre,
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- Luego ejecuta (reemplaza el email):
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'email-que-elegiste@ejemplo.com';

-- ============================================
-- VERIFICAR QUE AHORA HAY ADMINISTRADORES
-- ============================================

SELECT
  COUNT(*) as total_admins,
  '✅ Administradores activos' as estado
FROM public.profiles
WHERE role = 'admin';

-- Ver la lista de admins
SELECT
  email,
  nombre,
  role,
  created_at
FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at;
