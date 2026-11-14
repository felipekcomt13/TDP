-- ============================================
-- MIGRACION: Editar el metodo de pago de una venta ya registrada
-- ============================================
-- Solo el rol 'admin' (no 'empleado') puede corregir como se pago una venta.
-- Se corrige el ticket completo: todas las lineas del ticket comparten los mismos pagos.
-- Los montos por metodo, el desglose y la caja se calculan desde pagos_venta_kiosco
-- (o desde ventas_kiosco.tipo_pago en ventas antiguas), asi que basta con reescribirlos.
-- Cada edicion queda registrada en auditoria_pagos_venta (pestaña Auditoria, solo admin).
--
-- p_pagos: [{"tipo_pago": "efectivo", "monto": 10.50}, {"tipo_pago": "yape", "monto": 4.50}]
-- La suma debe ser igual al total del ticket. No se toca stock ni precios.
-- ============================================

-- 1. Registro de ediciones de pago. Nadie inserta ni borra a mano: solo la funcion.
CREATE TABLE IF NOT EXISTS public.auditoria_pagos_venta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL,
  detalle TEXT NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  pagos_anteriores JSONB NOT NULL,
  pagos_nuevos JSONB NOT NULL,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_pagos_venta_created ON public.auditoria_pagos_venta(created_at DESC);

ALTER TABLE public.auditoria_pagos_venta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins pueden ver auditoria_pagos_venta" ON public.auditoria_pagos_venta;
CREATE POLICY "Admins pueden ver auditoria_pagos_venta"
  ON public.auditoria_pagos_venta FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.auditoria_pagos_venta;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. RPC
CREATE OR REPLACE FUNCTION public.editar_pagos_venta_kiosco(
  p_venta_id UUID,
  p_pagos JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta RECORD;
  v_ticket_id UUID;
  v_total NUMERIC(10,2);
  v_suma_pagos NUMERIC(10,2);
  v_metodos INTEGER;
  v_tipo_venta TEXT;
  v_pago RECORD;
  v_pagos_nuevos JSON;
  v_anteriores JSONB;
  v_detalle TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Solo un administrador puede editar el pago de una venta');
  END IF;

  SELECT * INTO v_venta FROM public.ventas_kiosco WHERE id = p_venta_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Venta no encontrada');
  END IF;

  IF p_pagos IS NULL OR jsonb_typeof(p_pagos) <> 'array' OR jsonb_array_length(p_pagos) = 0 THEN
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

  -- Las ventas sueltas antiguas no tienen ticket: se les crea uno propio para poder
  -- guardar sus pagos.
  v_ticket_id := v_venta.ticket_id;
  IF v_ticket_id IS NULL THEN
    v_ticket_id := gen_random_uuid();
  END IF;

  -- Bloquea las lineas del ticket para que dos ediciones simultaneas no se pisen
  PERFORM 1 FROM public.ventas_kiosco
  WHERE (v_venta.ticket_id IS NOT NULL AND ticket_id = v_ticket_id) OR id = p_venta_id
  FOR UPDATE;

  SELECT COALESCE(SUM(precio_venta * cantidad), 0) INTO v_total
  FROM public.ventas_kiosco
  WHERE (v_venta.ticket_id IS NOT NULL AND ticket_id = v_ticket_id) OR id = p_venta_id;

  SELECT COALESCE(SUM((e->>'monto')::NUMERIC), 0) INTO v_suma_pagos
  FROM jsonb_array_elements(p_pagos) e;

  IF ABS(v_suma_pagos - v_total) > 0.01 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Los montos de pago (S/ ' || v_suma_pagos || ') no suman el total (S/ ' || v_total || ')'
    );
  END IF;

  SELECT COUNT(DISTINCT e->>'tipo_pago') INTO v_metodos FROM jsonb_array_elements(p_pagos) e;
  IF v_metodos = 1 THEN
    SELECT e->>'tipo_pago' INTO v_tipo_venta FROM jsonb_array_elements(p_pagos) e LIMIT 1;
  ELSE
    v_tipo_venta := 'mixto';
  END IF;

  -- Para la auditoria: como estaba pagada antes (ventas antiguas sin filas de pagos
  -- usan su tipo_pago) y que productos eran
  SELECT jsonb_agg(jsonb_build_object('tipo_pago', tipo_pago, 'monto', monto)) INTO v_anteriores
  FROM public.pagos_venta_kiosco WHERE ticket_id = v_ticket_id;
  IF v_anteriores IS NULL THEN
    v_anteriores := jsonb_build_array(jsonb_build_object('tipo_pago', v_venta.tipo_pago, 'monto', v_total));
  END IF;

  SELECT string_agg(nombre_producto || CASE WHEN cantidad > 1 THEN ' x' || cantidad ELSE '' END, ', ')
  INTO v_detalle
  FROM public.ventas_kiosco
  WHERE (v_venta.ticket_id IS NOT NULL AND ticket_id = v_ticket_id) OR id = p_venta_id;

  UPDATE public.ventas_kiosco
  SET tipo_pago = v_tipo_venta, ticket_id = v_ticket_id
  WHERE (v_venta.ticket_id IS NOT NULL AND ticket_id = v_ticket_id) OR id = p_venta_id;

  DELETE FROM public.pagos_venta_kiosco WHERE ticket_id = v_ticket_id;

  FOR v_pago IN
    SELECT e->>'tipo_pago' AS tipo_pago, SUM((e->>'monto')::NUMERIC) AS monto
    FROM jsonb_array_elements(p_pagos) e
    GROUP BY 1
  LOOP
    INSERT INTO public.pagos_venta_kiosco (ticket_id, tipo_pago, monto)
    VALUES (v_ticket_id, v_pago.tipo_pago, v_pago.monto);
  END LOOP;

  SELECT json_agg(json_build_object('id', id, 'ticket_id', ticket_id, 'tipo_pago', tipo_pago, 'monto', monto, 'created_at', created_at))
  INTO v_pagos_nuevos
  FROM public.pagos_venta_kiosco
  WHERE ticket_id = v_ticket_id;

  INSERT INTO public.auditoria_pagos_venta (ticket_id, detalle, total, pagos_anteriores, pagos_nuevos, usuario_id)
  SELECT v_ticket_id, v_detalle, v_total, v_anteriores,
         jsonb_agg(jsonb_build_object('tipo_pago', tipo_pago, 'monto', monto)), auth.uid()
  FROM public.pagos_venta_kiosco
  WHERE ticket_id = v_ticket_id;

  RETURN json_build_object(
    'success', true,
    'ticket_id', v_ticket_id,
    'total', v_total,
    'tipo_pago', v_tipo_venta,
    'pagos', v_pagos_nuevos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.editar_pagos_venta_kiosco(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.editar_pagos_venta_kiosco(UUID, JSONB) TO authenticated;

SELECT 'Migracion editar pago de venta completada' as estado;
