-- ============================================
-- PROBAR UPDATE DE RESERVAS MANUALMENTE
-- ============================================

-- PASO 1: Ver una reserva pendiente
SELECT
  id,
  nombre,
  fecha,
  hora,
  estado,
  user_id,
  'Reserva pendiente' as info
FROM public.reservas
WHERE estado = 'pendiente'
ORDER BY created_at DESC
LIMIT 1;

-- PASO 2: Copia el ID de arriba y úsalo aquí
-- Reemplaza 'ID-AQUI' con el ID real

-- Probar UPDATE directo (descomenta y ejecuta)
/*
UPDATE public.reservas
SET estado = 'confirmada'
WHERE id = 'ID-AQUI';
*/

-- PASO 3: Verificar si funcionó
/*
SELECT
  id,
  nombre,
  estado,
  'Estado después del UPDATE' as info
FROM public.reservas
WHERE id = 'ID-AQUI';
*/

-- PASO 4: Verificar tu rol de admin
SELECT
  id,
  email,
  role,
  public.is_admin(id) as test_is_admin,
  CASE
    WHEN role = 'admin' AND public.is_admin(id) THEN '✅ Admin OK'
    WHEN role = 'admin' AND NOT public.is_admin(id) THEN '❌ Admin pero función falla'
    ELSE '⚠️ No es admin'
  END as diagnostico
FROM public.profiles
WHERE id = auth.uid();

-- Si el UPDATE arriba funciona pero la app no, el problema es de configuración de políticas
-- Si el UPDATE arriba NO funciona, hay un problema con RLS o permisos
