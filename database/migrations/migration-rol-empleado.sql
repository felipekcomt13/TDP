-- ============================================
-- MIGRACION: Nuevo rol "empleado"
-- ============================================
-- Agrega el rol 'empleado' al sistema.
-- El empleado tiene acceso a las mismas funcionalidades que el admin
-- excepto la gestion de productos del kiosco (solo puede vender).
-- ============================================

-- 1. Actualizar CHECK constraint de profiles.role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'empleado'));

-- 2. Actualizar funcion is_admin para incluir empleados
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('admin', 'empleado')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Actualizar funcion cambiar_rol_usuario para aceptar 'empleado'
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
  admin_actual := auth.uid();

  IF admin_actual IS NULL THEN
    RAISE EXCEPTION 'No hay usuario autenticado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = admin_actual AND role = 'admin') THEN
    RAISE EXCEPTION 'No tienes permisos de administrador';
  END IF;

  SELECT email, role INTO email_usuario, rol_anterior
  FROM public.profiles
  WHERE id = user_id;

  IF email_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  IF nuevo_rol NOT IN ('user', 'admin', 'empleado') THEN
    RAISE EXCEPTION 'Rol invalido: %. Debe ser "user", "admin" o "empleado"', nuevo_rol;
  END IF;

  UPDATE public.profiles
  SET role = nuevo_rol
  WHERE id = user_id;

  resultado := json_build_object(
    'success', true,
    'user_id', user_id,
    'email', email_usuario,
    'rol_anterior', rol_anterior,
    'rol_nuevo', nuevo_rol,
    'admin_que_cambio', admin_actual,
    'timestamp', now()
  );

  RETURN resultado;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- 4. Verificacion
SELECT 'Migracion rol empleado completada' as estado;
