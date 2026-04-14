-- ============================================
-- MIGRACION: Sistema de Caja (egresos manuales)
-- ============================================
-- Los ingresos de caja vienen de ventas_kiosco con tipo_pago = 'efectivo'
-- Esta tabla registra los egresos (pagos a proveedores, retiros, etc.)
-- Saldo caja = total efectivo ventas - total egresos
-- ============================================

-- 1. Tabla de egresos de caja
CREATE TABLE IF NOT EXISTS public.egresos_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  descripcion TEXT NOT NULL,
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egresos_caja_created ON public.egresos_caja(created_at DESC);

-- 2. RLS
ALTER TABLE public.egresos_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff pueden ver egresos_caja"
  ON public.egresos_caja FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff pueden insertar egresos_caja"
  ON public.egresos_caja FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Staff pueden eliminar egresos_caja"
  ON public.egresos_caja FOR DELETE
  USING (public.is_admin(auth.uid()));

-- 3. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.egresos_caja;

SELECT 'Migracion caja completada' as estado;
