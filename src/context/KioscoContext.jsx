import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase/client';
import { agruparPagosPorTicket } from '../utils/pagosVenta';

const PAGINA_MOVIMIENTOS = 100;

// Supabase devuelve como máximo 1000 filas por consulta. La caja suma todas las
// ventas y egresos desde su inicio, así que la primera carga trae todas las páginas
// (en paralelo). Las recargas posteriores solo piden las filas más recientes y se
// fusionan con lo ya cargado, para no repetir miles de filas en cada venta.
const TAMANO_PAGINA = 1000;
const TAMANO_RECIENTES = 300;

const pedirPagina = async (tabla, desde, cantidad) => {
  const { data, error } = await supabase
    .from(tabla)
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(desde, desde + cantidad - 1);
  if (error) throw error;
  return data || [];
};

const traerTodo = async (tabla, soloRecientes = false) => {
  if (soloRecientes) return pedirPagina(tabla, 0, TAMANO_RECIENTES);
  const { count, error } = await supabase.from(tabla).select('id', { count: 'exact', head: true });
  if (error) throw error;
  const paginas = Math.max(1, Math.ceil((count || 0) / TAMANO_PAGINA));
  const resultados = await Promise.all(
    Array.from({ length: paginas }, (_, i) => pedirPagina(tabla, i * TAMANO_PAGINA, TAMANO_PAGINA))
  );
  return resultados.flat();
};

const fusionar = (previas, nuevas) => {
  const porId = new Map(previas.map(f => [f.id, f]));
  nuevas.forEach(f => porId.set(f.id, f));
  return [...porId.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
};

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
  const [egresosCaja, setEgresosCaja] = useState([]);
  const [ingresosCaja, setIngresosCaja] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [pagosVenta, setPagosVenta] = useState([]);
  const [movimientosStock, setMovimientosStock] = useState([]);
  const [hayMasMovimientos, setHayMasMovimientos] = useState(false);
  const cargandoMovimientos = useRef(false);
  const cargadas = useRef({});

  // Primera vez: todas las filas. Después: solo las recientes, fusionadas.
  const cargarTabla = async (tabla, setter) => {
    const incremental = !!cargadas.current[tabla];
    const data = await traerTodo(tabla, incremental);
    setter(prev => (incremental ? fusionar(prev, data) : data));
    cargadas.current[tabla] = true;
  };
  const movimientosStockRef = useRef([]);
  movimientosStockRef.current = movimientosStock;
  // id de usuario -> nombre, para mostrar quién vendió o registró cada movimiento
  const [nombresUsuarios, setNombresUsuarios] = useState({});

  useEffect(() => {
    cargarProductos();
    cargarVentas();
    cargarEgresosCaja();
    cargarIngresosCaja();
    cargarNombresUsuarios();
    cargarMovimientosStock();
    cargarPagosVenta();

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

    const egresosSubscription = supabase
      .channel('egresos_caja_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'egresos_caja' }, (payload) => {
        if (payload.eventType === 'DELETE') setEgresosCaja(prev => prev.filter(e => e.id !== payload.old.id));
        cargarEgresosCaja();
      })
      .subscribe();

    const ingresosSubscription = supabase
      .channel('ingresos_caja_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingresos_caja' }, (payload) => {
        if (payload.eventType === 'DELETE') setIngresosCaja(prev => prev.filter(i => i.id !== payload.old.id));
        cargarIngresosCaja();
      })
      .subscribe();

    const pagosSubscription = supabase
      .channel('pagos_venta_kiosco_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_venta_kiosco' }, () => {
        cargarPagosVenta();
      })
      .subscribe();

    const stockSubscription = supabase
      .channel('movimientos_stock_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos_stock' }, () => {
        cargarMovimientosStock();
      })
      .subscribe();

    return () => {
      pagosSubscription.unsubscribe();
      stockSubscription.unsubscribe();
      productosSubscription.unsubscribe();
      ventasSubscription.unsubscribe();
      egresosSubscription.unsubscribe();
      ingresosSubscription.unsubscribe();
    };
  }, []);

  // --- USUARIOS (solo para etiquetar quién hizo cada movimiento) ---

  const cargarNombresUsuarios = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, nombre, email');
      if (error) throw error;
      setNombresUsuarios(Object.fromEntries((data || []).map(p => [p.id, p.nombre || p.email])));
    } catch {
      // Silenciado - RLS deniega para no-admins
    }
  };

  const nombreUsuario = (id) => (id ? nombresUsuarios[id] || 'Usuario eliminado' : 'Sin registro');

  // El historial de stock crece sin parar, así que se pide por páginas de 100.
  // `reiniciar` vuelve a la primera página (lo usa el realtime); sin él trae la siguiente.
  const cargarMovimientosStock = async (reiniciar = true) => {
    if (cargandoMovimientos.current) return;
    cargandoMovimientos.current = true;
    try {
      const desde = reiniciar ? 0 : movimientosStockRef.current.length;
      const { data, error } = await supabase
        .from('movimientos_stock')
        .select('*')
        .order('created_at', { ascending: false })
        .range(desde, desde + PAGINA_MOVIMIENTOS - 1);
      if (error) throw error;
      const pagina = data || [];
      setHayMasMovimientos(pagina.length === PAGINA_MOVIMIENTOS);
      setMovimientosStock(prev => (reiniciar ? pagina : [...prev, ...pagina]));
    } catch {
      // Silenciado - RLS deniega para no-admins o la migración aún no se aplicó
      setHayMasMovimientos(false);
    } finally {
      cargandoMovimientos.current = false;
    }
  };

  const cargarMasMovimientosStock = () => cargarMovimientosStock(false);

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
      p_imagen_url: datos.imagenUrl || null,
      p_activo: datos.activo !== false
    });

    if (error) throw error;
    await cargarProductos(false);
  };

  const toggleActivoProducto = async (producto) => {
    await editarProducto(producto.id, {
      nombre: producto.nombre,
      precio: producto.precio,
      stock: producto.stock,
      codigoBarras: producto.codigo_barras,
      imagenUrl: producto.imagen_url,
      activo: !producto.activo
    });
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

  const registrarVenta = async (productoId, cantidad = 1, tipoPago = 'efectivo') => {
    const { data, error } = await supabase.rpc('registrar_venta_kiosco', {
      p_producto_id: productoId,
      p_cantidad: cantidad,
      p_tipo_pago: tipoPago
    });

    if (error) throw error;

    if (!data.success) {
      throw new Error(data.error);
    }

    await cargarProductos(false);
    await cargarVentas(false);
    return data;
  };

  // Registra un carrito completo en una sola transacción (ver
  // migration-kiosco-modo-venta.sql): o se venden todos los productos o ninguno.
  // items: [{ productoId, cantidad }]
  // pagos: [{ tipoPago, monto }] — uno o varios métodos; la suma debe ser el total
  // (ver migration-pagos-multiples.sql).
  const registrarVentaLote = async (items, pagos) => {
    const { data, error } = await supabase.rpc('registrar_venta_kiosco_lote', {
      p_items: items.map(i => ({ producto_id: i.productoId, cantidad: i.cantidad })),
      p_pagos: pagos.map(p => ({ tipo_pago: p.tipoPago, monto: p.monto }))
    });

    if (error) throw error;

    if (!data.success) {
      throw new Error(data.error);
    }

    await cargarProductos(false);
    await cargarVentas(false);
    await cargarPagosVenta();
    return data;
  };

  const cargarPagosVenta = async () => {
    try {
      await cargarTabla('pagos_venta_kiosco', setPagosVenta);
    } catch {
      // Silenciado - RLS deniega para no-admins o la migración aún no se aplicó
    }
  };

  const cargarVentas = async (mostrarLoading = true) => {
    try {
      if (mostrarLoading) setLoadingVentas(true);
      await cargarTabla('ventas_kiosco', setVentas);
    } catch {
      // Silenciado
    } finally {
      if (mostrarLoading) setLoadingVentas(false);
    }
  };

  // --- EGRESOS CAJA ---

  const cargarEgresosCaja = async () => {
    try {
      await cargarTabla('egresos_caja', setEgresosCaja);
    } catch {
      // Silenciado
    }
  };

  const registrarEgresoCaja = async (monto, descripcion) => {
    const { data, error } = await supabase
      .from('egresos_caja')
      .insert([{ monto, descripcion, registrado_por: (await supabase.auth.getUser()).data.user?.id }])
      .select()
      .single();

    if (error) throw error;
    await cargarEgresosCaja();
    return data;
  };

  const eliminarEgresoCaja = async (id) => {
    const { error } = await supabase
      .from('egresos_caja')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setEgresosCaja(prev => prev.filter(e => e.id !== id));
  };

  // --- INGRESOS CAJA ---

  const cargarIngresosCaja = async () => {
    try {
      await cargarTabla('ingresos_caja', setIngresosCaja);
    } catch {
      // Silenciado
    }
  };

  const registrarIngresoCaja = async (monto, descripcion) => {
    const { data, error } = await supabase
      .from('ingresos_caja')
      .insert([{ monto, descripcion, registrado_por: (await supabase.auth.getUser()).data.user?.id }])
      .select()
      .single();

    if (error) throw error;
    await cargarIngresosCaja();
    return data;
  };

  const eliminarIngresoCaja = async (id) => {
    const { error } = await supabase
      .from('ingresos_caja')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setIngresosCaja(prev => prev.filter(i => i.id !== id));
  };

  const pagosPorTicket = useMemo(() => agruparPagosPorTicket(pagosVenta), [pagosVenta]);

  const value = {
    productos,
    ventas,
    egresosCaja,
    ingresosCaja,
    loadingProductos,
    loadingVentas,
    nombreUsuario,
    pagosPorTicket,
    movimientosStock,
    hayMasMovimientos,
    cargarMasMovimientosStock,
    cargarProductos,
    agregarProducto,
    editarProducto,
    toggleActivoProducto,
    eliminarProducto,
    reordenarBatch,
    subirImagenProducto,
    eliminarImagenProducto,
    registrarVenta,
    registrarVentaLote,
    cargarVentas,
    registrarEgresoCaja,
    eliminarEgresoCaja,
    registrarIngresoCaja,
    eliminarIngresoCaja
  };

  return (
    <KioscoContext.Provider value={value}>
      {children}
    </KioscoContext.Provider>
  );
};
