-- ============================================
-- MIGRACION: Registro de ingresos y egresos de caja eliminados
-- ============================================
-- Cada vez que se borra una fila de ingresos_caja o egresos_caja se guarda una
-- copia en auditoria_eliminaciones_caja (con quien la borro). Va en un trigger
-- para que quede registrado venga de donde venga el borrado (app, SQL, etc.).
-- Se muestra en la pestaña Auditoria, solo para admin.
-- ============================================

CREATE TABLE IF NOT EXISTS public.auditoria_eliminaciones_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  descripcion TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  registrado_por UUID,
  fecha_original TIMESTAMPTZ,
  eliminado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_elim_caja_created ON public.auditoria_eliminaciones_caja(created_at DESC);

-- Nadie inserta ni borra a mano: solo el trigger. Solo el admin lo ve.
ALTER TABLE public.auditoria_eliminaciones_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins pueden ver auditoria_eliminaciones_caja" ON public.auditoria_eliminaciones_caja;
CREATE POLICY "Admins pueden ver auditoria_eliminaciones_caja"
  ON public.auditoria_eliminaciones_caja FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.auditoria_eliminaciones_caja;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.registrar_eliminacion_caja()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.auditoria_eliminaciones_caja (tipo, descripcion, monto, registrado_por, fecha_original, eliminado_por)
  VALUES (
    CASE TG_TABLE_NAME WHEN 'ingresos_caja' THEN 'ingreso' ELSE 'egreso' END,
    OLD.descripcion, OLD.monto, OLD.registrado_por, OLD.created_at, auth.uid()
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_eliminacion_ingreso ON public.ingresos_caja;
CREATE TRIGGER trg_eliminacion_ingreso
  BEFORE DELETE ON public.ingresos_caja
  FOR EACH ROW EXECUTE FUNCTION public.registrar_eliminacion_caja();

DROP TRIGGER IF EXISTS trg_eliminacion_egreso ON public.egresos_caja;
CREATE TRIGGER trg_eliminacion_egreso
  BEFORE DELETE ON public.egresos_caja
  FOR EACH ROW EXECUTE FUNCTION public.registrar_eliminacion_caja();

SELECT 'Migracion auditoria eliminaciones de caja completada' as estado;
