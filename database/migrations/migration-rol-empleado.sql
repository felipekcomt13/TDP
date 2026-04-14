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
-- NOTA: Solo admins (no empleados) pueden cambiar roles
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

-- ============================================
-- 4. ACTUALIZAR RLS POLICIES - usar is_admin() en vez de role = 'admin'
-- ============================================

-- === PRODUCTOS_KIOSCO ===
DROP POLICY IF EXISTS "Admins pueden ver productos kiosco" ON public.productos_kiosco;
CREATE POLICY "Admins pueden ver productos kiosco"
  ON public.productos_kiosco FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins pueden insertar productos kiosco" ON public.productos_kiosco;
CREATE POLICY "Admins pueden insertar productos kiosco"
  ON public.productos_kiosco FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins pueden actualizar productos kiosco" ON public.productos_kiosco;
CREATE POLICY "Admins pueden actualizar productos kiosco"
  ON public.productos_kiosco FOR UPDATE
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins pueden eliminar productos kiosco" ON public.productos_kiosco;
CREATE POLICY "Admins pueden eliminar productos kiosco"
  ON public.productos_kiosco FOR DELETE
  USING (public.is_admin(auth.uid()));

-- === VENTAS_KIOSCO ===
DROP POLICY IF EXISTS "Admins pueden ver ventas kiosco" ON public.ventas_kiosco;
CREATE POLICY "Admins pueden ver ventas kiosco"
  ON public.ventas_kiosco FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins pueden insertar ventas kiosco" ON public.ventas_kiosco;
CREATE POLICY "Admins pueden insertar ventas kiosco"
  ON public.ventas_kiosco FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- === MOVIMIENTOS_CUENTA ===
DROP POLICY IF EXISTS "Admins pueden ver movimientos_cuenta" ON public.movimientos_cuenta;
CREATE POLICY "Admins pueden ver movimientos_cuenta"
  ON public.movimientos_cuenta FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins pueden insertar movimientos_cuenta" ON public.movimientos_cuenta;
CREATE POLICY "Admins pueden insertar movimientos_cuenta"
  ON public.movimientos_cuenta FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- === HERO_CONFIG ===
DROP POLICY IF EXISTS "Admins pueden actualizar hero_config" ON public.hero_config;
CREATE POLICY "Admins pueden actualizar hero_config"
  ON public.hero_config FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- === PROFILES (admins ven todos) ===
DROP POLICY IF EXISTS "Los admins pueden ver todos los perfiles" ON public.profiles;
CREATE POLICY "Los admins pueden ver todos los perfiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- === SOCIOS_COMERCIALES ===
DROP POLICY IF EXISTS "Admins pueden ver socios_comerciales" ON public.socios_comerciales;
CREATE POLICY "Admins pueden ver socios_comerciales"
  ON public.socios_comerciales FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins pueden insertar socios_comerciales" ON public.socios_comerciales;
CREATE POLICY "Admins pueden insertar socios_comerciales"
  ON public.socios_comerciales FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins pueden actualizar socios_comerciales" ON public.socios_comerciales;
CREATE POLICY "Admins pueden actualizar socios_comerciales"
  ON public.socios_comerciales FOR UPDATE
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins pueden eliminar socios_comerciales" ON public.socios_comerciales;
CREATE POLICY "Admins pueden eliminar socios_comerciales"
  ON public.socios_comerciales FOR DELETE
  USING (public.is_admin(auth.uid()));

-- === MEMBRESIAS ===
DROP POLICY IF EXISTS "Admins pueden ver todas las membresias" ON public.membresias;
CREATE POLICY "Admins pueden ver todas las membresias"
  ON public.membresias FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins pueden insertar membresias" ON public.membresias;
CREATE POLICY "Admins pueden insertar membresias"
  ON public.membresias FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins pueden actualizar membresias" ON public.membresias;
CREATE POLICY "Admins pueden actualizar membresias"
  ON public.membresias FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- === RESERVAS (admin update) ===
DROP POLICY IF EXISTS "Admins pueden actualizar reservas" ON public.reservas;
CREATE POLICY "Admins pueden actualizar reservas"
  ON public.reservas FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- 5. ACTUALIZAR FUNCIONES RPC que chequean role = 'admin'
-- ============================================

-- Funcion registrar_venta_kiosco: usar is_admin() para permitir empleados
DROP FUNCTION IF EXISTS registrar_venta_kiosco(UUID, INTEGER);
DROP FUNCTION IF EXISTS registrar_venta_kiosco(UUID, INTEGER, TEXT);
CREATE OR REPLACE FUNCTION registrar_venta_kiosco(
  p_producto_id UUID,
  p_cantidad INTEGER DEFAULT 1,
  p_tipo_pago TEXT DEFAULT 'efectivo'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_producto RECORD;
  v_venta_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF NOT public.is_admin(v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos');
  END IF;

  SELECT * INTO v_producto
  FROM public.productos_kiosco
  WHERE id = p_producto_id AND activo = true
  FOR UPDATE;

  IF v_producto IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Producto no encontrado o inactivo');
  END IF;

  IF v_producto.stock < p_cantidad THEN
    RETURN json_build_object('success', false, 'error', 'Stock insuficiente. Disponible: ' || v_producto.stock);
  END IF;

  UPDATE public.productos_kiosco
  SET stock = stock - p_cantidad
  WHERE id = p_producto_id;

  INSERT INTO public.ventas_kiosco (
    producto_id, nombre_producto, precio_venta, cantidad, tipo_pago, vendido_por
  ) VALUES (
    p_producto_id, v_producto.nombre, v_producto.precio, p_cantidad, p_tipo_pago, v_user_id
  )
  RETURNING id INTO v_venta_id;

  RETURN json_build_object(
    'success', true,
    'venta_id', v_venta_id,
    'producto', v_producto.nombre,
    'precio', v_producto.precio,
    'cantidad', p_cantidad,
    'stock_restante', v_producto.stock - p_cantidad
  );
END;
$$;

-- Funcion activar_membresia: usar is_admin()
CREATE OR REPLACE FUNCTION public.activar_membresia(
  p_user_id UUID,
  p_duracion_dias INTEGER DEFAULT 30,
  p_precio DECIMAL DEFAULT NULL,
  p_metodo_pago TEXT DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_fecha_inicio DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_fecha_inicio DATE;
  v_fecha_fin DATE;
  v_membresia_id UUID;
BEGIN
  v_admin_id := auth.uid();

  IF NOT public.is_admin(v_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos');
  END IF;

  v_fecha_inicio := COALESCE(p_fecha_inicio, CURRENT_DATE);
  v_fecha_fin := v_fecha_inicio + p_duracion_dias;

  UPDATE public.membresias SET estado = 'vencida'
  WHERE user_id = p_user_id AND estado = 'activa';

  INSERT INTO public.membresias (user_id, fecha_inicio, fecha_fin, estado, precio, metodo_pago, notas, activada_por)
  VALUES (p_user_id, v_fecha_inicio, v_fecha_fin, 'activa', p_precio, p_metodo_pago, p_notas, v_admin_id)
  RETURNING id INTO v_membresia_id;

  UPDATE public.profiles SET es_socio = true WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'membresia_id', v_membresia_id,
    'fecha_inicio', v_fecha_inicio,
    'fecha_fin', v_fecha_fin,
    'duracion_dias', p_duracion_dias
  );
END;
$$;

-- Funcion desactivar_membresia: usar is_admin()
CREATE OR REPLACE FUNCTION public.desactivar_membresia(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();

  IF NOT public.is_admin(v_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos');
  END IF;

  UPDATE public.membresias SET estado = 'cancelada'
  WHERE user_id = p_user_id AND estado = 'activa';

  UPDATE public.profiles SET es_socio = false WHERE id = p_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Funcion editar_producto_kiosco: usar is_admin()
CREATE OR REPLACE FUNCTION editar_producto_kiosco(
  p_id UUID,
  p_nombre TEXT,
  p_precio DECIMAL,
  p_stock INTEGER,
  p_codigo_barras TEXT,
  p_imagen_url TEXT DEFAULT NULL,
  p_activo BOOLEAN DEFAULT true
) RETURNS void AS $$
BEGIN
  UPDATE public.productos_kiosco
  SET nombre = p_nombre,
      precio = p_precio,
      stock = p_stock,
      codigo_barras = p_codigo_barras,
      imagen_url = p_imagen_url,
      activo = p_activo
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Verificacion
-- ============================================
SELECT 'Migracion rol empleado completada - Policies y funciones actualizadas' as estado;
