-- =====================================================
-- MIGRACION: RPC para editar cancha (evita CORS con PATCH)
-- =====================================================

DROP FUNCTION IF EXISTS public.editar_cancha(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.editar_cancha(
  p_id TEXT,
  p_nombre TEXT,
  p_foto_url TEXT DEFAULT NULL,
  p_costo_regular INTEGER DEFAULT 50,
  p_costo_socio INTEGER DEFAULT NULL,
  p_estado TEXT DEFAULT 'disponible',
  p_deportes TEXT[] DEFAULT ARRAY['basket','voley']
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.canchas
  SET nombre = p_nombre,
      foto_url = p_foto_url,
      costo_regular = p_costo_regular,
      costo_socio = p_costo_socio,
      estado = p_estado,
      deportes = p_deportes
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.editar_cancha(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT[]) TO authenticated;
