import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';

const CanchasContext = createContext();

export const useCanchas = () => {
  const context = useContext(CanchasContext);
  if (!context) throw new Error('useCanchas debe usarse dentro de CanchasProvider');
  return context;
};

// Canchas por defecto (compatibles con datos existentes en la tabla reservas)
const CANCHAS_DEFAULT = [
  {
    id: 'principal',
    nombre: 'Cancha Principal',
    foto_url: null,
    costo_regular: 80,
    costo_socio: 70,
    estado: 'disponible',
    deportes: ['basket', 'voley']
  },
  {
    id: 'anexa-1',
    nombre: 'Cancha Anexa 1',
    foto_url: null,
    costo_regular: 50,
    costo_socio: 40,
    estado: 'disponible',
    deportes: ['basket', 'voley']
  },
  {
    id: 'anexa-2',
    nombre: 'Cancha Anexa 2',
    foto_url: null,
    costo_regular: 50,
    costo_socio: 40,
    estado: 'disponible',
    deportes: ['basket', 'voley']
  }
];

export const CanchasProvider = ({ children }) => {
  const [canchas, setCanchas] = useState(CANCHAS_DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCanchas();
  }, []);

  const cargarCanchas = async () => {
    try {
      const { data, error } = await supabase
        .from('canchas')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setCanchas(data);
      }
    } catch {
      // Usar canchas por defecto si la tabla no existe o hay error
    } finally {
      setLoading(false);
    }
  };

  const agregarCancha = async (cancha) => {
    const { data, error } = await supabase
      .from('canchas')
      .insert([cancha])
      .select()
      .single();

    if (error) throw error;
    await cargarCanchas();
    return data;
  };

  const editarCancha = async (id, datos) => {
    const { error } = await supabase.rpc('editar_cancha', {
      p_id: id,
      p_nombre: datos.nombre,
      p_foto_url: datos.foto_url || null,
      p_costo_regular: datos.costo_regular,
      p_costo_socio: datos.costo_socio || null,
      p_estado: datos.estado,
      p_deportes: datos.deportes
    });

    if (error) throw error;
    await cargarCanchas();
  };

  const subirFotoCancha = async (archivo) => {
    const extension = archivo.name.split('.').pop();
    const nombreArchivo = `canchas/${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from('images')
      .upload(nombreArchivo, archivo);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(nombreArchivo);

    return urlData.publicUrl;
  };

  const eliminarFotoCancha = async (url) => {
    if (!url) return;
    const partes = url.split('/storage/v1/object/public/images/');
    if (partes.length < 2) return;
    const path = partes[1];
    await supabase.storage.from('images').remove([path]);
  };

  const obtenerCanchasPorDeporte = (deporte) => {
    return canchas.filter(c =>
      c.estado === 'disponible' &&
      (c.deportes || []).includes(deporte)
    );
  };

  return (
    <CanchasContext.Provider value={{
      canchas,
      loading,
      cargarCanchas,
      agregarCancha,
      editarCancha,
      obtenerCanchasPorDeporte,
      subirFotoCancha,
      eliminarFotoCancha
    }}>
      {children}
    </CanchasContext.Provider>
  );
};
