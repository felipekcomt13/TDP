-- Tabla de configuración del hero (una sola fila)
CREATE TABLE IF NOT EXISTS public.hero_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url TEXT,
  video_activo BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar fila inicial
INSERT INTO public.hero_config (video_url, video_activo)
VALUES (null, false);

-- RLS
ALTER TABLE public.hero_config ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer (la landing es pública)
CREATE POLICY "Lectura pública de hero_config"
  ON public.hero_config FOR SELECT USING (true);

-- Solo admins pueden actualizar
CREATE POLICY "Admins pueden actualizar hero_config"
  ON public.hero_config FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- RPC para actualizar (evita problemas con RLS en updates directos)
CREATE OR REPLACE FUNCTION actualizar_hero_config(
  p_video_url TEXT,
  p_video_activo BOOLEAN
) RETURNS void AS $$
BEGIN
  UPDATE public.hero_config
  SET video_url = p_video_url,
      video_activo = p_video_activo,
      updated_at = NOW()
  WHERE id = (SELECT id FROM public.hero_config LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
