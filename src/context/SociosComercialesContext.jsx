import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';

const SociosComercialesContext = createContext();

export const useSociosComerciales = () => {
  const context = useContext(SociosComercialesContext);
  if (!context) {
    throw new Error('useSociosComerciales debe usarse dentro de un SociosComercialesProvider');
  }
  return context;
};

export const SociosComercialesProvider = ({ children }) => {
  const [sociosComerciales, setSociosComerciales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarSocios();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('socios_comerciales_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'socios_comerciales' }, () => {
        cargarSocios(false);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const cargarSocios = async (mostrarLoading = true) => {
    try {
      if (mostrarLoading) setLoading(true);
      const { data, error } = await supabase
        .from('socios_comerciales')
        .select('*')
        .order('orden', { ascending: true });

      if (error) throw error;
      setSociosComerciales(data || []);
    } catch {
      // Error silenciado en producción
    } finally {
      if (mostrarLoading) setLoading(false);
    }
  };

  const agregarSocio = async (datos) => {
    // Obtener el orden máximo actual para poner al final
    const maxOrden = sociosComerciales.length > 0
      ? Math.max(...sociosComerciales.map(s => s.orden || 0))
      : 0;

    const { data, error } = await supabase
      .from('socios_comerciales')
      .insert([{
        nombre: datos.nombre,
        descripcion: datos.descripcion || null,
        beneficio: datos.beneficio,
        categoria: datos.categoria,
        logo_url: datos.logo_url || null,
        orden: maxOrden + 1,
        activo: true
      }])
      .select()
      .single();

    if (error) throw error;
    await cargarSocios();
    return data;
  };

  const editarSocio = async (id, datos) => {
    const { error } = await supabase.rpc('editar_socio_comercial', {
      p_id: id,
      p_nombre: datos.nombre,
      p_descripcion: datos.descripcion || null,
      p_beneficio: datos.beneficio,
      p_categoria: datos.categoria,
      p_logo_url: datos.logo_url || null
    });

    if (error) throw error;
    await cargarSocios(false);
  };

  const eliminarSocio = async (id) => {
    const { error } = await supabase
      .from('socios_comerciales')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await cargarSocios();
  };

  const toggleActivo = async (id) => {
    const { error } = await supabase.rpc('toggle_socio_comercial', {
      p_id: id
    });

    if (error) throw error;
    await cargarSocios(false);
  };

  const subirLogo = async (archivo) => {
    const extension = archivo.name.split('.').pop();
    const nombreArchivo = `socios-comerciales/${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from('images')
      .upload(nombreArchivo, archivo);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(nombreArchivo);

    return urlData.publicUrl;
  };

  const eliminarLogo = async (url) => {
    if (!url) return;
    // Extraer el path del archivo desde la URL pública
    const partes = url.split('/storage/v1/object/public/images/');
    if (partes.length < 2) return;
    const path = partes[1];

    await supabase.storage.from('images').remove([path]);
  };

  const reordenarBatch = async (nuevosOrden) => {
    // nuevosOrden: array de { id, orden }
    const prevSocios = [...sociosComerciales];

    // Actualización optimista
    const reordenados = nuevosOrden
      .sort((a, b) => a.orden - b.orden)
      .map(item => {
        const socio = sociosComerciales.find(s => s.id === item.id);
        return { ...socio, orden: item.orden };
      });
    setSociosComerciales(reordenados);

    try {
      const { error } = await supabase.rpc('reordenar_socios_comerciales_batch', {
        p_ids: nuevosOrden.map(item => item.id),
        p_ordenes: nuevosOrden.map(item => item.orden)
      });
      if (error) throw error;
    } catch {
      // Rollback
      setSociosComerciales(prevSocios);
      await cargarSocios(false);
    }
  };

  const value = {
    sociosComerciales,
    loading,
    cargarSocios,
    agregarSocio,
    editarSocio,
    eliminarSocio,
    toggleActivo,
    reordenarBatch,
    subirLogo,
    eliminarLogo
  };

  return (
    <SociosComercialesContext.Provider value={value}>
      {children}
    </SociosComercialesContext.Provider>
  );
};
