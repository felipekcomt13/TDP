-- ============================================
-- MIGRACION: Verificar pagos que llegaron a las cuentas (modo "Verificar" en el historial)
-- ============================================
-- Cada fila de pagos_venta_kiosco es un pago de un ticket (efectivo, plin, yape, qr).
-- Al verificarlo se marca como llegado a la cuenta. Las ventas antiguas sin filas de
-- pagos no se pueden verificar (no tienen un pago propio que marcar).
-- Si el pago se corrige con editar_pagos_venta_kiosco, sus filas se reemplazan y
-- la verificacion vuelve a pendiente.
-- ============================================

-- 1. Columnas de verificacion
ALTER TABLE public.pagos_venta_kiosco
  ADD COLUMN IF NOT EXISTS verificado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verificado_at TIMESTAMPTZ;

-- 2. RPC para marcar / desmarcar un pago. Lo puede hacer admin y empleado (como las ventas).
CREATE OR REPLACE FUNCTION public.marcar_pago_verificado(
  p_pago_id UUID,
  p_verificado BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pago RECORD;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos');
  END IF;

  UPDATE public.pagos_venta_kiosco
  SET verificado = COALESCE(p_verificado, FALSE),
      verificado_at = CASE WHEN COALESCE(p_verificado, FALSE) THEN NOW() ELSE NULL END
  WHERE id = p_pago_id
  RETURNING * INTO v_pago;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Pago no encontrado');
  END IF;

  RETURN json_build_object(
    'success', true,
    'id', v_pago.id,
    'verificado', v_pago.verificado,
    'verificado_at', v_pago.verificado_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_pago_verificado(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_pago_verificado(UUID, BOOLEAN) TO authenticated;

SELECT 'Migracion verificar pagos completada' as estado;
