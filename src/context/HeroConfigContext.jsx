import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';

const HeroConfigContext = createContext();

export const useHeroConfig = () => {
  const context = useContext(HeroConfigContext);
  if (!context) {
    throw new Error('useHeroConfig debe usarse dentro de un HeroConfigProvider');
  }
  return context;
};

export const HeroConfigProvider = ({ children }) => {
  const [heroConfig, setHeroConfig] = useState({ video_url: null, video_activo: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarHeroConfig();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('hero_config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hero_config' }, () => {
        cargarHeroConfig(false);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const cargarHeroConfig = async (mostrarLoading = true) => {
    try {
      if (mostrarLoading) setLoading(true);
      const { data, error } = await supabase
        .from('hero_config')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      if (data) setHeroConfig(data);
    } catch {
      // Error silenciado en producción
    } finally {
      if (mostrarLoading) setLoading(false);
    }
  };

  const actualizarHeroConfig = async (video_url, video_activo) => {
    const { error } = await supabase.rpc('actualizar_hero_config', {
      p_video_url: video_url,
      p_video_activo: video_activo
    });

    if (error) throw error;
    await cargarHeroConfig(false);
  };

  const subirVideo = async (archivo) => {
    const extension = archivo.name.split('.').pop();
    const nombreArchivo = `hero-videos/${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from('images')
      .upload(nombreArchivo, archivo);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(nombreArchivo);

    return urlData.publicUrl;
  };

  const eliminarVideo = async (url) => {
    if (!url) return;
    const partes = url.split('/storage/v1/object/public/images/');
    if (partes.length < 2) return;
    const path = partes[1];

    await supabase.storage.from('images').remove([path]);
  };

  const value = {
    heroConfig,
    loading,
    cargarHeroConfig,
    actualizarHeroConfig,
    subirVideo,
    eliminarVideo
  };

  return (
    <HeroConfigContext.Provider value={value}>
      {children}
    </HeroConfigContext.Provider>
  );
};
