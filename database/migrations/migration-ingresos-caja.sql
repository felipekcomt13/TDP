-- ============================================
-- MIGRACION: Ingresos manuales de caja
-- ============================================
-- Contraparte de egresos_caja: dinero en efectivo que entra a la caja por un
-- motivo que no es una venta (aporte, cambio, devolucion, etc.).
-- Saldo caja = fondo + efectivo de ventas + ingresos - egresos
-- ============================================

CREATE TABLE IF NOT EXISTS public.ingresos_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  descripcion TEXT NOT NULL,
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingresos_caja_created ON public.ingresos_caja(created_at DESC);

ALTER TABLE public.ingresos_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff pueden ver ingresos_caja" ON public.ingresos_caja;
CREATE POLICY "Staff pueden ver ingresos_caja"
  ON public.ingresos_caja FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff pueden insertar ingresos_caja" ON public.ingresos_caja;
CREATE POLICY "Staff pueden insertar ingresos_caja"
  ON public.ingresos_caja FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff pueden eliminar ingresos_caja" ON public.ingresos_caja;
CREATE POLICY "Staff pueden eliminar ingresos_caja"
  ON public.ingresos_caja FOR DELETE
  USING (public.is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.ingresos_caja;

SELECT 'Migracion ingresos caja completada' as estado;
