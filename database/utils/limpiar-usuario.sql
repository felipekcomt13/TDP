-- ============================================
-- SCRIPT PARA ENCONTRAR Y LIMPIAR USUARIOS PROBLEMÁTICOS
-- ============================================
-- Reemplaza 'tu-email@ejemplo.com' con tu email real

-- ============================================
-- 1. BUSCAR EL USUARIO EN auth.users
-- ============================================

-- Buscar por email en auth.users
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  CASE
    WHEN email_confirmed_at IS NULL THEN '⚠️ Email NO confirmado'
    ELSE '✅ Email confirmado'
  END as estado_confirmacion
FROM auth.users
WHERE email = 'tu-email@ejemplo.com';

-- Si esto devuelve resultados, el usuario EXISTE pero puede estar oculto

-- ============================================
-- 2. BUSCAR EN LA TABLA PROFILES
-- ============================================

SELECT
  id,
  email,
  nombre,
  role,
  created_at
FROM public.profiles
WHERE email = 'tu-email@ejemplo.com';

-- ============================================
-- 3. VER TODOS LOS USUARIOS (para verificar)
-- ============================================

SELECT
  au.id,
  au.email,
  au.email_confirmed_at,
  p.nombre,
  p.role,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 10;

-- ============================================
-- 4. OPCIÓN A: ELIMINAR USUARIO PROBLEMÁTICO
-- ============================================
-- ⚠️ SOLO ejecuta esto si encontraste el usuario arriba
-- y quieres eliminarlo para volver a registrarte

-- PASO 1: Guardar el ID del usuario (cópialo del resultado de la primera consulta)
-- PASO 2: Eliminar de profiles primero
DELETE FROM public.profiles
WHERE email = 'tu-email@ejemplo.com';

-- PASO 3: Eliminar de auth.users (usa el ID que copiaste)
-- Reemplaza 'id-del-usuario-aqui' con el UUID real
DELETE FROM auth.users
WHERE email = 'tu-email@ejemplo.com';

-- Verificar que se eliminó
SELECT COUNT(*) as usuarios_restantes
FROM auth.users
WHERE email = 'tu-email@ejemplo.com';
-- Esto debe devolver 0

-- ============================================
-- 5. OPCIÓN B: CONFIRMAR EMAIL DEL USUARIO EXISTENTE
-- ============================================
-- Si el usuario existe pero no está confirmado,
-- puedes confirmarlo manualmente:

UPDATE auth.users
SET
  email_confirmed_at = NOW(),
  confirmation_token = NULL,
  confirmation_sent_at = NULL
WHERE email = 'tu-email@ejemplo.com'
  AND email_confirmed_at IS NULL;

-- Verificar la confirmación
SELECT
  email,
  email_confirmed_at,
  '✅ Confirmado manualmente' as estado
FROM auth.users
WHERE email = 'tu-email@ejemplo.com';

-- ============================================
-- 6. LIMPIAR TODOS LOS USUARIOS DE PRUEBA (CUIDADO)
-- ============================================
-- ⚠️ PELIGRO: Esto elimina TODOS los usuarios
-- Solo usar en desarrollo si quieres empezar de cero

-- DESCOMENTAR SOLO SI ESTÁS SEGURO:
-- DELETE FROM public.profiles;
-- DELETE FROM auth.users;

-- ============================================
-- 7. DESPUÉS DE LIMPIAR: CREAR USUARIO MANUALMENTE
-- ============================================
-- Si eliminaste el usuario, ahora puedes:
-- A) Volver a registrarte en la app (recomendado)
-- B) Crear el usuario manualmente (ver abajo)

-- OPCIÓN: Crear usuario directamente en auth.users (avanzado)
-- Nota: Esto es complejo, mejor usar el dashboard de Supabase:
-- Authentication → Users → Add user → Create new user

-- ============================================
-- 8. VERIFICAR CONFIGURACIÓN DE EMAIL
-- ============================================

-- Ver si la confirmación de email está activada
-- (esto no se puede ver con SQL, debes ir al dashboard)
-- Authentication → Providers → Email → Confirm email

-- Ver usuarios sin confirmar
SELECT
  COUNT(*) as usuarios_sin_confirmar,
  '⚠️ Necesitan confirmación de email' as nota
FROM auth.users
WHERE email_confirmed_at IS NULL;

SELECT
  email,
  created_at,
  '⚠️ Sin confirmar' as estado
FROM auth.users
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- ============================================
-- RESUMEN DE ACCIONES
-- ============================================

/*
PASO A PASO:

1. Ejecuta la consulta #1 para buscar tu usuario
   - Si aparece: el usuario existe
   - Si no aparece: puede ser un problema de caché

2. Si el usuario existe:
   OPCIÓN A: Confirmarlo manualmente (consulta #5)
   OPCIÓN B: Eliminarlo y volver a crearlo (consulta #4)

3. Si el usuario NO existe pero dice "email registrado":
   - Espera 10 minutos (puede ser caché)
   - O crea el usuario manualmente en el dashboard

4. Después de limpiar/confirmar:
   - Ve al dashboard: Authentication → Users
   - Verifica que el usuario aparezca
   - Intenta iniciar sesión en la app

5. Para convertir en admin:
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'tu-email@ejemplo.com';
*/
