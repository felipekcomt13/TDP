-- ============================================
-- MIGRACION: Pago con varios metodos en el kiosco
-- ============================================
-- Metodos validos: efectivo, plin, yape, qr.
-- Una venta (ticket) puede pagarse con mas de un metodo; cada metodo guarda
-- su monto en pagos_venta_kiosco y la suma debe ser igual al total.
-- ventas_kiosco.tipo_pago queda con el metodo si fue uno solo, o 'mixto'.
-- Las ventas anteriores no tienen filas en pagos_venta_kiosco: se siguen
-- leyendo por su tipo_pago.
-- ============================================

-- 1. Pagos por ticket
CREATE TABLE IF NOT EXISTS public.pagos_venta_kiosco (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL,
  tipo_pago TEXT NOT NULL CHECK (tipo_pago IN ('efectivo', 'plin', 'yape', 'qr')),
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_venta_kiosco_ticket ON public.pagos_venta_kiosco(ticket_id);
CREATE INDEX IF NOT EXISTS idx_pagos_venta_kiosco_created ON public.pagos_venta_kiosco(created_at DESC);

ALTER TABLE public.pagos_venta_kiosco ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff pueden ver pagos_venta_kiosco" ON public.pagos_venta_kiosco;
CREATE POLICY "Staff pueden ver pagos_venta_kiosco"
  ON public.pagos_venta_kiosco FOR SELECT
  USING (public.is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.pagos_venta_kiosco;

-- 2. RPC de venta por lote con pagos
-- p_pagos: [{"tipo_pago": "efectivo", "monto": 10.50}, {"tipo_pago": "yape", "monto": 4.50}]
-- Si viene NULL se usa p_tipo_pago por el total.
DROP FUNCTION IF EXISTS public.registrar_venta_kiosco_lote(JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.registrar_venta_kiosco_lote(
  p_items JSONB,
  p_tipo_pago TEXT DEFAULT 'efectivo',
  p_pagos JSONB DEFAULT NULL
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
  v_pago RECORD;
  v_producto RECORD;
  v_total NUMERIC(10,2) := 0;
  v_suma_pagos NUMERIC(10,2);
  v_metodos INTEGER;
  v_tipo_venta TEXT;
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

  -- Validar todo antes de tocar nada (productos, stock y total). Se bloquea en
  -- orden de id para evitar deadlocks entre dos cajas vendiendo a la vez.
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

    v_total := v_total + v_producto.precio * v_item.cantidad;
  END LOOP;

  -- Pagos: por defecto, un solo metodo por el total
  IF p_pagos IS NULL THEN
    p_pagos := jsonb_build_array(jsonb_build_object('tipo_pago', p_tipo_pago, 'monto', v_total));
  END IF;

  IF jsonb_typeof(p_pagos) <> 'array' OR jsonb_array_length(p_pagos) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Indica como se paga la venta');
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_pagos) e
    WHERE (e->>'tipo_pago') IS NULL
       OR (e->>'tipo_pago') NOT IN ('efectivo', 'plin', 'yape', 'qr')
       OR (e->>'monto') IS NULL
       OR (e->>'monto')::NUMERIC <= 0
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Metodo de pago o monto invalido');
  END IF;

  SELECT COALESCE(SUM((e->>'monto')::NUMERIC), 0) INTO v_suma_pagos
  FROM jsonb_array_elements(p_pagos) e;

  IF ABS(v_suma_pagos - v_total) > 0.01 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Los montos de pago (S/ ' || v_suma_pagos || ') no suman el total (S/ ' || v_total || ')'
    );
  END IF;

  -- Todo valido: descontar stock y registrar cada linea con nombre y precio actuales
  SELECT COUNT(DISTINCT e->>'tipo_pago') INTO v_metodos FROM jsonb_array_elements(p_pagos) e;
  IF v_metodos = 1 THEN
    SELECT e->>'tipo_pago' INTO v_tipo_venta FROM jsonb_array_elements(p_pagos) e LIMIT 1;
  ELSE
    v_tipo_venta := 'mixto';
  END IF;

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
      v_item.producto_id, v_producto.nombre, v_producto.precio, v_item.cantidad, v_tipo_venta, v_user_id, v_ticket_id
    );
  END LOOP;

  FOR v_pago IN
    SELECT e->>'tipo_pago' AS tipo_pago, SUM((e->>'monto')::NUMERIC) AS monto
    FROM jsonb_array_elements(p_pagos) e
    GROUP BY 1
  LOOP
    INSERT INTO public.pagos_venta_kiosco (ticket_id, tipo_pago, monto)
    VALUES (v_ticket_id, v_pago.tipo_pago, v_pago.monto);
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
    'tipo_pago', v_tipo_venta,
    'lineas', v_lineas
  );
END;
$$;

SELECT 'Migracion pagos multiples completada' as estado;
