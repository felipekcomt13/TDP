-- =====================================================
-- MIGRACION: Sistema de Kiosco (Inventario + Ventas)
-- =====================================================
-- Ejecutar este script en Supabase SQL Editor
-- =====================================================

-- 1. Crear tabla de productos del kiosco
CREATE TABLE IF NOT EXISTS public.productos_kiosco (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  codigo_barras TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear tabla de ventas del kiosco
CREATE TABLE IF NOT EXISTS public.ventas_kiosco (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID REFERENCES public.productos_kiosco(id) ON DELETE SET NULL,
  nombre_producto TEXT NOT NULL,
  precio_venta DECIMAL(10,2) NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  vendido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear indices
CREATE INDEX IF NOT EXISTS idx_productos_kiosco_activo ON public.productos_kiosco(activo);
CREATE INDEX IF NOT EXISTS idx_productos_kiosco_nombre ON public.productos_kiosco(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_kiosco_codigo_barras ON public.productos_kiosco(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_ventas_kiosco_producto_id ON public.ventas_kiosco(producto_id);
CREATE INDEX IF NOT EXISTS idx_ventas_kiosco_created_at ON public.ventas_kiosco(created_at);

-- 4. Habilitar RLS
ALTER TABLE public.productos_kiosco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_kiosco ENABLE ROW LEVEL SECURITY;

-- 5. Politicas RLS para productos_kiosco (solo admins)

DROP POLICY IF EXISTS "Admins pueden ver productos kiosco" ON public.productos_kiosco;
CREATE POLICY "Admins pueden ver productos kiosco"
  ON public.productos_kiosco
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins pueden insertar productos kiosco" ON public.productos_kiosco;
CREATE POLICY "Admins pueden insertar productos kiosco"
  ON public.productos_kiosco
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins pueden actualizar productos kiosco" ON public.productos_kiosco;
CREATE POLICY "Admins pueden actualizar productos kiosco"
  ON public.productos_kiosco
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins pueden eliminar productos kiosco" ON public.productos_kiosco;
CREATE POLICY "Admins pueden eliminar productos kiosco"
  ON public.productos_kiosco
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 6. Politicas RLS para ventas_kiosco (solo admins, solo lectura e insercion)

DROP POLICY IF EXISTS "Admins pueden ver ventas kiosco" ON public.ventas_kiosco;
CREATE POLICY "Admins pueden ver ventas kiosco"
  ON public.ventas_kiosco
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins pueden insertar ventas kiosco" ON public.ventas_kiosco;
CREATE POLICY "Admins pueden insertar ventas kiosco"
  ON public.ventas_kiosco
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 7. Trigger para updated_at en productos
CREATE OR REPLACE FUNCTION update_productos_kiosco_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_productos_kiosco_updated_at ON public.productos_kiosco;
CREATE TRIGGER trigger_update_productos_kiosco_updated_at
  BEFORE UPDATE ON public.productos_kiosco
  FOR EACH ROW
  EXECUTE FUNCTION update_productos_kiosco_updated_at();

-- 8. Funcion RPC: Registrar venta (descuenta stock atomicamente)
CREATE OR REPLACE FUNCTION registrar_venta_kiosco(
  p_producto_id UUID,
  p_cantidad INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_producto RECORD;
  v_venta_id UUID;
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();

  -- Verificar que es admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_admin_id AND role = 'admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'No tienes permisos de administrador');
  END IF;

  -- Obtener producto con bloqueo para evitar race conditions
  SELECT * INTO v_producto
  FROM public.productos_kiosco
  WHERE id = p_producto_id AND activo = true
  FOR UPDATE;

  IF v_producto IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Producto no encontrado o inactivo');
  END IF;

  IF v_producto.stock < p_cantidad THEN
    RETURN json_build_object('success', false, 'error', 'Stock insuficiente. Disponible: ' || v_producto.stock);
  END IF;

  -- Descontar stock
  UPDATE public.productos_kiosco
  SET stock = stock - p_cantidad
  WHERE id = p_producto_id;

  -- Registrar venta con nombre y precio al momento de la venta
  INSERT INTO public.ventas_kiosco (
    producto_id,
    nombre_producto,
    precio_venta,
    cantidad,
    vendido_por
  ) VALUES (
    p_producto_id,
    v_producto.nombre,
    v_producto.precio,
    p_cantidad,
    v_admin_id
  )
  RETURNING id INTO v_venta_id;

  RETURN json_build_object(
    'success', true,
    'venta_id', v_venta_id,
    'producto', v_producto.nombre,
    'precio', v_producto.precio,
    'cantidad', p_cantidad,
    'stock_restante', v_producto.stock - p_cantidad
  );
END;
$$;

-- 9. Funcion RPC: Editar producto kiosco
CREATE OR REPLACE FUNCTION editar_producto_kiosco(
  p_id UUID,
  p_nombre TEXT,
  p_precio DECIMAL,
  p_stock INTEGER,
  p_codigo_barras TEXT
) RETURNS void AS $$
BEGIN
  UPDATE public.productos_kiosco
  SET nombre = p_nombre,
      precio = p_precio,
      stock = p_stock,
      codigo_barras = p_codigo_barras
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.productos_kiosco;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ventas_kiosco;

-- =====================================================
-- MIGRACION 2: Agregar imagen a productos
-- =====================================================

-- 11. Agregar columna imagen_url a productos_kiosco
ALTER TABLE public.productos_kiosco ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- 12. Actualizar funcion RPC editar_producto_kiosco para incluir imagen
CREATE OR REPLACE FUNCTION editar_producto_kiosco(
  p_id UUID,
  p_nombre TEXT,
  p_precio DECIMAL,
  p_stock INTEGER,
  p_codigo_barras TEXT,
  p_imagen_url TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.productos_kiosco
  SET nombre = p_nombre,
      precio = p_precio,
      stock = p_stock,
      codigo_barras = p_codigo_barras,
      imagen_url = p_imagen_url
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRACION 3: Drag-and-drop (campo orden + RPC reordenar)
-- =====================================================

-- 13. Agregar columna orden a productos_kiosco
ALTER TABLE public.productos_kiosco ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;

-- 14. Inicializar orden de productos existentes
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY nombre) as rn
  FROM public.productos_kiosco
)
UPDATE public.productos_kiosco SET orden = numbered.rn
FROM numbered WHERE productos_kiosco.id = numbered.id;

-- 15. RPC para reordenar productos en batch
CREATE OR REPLACE FUNCTION reordenar_productos_kiosco_batch(
  p_ids UUID[],
  p_ordenes INTEGER[]
) RETURNS void AS $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..array_length(p_ids, 1) LOOP
    UPDATE public.productos_kiosco
    SET orden = p_ordenes[i]
    WHERE id = p_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIN DE LA MIGRACION
-- =====================================================
