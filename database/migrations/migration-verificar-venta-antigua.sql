-- ============================================
-- MIGRACION: Verificar pagos también de ventas antiguas
-- ============================================
-- Reemplaza marcar_pago_verificado (migration-verificar-pagos.sql) por una función
-- que recibe la venta y el método. Si la venta es antigua (sin ticket ni filas de pagos),
-- crea su ticket y su pago con el total de la venta, y luego marca el pago.
-- ============================================

DROP FUNCTION IF EXISTS public.marcar_pago_verificado(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.verificar_pago_venta_kiosco(
  p_venta_id UUID,
  p_tipo_pago TEXT,
  p_verificado BOOLEAN
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
  v_verificado BOOLEAN := COALESCE(p_verificado, FALSE);
  v_pagos JSON;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos');
  END IF;

  IF p_tipo_pago IS NULL OR p_tipo_pago NOT IN ('efectivo', 'plin', 'yape', 'qr') THEN
    RETURN json_build_object('success', false, 'error', 'Este método de pago no se puede verificar');
  END IF;

  SELECT * INTO v_venta FROM public.ventas_kiosco WHERE id = p_venta_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Venta no encontrada');
  END IF;

  v_ticket_id := v_venta.ticket_id;

  IF v_ticket_id IS NULL THEN
    -- Venta antigua: solo puede tener un pago, con su mismo método y el total de la línea
    IF v_venta.tipo_pago IS DISTINCT FROM p_tipo_pago THEN
      RETURN json_build_object('success', false, 'error', 'Ese método no corresponde a la venta');
    END IF;

    v_total := v_venta.precio_venta * v_venta.cantidad;
    v_ticket_id := gen_random_uuid();

    UPDATE public.ventas_kiosco SET ticket_id = v_ticket_id WHERE id = p_venta_id;
    INSERT INTO public.pagos_venta_kiosco (ticket_id, tipo_pago, monto)
    VALUES (v_ticket_id, p_tipo_pago, v_total);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.pagos_venta_kiosco WHERE ticket_id = v_ticket_id AND tipo_pago = p_tipo_pago
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Pago no encontrado');
  END IF;

  UPDATE public.pagos_venta_kiosco
  SET verificado = v_verificado,
      verificado_at = CASE WHEN v_verificado THEN NOW() ELSE NULL END
  WHERE ticket_id = v_ticket_id AND tipo_pago = p_tipo_pago;

  SELECT json_agg(json_build_object(
    'id', id, 'ticket_id', ticket_id, 'tipo_pago', tipo_pago, 'monto', monto,
    'created_at', created_at, 'verificado', verificado, 'verificado_at', verificado_at
  ))
  INTO v_pagos
  FROM public.pagos_venta_kiosco
  WHERE ticket_id = v_ticket_id;

  RETURN json_build_object('success', true, 'ticket_id', v_ticket_id, 'pagos', v_pagos);
END;
$$;

REVOKE ALL ON FUNCTION public.verificar_pago_venta_kiosco(UUID, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verificar_pago_venta_kiosco(UUID, TEXT, BOOLEAN) TO authenticated;

SELECT 'Migracion verificar pagos de ventas antiguas completada' as estado;
