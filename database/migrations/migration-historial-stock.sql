-- ============================================
-- MIGRACION: Historial de movimientos de stock
-- ============================================
-- Registra automaticamente cada cambio de stock de productos_kiosco (ajustes
-- manuales, reposiciones, ventas y alta de producto) con el stock anterior,
-- el nuevo y quien lo hizo. Va en un trigger para que quede registrado venga
-- de donde venga el cambio (editar producto, venta, SQL, etc.).
-- ============================================

-- 1. Tabla
CREATE TABLE IF NOT EXISTS public.movimientos_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID REFERENCES public.productos_kiosco(id) ON DELETE SET NULL,
  nombre_producto TEXT NOT NULL,
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  diferencia INTEGER NOT NULL,
  es_alta BOOLEAN NOT NULL DEFAULT FALSE,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_stock_created ON public.movimientos_stock(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_producto ON public.movimientos_stock(producto_id);

-- 2. RLS: solo el staff lo ve. Nadie inserta ni borra a mano: solo el trigger.
ALTER TABLE public.movimientos_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff pueden ver movimientos_stock" ON public.movimientos_stock;
CREATE POLICY "Staff pueden ver movimientos_stock"
  ON public.movimientos_stock FOR SELECT
  USING (public.is_admin(auth.uid()));

-- 3. Trigger
CREATE OR REPLACE FUNCTION public.registrar_movimiento_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.movimientos_stock (producto_id, nombre_producto, stock_anterior, stock_nuevo, diferencia, es_alta, usuario_id)
    VALUES (NEW.id, NEW.nombre, 0, NEW.stock, NEW.stock, TRUE, auth.uid());
  ELSIF NEW.stock IS DISTINCT FROM OLD.stock THEN
    INSERT INTO public.movimientos_stock (producto_id, nombre_producto, stock_anterior, stock_nuevo, diferencia, es_alta, usuario_id)
    VALUES (NEW.id, NEW.nombre, OLD.stock, NEW.stock, NEW.stock - OLD.stock, FALSE, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_movimiento_stock ON public.productos_kiosco;
CREATE TRIGGER trg_movimiento_stock
  AFTER INSERT OR UPDATE OF stock ON public.productos_kiosco
  FOR EACH ROW EXECUTE FUNCTION public.registrar_movimiento_stock();

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimientos_stock;

SELECT 'Migracion historial de stock completada' as estado;
