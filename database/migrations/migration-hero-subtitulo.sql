-- Agregar campos de subtitulo al hero_config
ALTER TABLE public.hero_config
ADD COLUMN IF NOT EXISTS subtitulo_texto TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subtitulo_activo BOOLEAN DEFAULT true;

-- Insertar el texto actual en la fila existente
UPDATE public.hero_config
SET subtitulo_texto = 'Torneo 3x3 — 21 de febrero. Categoría Sub 20 varones y mujeres. ¡Inscríbete ya!',
    subtitulo_activo = true
WHERE subtitulo_texto IS NULL;

-- RPC para actualizar subtitulo (evita CORS con PATCH directo)
CREATE OR REPLACE FUNCTION actualizar_hero_subtitulo(
  p_subtitulo_texto TEXT,
  p_subtitulo_activo BOOLEAN
) RETURNS void AS $$
BEGIN
  UPDATE public.hero_config
  SET subtitulo_texto = p_subtitulo_texto,
      subtitulo_activo = p_subtitulo_activo,
      updated_at = NOW()
  WHERE id = (SELECT id FROM public.hero_config LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
