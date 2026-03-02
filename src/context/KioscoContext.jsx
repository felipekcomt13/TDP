import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';

const KioscoContext = createContext();

export const useKiosco = () => {
  const context = useContext(KioscoContext);
  if (!context) {
    throw new Error('useKiosco debe usarse dentro de un KioscoProvider');
  }
  return context;
};

export const KioscoProvider = ({ children }) => {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingVentas, setLoadingVentas] = useState(true);

  useEffect(() => {
    cargarProductos();
    cargarVentas();

    const productosSubscription = supabase
      .channel('productos_kiosco_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos_kiosco' }, () => {
        cargarProductos(false);
      })
      .subscribe();

    const ventasSubscription = supabase
      .channel('ventas_kiosco_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas_kiosco' }, () => {
        cargarVentas(false);
      })
      .subscribe();

    return () => {
      productosSubscription.unsubscribe();
      ventasSubscription.unsubscribe();
    };
  }, []);

  // --- PRODUCTOS ---

  const cargarProductos = async (mostrarLoading = true) => {
    try {
      if (mostrarLoading) setLoadingProductos(true);
      const { data, error } = await supabase
        .from('productos_kiosco')
        .select('*')
        .order('orden', { ascending: true });

      if (error) throw error;
      setProductos(data || []);
    } catch {
      // Silenciado - RLS deniega para no-admins
    } finally {
      if (mostrarLoading) setLoadingProductos(false);
    }
  };

  const agregarProducto = async (datos) => {
    const { data, error } = await supabase
      .from('productos_kiosco')
      .insert([{
        nombre: datos.nombre,
        precio: datos.precio,
        stock: datos.stock,
        codigo_barras: datos.codigoBarras || null,
        imagen_url: datos.imagenUrl || null,
        orden: productos.length + 1,
        activo: true
      }])
      .select()
      .single();

    if (error) throw error;
    await cargarProductos(false);
    return data;
  };

  const editarProducto = async (id, datos) => {
    const { error } = await supabase.rpc('editar_producto_kiosco', {
      p_id: id,
      p_nombre: datos.nombre,
      p_precio: datos.precio,
      p_stock: datos.stock,
      p_codigo_barras: datos.codigoBarras || null,
      p_imagen_url: datos.imagenUrl || null
    });

    if (error) throw error;
    await cargarProductos(false);
  };

  const eliminarProducto = async (id) => {
    const { error } = await supabase
      .from('productos_kiosco')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await cargarProductos(false);
  };

  // --- REORDENAR ---

  const reordenarBatch = async (nuevosOrden) => {
    const prevProductos = [...productos];

    // Actualizacion optimista
    const reordenados = nuevosOrden
      .sort((a, b) => a.orden - b.orden)
      .map(item => {
        const producto = productos.find(p => p.id === item.id);
        return { ...producto, orden: item.orden };
      });
    setProductos(reordenados);

    try {
      const { error } = await supabase.rpc('reordenar_productos_kiosco_batch', {
        p_ids: nuevosOrden.map(item => item.id),
        p_ordenes: nuevosOrden.map(item => item.orden)
      });
      if (error) throw error;
    } catch {
      // Rollback si falla
      setProductos(prevProductos);
      await cargarProductos(false);
    }
  };

  // --- IMAGENES ---

  const subirImagenProducto = async (archivo) => {
    const extension = archivo.name.split('.').pop();
    const nombreArchivo = `productos/${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from('images')
      .upload(nombreArchivo, archivo);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(nombreArchivo);

    return urlData.publicUrl;
  };

  const eliminarImagenProducto = async (url) => {
    if (!url) return;
    const partes = url.split('/storage/v1/object/public/images/');
    if (partes.length < 2) return;
    const path = partes[1];
    await supabase.storage.from('images').remove([path]);
  };

  // --- VENTAS ---

  const registrarVenta = async (productoId, cantidad = 1) => {
    const { data, error } = await supabase.rpc('registrar_venta_kiosco', {
      p_producto_id: productoId,
      p_cantidad: cantidad
    });

    if (error) throw error;

    if (!data.success) {
      throw new Error(data.error);
    }

    await cargarProductos(false);
    await cargarVentas(false);
    return data;
  };

  const cargarVentas = async (mostrarLoading = true) => {
    try {
      if (mostrarLoading) setLoadingVentas(true);
      const { data, error } = await supabase
        .from('ventas_kiosco')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVentas(data || []);
    } catch {
      // Silenciado
    } finally {
      if (mostrarLoading) setLoadingVentas(false);
    }
  };

  const value = {
    productos,
    ventas,
    loadingProductos,
    loadingVentas,
    cargarProductos,
    agregarProducto,
    editarProducto,
    eliminarProducto,
    reordenarBatch,
    subirImagenProducto,
    eliminarImagenProducto,
    registrarVenta,
    cargarVentas
  };

  return (
    <KioscoContext.Provider value={value}>
      {children}
    </KioscoContext.Provider>
  );
};
