-- ============================================
-- MIGRACION: Monto y tipo de pago en reservas
-- ============================================
-- Hasta ahora el precio de una reserva de cancha se calculaba y se mostraba
-- en pantalla (src/utils/preciosCalculator.js) pero nunca se guardaba: la
-- caja (migration-caja.sql) solo contaba ventas del kiosco en efectivo.
-- El alquiler de canchas -que es el ingreso más grande del negocio- era
-- invisible para la contabilidad.
--
-- Esto agrega:
--   - monto_total: el precio calculado y CONGELADO al momento de crear la
--     reserva, para que un cambio de tarifa a futuro no reescriba el
--     histórico de lo que ya se cobró.
--   - tipo_pago: cómo se pagó (efectivo/yape/plin/transferencia), editable
--     por el admin en cualquier momento desde el panel de reservas.
--
-- También mejora el mensaje de error de confirmar_reserva cuando el
-- EXCLUDE constraint de reservas_ocupacion (ver migration-seguridad-
-- reservas.sql) rechaza una confirmación por choque de horario.
-- ============================================

ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS monto_total NUMERIC(10,2);
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS tipo_pago TEXT;

ALTER TABLE public.reservas DROP CONSTRAINT IF EXISTS reservas_tipo_pago_check;
ALTER TABLE public.reservas
  ADD CONSTRAINT reservas_tipo_pago_check
  CHECK (tipo_pago IS NULL OR tipo_pago IN ('efectivo', 'yape', 'plin', 'transferencia'));

CREATE OR REPLACE FUNCTION public.confirmar_reserva(reserva_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios del creador, bypasea RLS
AS $$
DECLARE
  reserva_actual record;
  usuario_actual uuid;
  es_admin_usuario boolean;
  resultado json;
BEGIN
  usuario_actual := auth.uid();

  IF usuario_actual IS NULL THEN
    RAISE EXCEPTION 'No hay usuario autenticado. Debes estar logueado para confirmar reservas';
  END IF;

  SELECT * INTO reserva_actual
  FROM public.reservas
  WHERE id = reserva_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada con ID: %', reserva_id;
  END IF;

  SELECT public.is_admin(usuario_actual) INTO es_admin_usuario;

  IF NOT es_admin_usuario THEN
    RAISE EXCEPTION 'Solo los administradores pueden confirmar reservas';
  END IF;

  UPDATE public.reservas
  SET estado = 'confirmada',
      updated_at = now()
  WHERE id = reserva_id;

  SELECT json_build_object(
    'id', id,
    'nombre', nombre,
    'estado', estado,
    'fecha', fecha,
    'hora', hora,
    'mensaje', 'Reserva confirmada exitosamente'
  ) INTO resultado
  FROM public.reservas
  WHERE id = reserva_id;

  RETURN resultado;

EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Ese horario ya fue confirmado para otra reserva en esta cancha. Actualiza la lista e intenta de nuevo.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al confirmar reserva: %. Verifica los logs para más detalles', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirmar_reserva(uuid) TO authenticated, anon;

SELECT 'Migracion monto-reservas completada' as estado;
