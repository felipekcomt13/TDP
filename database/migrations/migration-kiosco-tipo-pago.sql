-- Agregar columna tipo_pago a ventas_kiosco
ALTER TABLE public.ventas_kiosco
ADD COLUMN IF NOT EXISTS tipo_pago TEXT DEFAULT 'efectivo';

-- Recrear RPC con parametro tipo_pago
CREATE OR REPLACE FUNCTION registrar_venta_kiosco(
  p_producto_id UUID,
  p_cantidad INTEGER DEFAULT 1,
  p_tipo_pago TEXT DEFAULT 'efectivo'
) RETURNS jsonb AS $$
DECLARE
  v_producto RECORD;
  v_nuevo_stock INTEGER;
BEGIN
  -- Obtener producto con bloqueo
  SELECT * INTO v_producto
  FROM public.productos_kiosco
  WHERE id = p_producto_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Producto no encontrado');
  END IF;

  IF NOT v_producto.activo THEN
    RETURN jsonb_build_object('success', false, 'error', 'Producto inactivo');
  END IF;

  IF v_producto.stock < p_cantidad THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stock insuficiente');
  END IF;

  -- Decrementar stock
  v_nuevo_stock := v_producto.stock - p_cantidad;
  UPDATE public.productos_kiosco SET stock = v_nuevo_stock WHERE id = p_producto_id;

  -- Registrar venta
  INSERT INTO public.ventas_kiosco (producto_id, nombre_producto, precio_venta, cantidad, tipo_pago, vendido_por)
  VALUES (p_producto_id, v_producto.nombre, v_producto.precio, p_cantidad, p_tipo_pago, auth.uid());

  RETURN jsonb_build_object(
    'success', true,
    'producto', v_producto.nombre,
    'precio', v_producto.precio,
    'cantidad', p_cantidad,
    'tipo_pago', p_tipo_pago,
    'stock_restante', v_nuevo_stock
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
