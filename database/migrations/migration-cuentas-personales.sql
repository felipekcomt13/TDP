-- Tabla para movimientos de cuentas personales (Tata, David, Giancarlo)
-- tipo: 'cargo' = se suma deuda (venta fiada, cargo manual)
--       'abono' = se resta deuda (pago para saldar)
CREATE TABLE IF NOT EXISTS public.movimientos_cuenta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cuenta TEXT NOT NULL CHECK (cuenta IN ('tata', 'david', 'giancarlo')),
  tipo TEXT NOT NULL CHECK (tipo IN ('cargo', 'abono')),
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  descripcion TEXT,
  venta_kiosco_id UUID REFERENCES public.ventas_kiosco(id) ON DELETE SET NULL,
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta_cuenta ON public.movimientos_cuenta(cuenta);
CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta_created ON public.movimientos_cuenta(created_at DESC);

-- RLS
ALTER TABLE public.movimientos_cuenta ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver y gestionar movimientos
CREATE POLICY "Admins pueden ver movimientos_cuenta"
  ON public.movimientos_cuenta FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins pueden insertar movimientos_cuenta"
  ON public.movimientos_cuenta FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Funcion para obtener saldo de una cuenta (total cargos - total abonos)
CREATE OR REPLACE FUNCTION obtener_saldo_cuenta(p_cuenta TEXT)
RETURNS DECIMAL AS $$
DECLARE
  v_cargos DECIMAL;
  v_abonos DECIMAL;
BEGIN
  SELECT COALESCE(SUM(monto), 0) INTO v_cargos
  FROM public.movimientos_cuenta
  WHERE cuenta = p_cuenta AND tipo = 'cargo';

  SELECT COALESCE(SUM(monto), 0) INTO v_abonos
  FROM public.movimientos_cuenta
  WHERE cuenta = p_cuenta AND tipo = 'abono';

  RETURN v_cargos - v_abonos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcion para registrar un movimiento
CREATE OR REPLACE FUNCTION registrar_movimiento_cuenta(
  p_cuenta TEXT,
  p_tipo TEXT,
  p_monto DECIMAL,
  p_descripcion TEXT DEFAULT NULL,
  p_venta_kiosco_id UUID DEFAULT NULL
) RETURNS jsonb AS $$
BEGIN
  INSERT INTO public.movimientos_cuenta (cuenta, tipo, monto, descripcion, venta_kiosco_id, registrado_por)
  VALUES (p_cuenta, p_tipo, p_monto, p_descripcion, p_venta_kiosco_id, auth.uid());

  RETURN jsonb_build_object(
    'success', true,
    'cuenta', p_cuenta,
    'tipo', p_tipo,
    'monto', p_monto,
    'saldo_actual', obtener_saldo_cuenta(p_cuenta)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
