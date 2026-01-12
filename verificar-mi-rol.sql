-- ============================================
-- VERIFICAR TU ROL Y HACER DEBUG
-- ============================================

-- 1. Ver TODOS los usuarios y sus roles
SELECT
  email,
  nombre,
  role,
  created_at,
  CASE
    WHEN role = 'admin' THEN '👑 ADMIN'
    ELSE '👤 Usuario normal'
  END as estado
FROM public.profiles
ORDER BY created_at DESC;

-- 2. Si tu email no aparece con role='admin', ejecuta esto:
-- (reemplaza con tu email real)
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tu-email@ejemplo.com';

-- 3. Verificar el cambio
SELECT
  email,
  role,
  '✅ Ahora eres admin' as resultado
FROM public.profiles
WHERE email = 'tu-email@ejemplo.com';

-- 4. Ver cuántos admins hay
SELECT
  COUNT(*) as total_admins,
  '👑 Administradores en el sistema' as descripcion
FROM public.profiles
WHERE role = 'admin';
