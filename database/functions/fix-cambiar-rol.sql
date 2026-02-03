-- ============================================
-- SOLUCIÓN: FUNCIÓN RPC PARA CAMBIAR ROLES DE USUARIO
-- ============================================
-- Este script crea una función RPC que permite a los admins
-- cambiar roles de usuarios, evitando problemas de CORS con PATCH
-- ============================================

-- ============================================
-- 1. ELIMINAR FUNCIÓN ANTERIOR (SI EXISTE)
-- ============================================

DROP FUNCTION IF EXISTS public.cambiar_rol_usuario(uuid, text);

-- ============================================
-- 2. CREAR FUNCIÓN RPC PARA CAMBIAR ROL
-- ============================================

CREATE OR REPLACE FUNCTION public.cambiar_rol_usuario(user_id uuid, nuevo_rol text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_actual uuid;
  email_usuario text;
  rol_anterior text;
  resultado json;
BEGIN
  -- Log de inicio
  RAISE NOTICE '🔄 cambiar_rol_usuario: Inicio';
  RAISE NOTICE '   - user_id: %', user_id;
  RAISE NOTICE '   - nuevo_rol: %', nuevo_rol;

  -- Obtener usuario autenticado
  admin_actual := auth.uid();
  RAISE NOTICE '   - admin_actual: %', admin_actual;

  -- Validación 1: Verificar que hay un usuario autenticado
  IF admin_actual IS NULL THEN
    RAISE EXCEPTION 'No hay usuario autenticado';
  END IF;

  -- Validación 2: Verificar que el usuario autenticado es admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = admin_actual AND role = 'admin') THEN
    RAISE EXCEPTION 'No tienes permisos de administrador';
  END IF;

  -- Validación 3: Verificar que el usuario objetivo existe
  SELECT email, role INTO email_usuario, rol_anterior
  FROM public.profiles
  WHERE id = user_id;

  IF email_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  RAISE NOTICE '   - email_usuario: %', email_usuario;
  RAISE NOTICE '   - rol_anterior: %', rol_anterior;

  -- Validación 4: Verificar que el nuevo rol es válido
  IF nuevo_rol NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Rol inválido: %. Debe ser "user" o "admin"', nuevo_rol;
  END IF;

  -- Actualizar rol
  UPDATE public.profiles
  SET role = nuevo_rol
  WHERE id = user_id;

  RAISE NOTICE '✅ Rol actualizado exitosamente';

  -- Construir resultado
  resultado := json_build_object(
    'success', true,
    'user_id', user_id,
    'email', email_usuario,
    'rol_anterior', rol_anterior,
    'rol_nuevo', nuevo_rol,
    'admin_que_cambio', admin_actual,
    'timestamp', now()
  );

  RAISE NOTICE '   - resultado: %', resultado;

  RETURN resultado;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error en cambiar_rol_usuario: %', SQLERRM;
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- ============================================
-- 3. DAR PERMISOS A LA FUNCIÓN
-- ============================================

-- Dar permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.cambiar_rol_usuario(uuid, text) TO authenticated;

-- Dar permisos a usuarios anónimos (por si acaso)
GRANT EXECUTE ON FUNCTION public.cambiar_rol_usuario(uuid, text) TO anon;

-- ============================================
-- 4. VERIFICAR LA FUNCIÓN
-- ============================================

-- Ver que la función existe
SELECT
  routine_name as funcion,
  routine_type as tipo,
  '✅ Creada correctamente' as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'cambiar_rol_usuario';

-- Ver los permisos
SELECT
  proname as funcion,
  pg_get_functiondef(oid) as definicion_completa
FROM pg_proc
WHERE proname = 'cambiar_rol_usuario'
  AND pronamespace = 'public'::regnamespace;

-- ============================================
-- 5. PROBAR LA FUNCIÓN (MANUAL)
-- ============================================

-- Reemplaza estos valores con IDs reales de tu base de datos:
-- SELECT * FROM public.cambiar_rol_usuario(
--   'UUID-DEL-USUARIO-A-CAMBIAR'::uuid,
--   'admin'  -- o 'user'
-- );

-- Ver todos los usuarios para obtener IDs:
SELECT id, email, nombre, role
FROM public.profiles
ORDER BY created_at DESC;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
DESPUÉS DE EJECUTAR ESTE SCRIPT:

1. La función RPC está disponible para usar desde el frontend
2. El frontend debe llamarla así:

   const { data, error } = await supabase.rpc('cambiar_rol_usuario', {
     user_id: 'uuid-del-usuario',
     nuevo_rol: 'admin' // o 'user'
   });

3. Ventajas de usar RPC:
   - Evita problemas de CORS con PATCH
   - Más seguro (lógica en servidor)
   - Logs detallados en Supabase
   - Validaciones centralizadas

4. Los logs se pueden ver en:
   - Supabase Dashboard → Database → Logs

5. Errores comunes:
   - "No hay usuario autenticado" → El usuario no está logueado
   - "No tienes permisos de administrador" → El usuario no es admin
   - "Usuario no encontrado" → El user_id no existe

TROUBLESHOOTING:
Si tienes problemas, verifica:
- Que el usuario esté autenticado y sea admin
- Que el UUID del usuario a cambiar sea correcto
- Los logs en Supabase Dashboard
*/
