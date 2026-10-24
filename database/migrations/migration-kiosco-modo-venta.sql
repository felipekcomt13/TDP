-- =====================================================
-- MIGRACION: Kiosco - Modo venta (lector de codigo de barras + carrito)
-- =====================================================
-- Ejecutar este script en Supabase SQL Editor.
-- Requiere migration-kiosco.sql, migration-kiosco-tipo-pago.sql y
-- migration-rol-empleado.sql (usa public.is_admin()).
-- =====================================================

-- 1. Codigo de barras unico
-- Antes de crear el indice, revisar si hay codigos repetidos (el indice fallara
-- si los hay). Esta consulta debe devolver 0 filas:
--
--   SELECT codigo_barras, COUNT(*)
--   FROM public.productos_kiosco
--   WHERE codigo_barras IS NOT NULL AND btrim(codigo_barras) <> ''
--   GROUP BY codigo_barras HAVING COUNT(*) > 1;

-- Normalizar: sin espacios alrededor, y vacio = NULL
UPDATE public.productos_kiosco
SET codigo_barras = NULLIF(btrim(codigo_barras), '')
WHERE codigo_barras IS DISTINCT FROM NULLIF(btrim(codigo_barras), '');

-- Reemplaza el indice simple de migration-kiosco.sql
DROP INDEX IF EXISTS public.idx_productos_kiosco_codigo_barras;
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_kiosco_codigo_barras_unico
  ON public.productos_kiosco (codigo_barras)
  WHERE codigo_barras IS NOT NULL;

-- 2. Agrupar las lineas de una misma venta (ticket)
-- Cada producto del carrito sigue siendo una fila en ventas_kiosco (asi el
-- historial y la caja actuales no cambian); ticket_id las une.
ALTER TABLE public.ventas_kiosco ADD COLUMN IF NOT EXISTS ticket_id UUID;
CREATE INDEX IF NOT EXISTS idx_ventas_kiosco_ticket_id ON public.ventas_kiosco(ticket_id);

-- 3. RPC: registrar un carrito completo en una sola transaccion
-- p_items: [{"producto_id": "<uuid>", "cantidad": 2}, ...]
-- Primero bloquea y valida TODOS los productos; solo si todos tienen stock
-- descuenta y registra. Si uno falla no se vende ninguno.
CREATE OR REPLACE FUNCTION registrar_venta_kiosco_lote(
  p_items JSONB,
  p_tipo_pago TEXT DEFAULT 'efectivo'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_ticket_id UUID := gen_random_uuid();
  v_item RECORD;
  v_producto RECORD;
  v_total NUMERIC(10,2) := 0;
  v_lineas JSON;
BEGIN
  IF NOT public.is_admin(v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos');
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'El carrito esta vacio');
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) e
    WHERE (e->>'cantidad') IS NULL OR (e->>'cantidad')::INTEGER <= 0
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Cantidad invalida');
  END IF;

  -- Validar todo antes de tocar nada. Se suman cantidades por producto (por si
  -- viene repetido) y se bloquea en orden de id para evitar deadlocks entre dos
  -- cajas vendiendo a la vez.
  FOR v_item IN
    SELECT (e->>'producto_id')::UUID AS producto_id, SUM((e->>'cantidad')::INTEGER) AS cantidad
    FROM jsonb_array_elements(p_items) e
    GROUP BY 1 ORDER BY 1
  LOOP
    SELECT * INTO v_producto
    FROM public.productos_kiosco
    WHERE id = v_item.producto_id
    FOR UPDATE;

    IF NOT FOUND OR NOT v_producto.activo THEN
      RETURN json_build_object('success', false, 'error', 'Producto no encontrado o inactivo');
    END IF;

    IF v_producto.stock < v_item.cantidad THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Stock insuficiente de ' || v_producto.nombre || '. Disponible: ' || v_producto.stock
      );
    END IF;
  END LOOP;

  -- Todo valido: descontar stock y registrar cada linea con nombre y precio actuales
  FOR v_item IN
    SELECT (e->>'producto_id')::UUID AS producto_id, SUM((e->>'cantidad')::INTEGER) AS cantidad
    FROM jsonb_array_elements(p_items) e
    GROUP BY 1 ORDER BY 1
  LOOP
    UPDATE public.productos_kiosco
    SET stock = stock - v_item.cantidad
    WHERE id = v_item.producto_id
    RETURNING * INTO v_producto;

    INSERT INTO public.ventas_kiosco (
      producto_id, nombre_producto, precio_venta, cantidad, tipo_pago, vendido_por, ticket_id
    ) VALUES (
      v_item.producto_id, v_producto.nombre, v_producto.precio, v_item.cantidad, p_tipo_pago, v_user_id, v_ticket_id
    );

    v_total := v_total + v_producto.precio * v_item.cantidad;
  END LOOP;

  SELECT json_agg(json_build_object(
    'producto', nombre_producto,
    'cantidad', cantidad,
    'precio', precio_venta
  ))
  INTO v_lineas
  FROM public.ventas_kiosco
  WHERE ticket_id = v_ticket_id;

  RETURN json_build_object(
    'success', true,
    'ticket_id', v_ticket_id,
    'total', v_total,
    'tipo_pago', p_tipo_pago,
    'lineas', v_lineas
  );
END;
$$;

-- =====================================================
-- FIN DE LA MIGRACION
-- =====================================================
SELECT 'Migracion kiosco modo venta completada' AS estado;
