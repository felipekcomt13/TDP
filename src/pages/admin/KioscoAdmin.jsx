import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useKiosco } from '../../context/KioscoContext';
import { METODOS_PAGO, nombrePago, badgePago } from '../../constants/metodosPago';
import { asignacionesPago } from '../../utils/pagosVenta';
import ModoVenta from '../../components/kiosco/ModoVenta';

const formInicial = {
  nombre: '',
  precio: '',
  stock: '',
  codigoBarras: '',
  imagenUrl: ''
};

const KioscoAdmin = () => {
  const { isAdmin, isEmpleado } = useAuth();
  const navigate = useNavigate();
  const {
    productos,
    ventas,
    egresosCaja,
    ingresosCaja,
    loadingProductos,
    loadingVentas,
    agregarProducto,
    editarProducto,
    eliminarProducto,
    toggleActivoProducto,
    reordenarBatch,
    subirImagenProducto,
    eliminarImagenProducto,
    registrarVenta,
    registrarEgresoCaja,
    eliminarEgresoCaja,
    registrarIngresoCaja,
    eliminarIngresoCaja,
    nombreUsuario,
    pagosPorTicket,
    movimientosStock,
    hayMasMovimientos,
    cargarMasMovimientosStock
  } = useKiosco();

  const empleado = isEmpleado();
  const [tabActivo, setTabActivo] = useState(empleado ? 'ventas' : 'inventario');
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [productoVendido, setProductoVendido] = useState(null);
  const [modalTipo, setModalTipo] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [formData, setFormData] = useState(formInicial);
  const [guardando, setGuardando] = useState(false);
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [horaDesde, setHoraDesde] = useState('');
  const [horaHasta, setHoraHasta] = useState('');
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [tipoHistorial, setTipoHistorial] = useState('todo');
  const [metodoHistorial, setMetodoHistorial] = useState('todos');
  const [cantidadVenta, setCantidadVenta] = useState(1);
  const [limitHistorial, setLimitHistorial] = useState(50);
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [previewImagen, setPreviewImagen] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [filtroActivo, setFiltroActivo] = useState('activos');
  const [ventaPendiente, setVentaPendiente] = useState(null);
  const [modalMovimiento, setModalMovimiento] = useState(null);
  const [movimientoForm, setMovimientoForm] = useState({ monto: '', descripcion: '' });
  const [cajaExpandida, setCajaExpandida] = useState(false);
  // Día que se consulta en las tarjetas de Plin/Yape/QR; vacío = hoy
  const [fechaDigital, setFechaDigital] = useState('');

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  // --- MODALES ---

  const abrirModalAgregar = () => {
    setFormData(formInicial);
    setProductoSeleccionado(null);
    setArchivoImagen(null);
    setPreviewImagen(null);
    setModalTipo('agregar');
  };

  const abrirModalEditar = (producto) => {
    setFormData({
      nombre: producto.nombre,
      precio: producto.precio.toString(),
      stock: producto.stock.toString(),
      codigoBarras: producto.codigo_barras || '',
      imagenUrl: producto.imagen_url || ''
    });
    setProductoSeleccionado(producto);
    setArchivoImagen(null);
    setPreviewImagen(producto.imagen_url || null);
    setModalTipo('editar');
  };

  const abrirModalEliminar = (producto) => {
    setProductoSeleccionado(producto);
    setModalTipo('eliminar');
  };

  const abrirModalStock = (producto) => {
    setFormData({
      nombre: producto.nombre,
      precio: producto.precio.toString(),
      stock: producto.stock.toString(),
      codigoBarras: producto.codigo_barras || ''
    });
    setProductoSeleccionado(producto);
    setModalTipo('stock');
  };

  const cerrarModal = () => {
    setModalTipo(null);
    setProductoSeleccionado(null);
    setFormData(formInicial);
    setArchivoImagen(null);
    setPreviewImagen(null);
  };

  const handleArchivoSeleccionado = (e) => {
    procesarArchivo(e.target.files[0]);
  };

  const quitarImagen = () => {
    setArchivoImagen(null);
    setPreviewImagen(null);
    setFormData({ ...formData, imagenUrl: '' });
  };

  const procesarArchivo = (archivo) => {
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      mostrarMensaje('Solo se permiten archivos de imagen', 'error');
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      mostrarMensaje('La imagen no debe superar los 2MB', 'error');
      return;
    }
    setArchivoImagen(archivo);
    setPreviewImagen(URL.createObjectURL(archivo));
  };

  const handleDropImagen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const archivo = e.dataTransfer.files[0];
    procesarArchivo(archivo);
  };

  // --- HANDLERS ---

  const handleGuardar = async () => {
    if (!formData.nombre.trim() || !formData.precio || !formData.stock) {
      mostrarMensaje('Completa los campos obligatorios: nombre, precio y stock', 'error');
      return;
    }

    const precio = parseFloat(formData.precio);
    const stock = parseInt(formData.stock);

    if (isNaN(precio) || precio < 0) {
      mostrarMensaje('El precio debe ser un numero valido mayor o igual a 0', 'error');
      return;
    }
    if (isNaN(stock) || stock < 0) {
      mostrarMensaje('El stock debe ser un numero entero mayor o igual a 0', 'error');
      return;
    }

    setGuardando(true);
    try {
      let imagenUrl = formData.imagenUrl;

      // Subir imagen nueva si hay archivo seleccionado
      if (archivoImagen) {
        // Si estamos editando y ya tenia imagen, eliminar la anterior
        if (modalTipo === 'editar' && productoSeleccionado?.imagen_url) {
          await eliminarImagenProducto(productoSeleccionado.imagen_url);
        }
        imagenUrl = await subirImagenProducto(archivoImagen);
      }
      // Si se quito la imagen (preview null y no hay archivo)
      else if (!previewImagen && modalTipo === 'editar' && productoSeleccionado?.imagen_url) {
        await eliminarImagenProducto(productoSeleccionado.imagen_url);
        imagenUrl = '';
      }

      const datos = {
        nombre: formData.nombre.trim(),
        precio,
        stock,
        codigoBarras: formData.codigoBarras.trim() || null,
        imagenUrl,
        activo: modalTipo === 'agregar' ? true : productoSeleccionado?.activo !== false
      };

      if (modalTipo === 'agregar') {
        await agregarProducto(datos);
        mostrarMensaje('Producto agregado correctamente', 'success');
      } else {
        await editarProducto(productoSeleccionado.id, datos);
        mostrarMensaje('Producto actualizado correctamente', 'success');
      }
      cerrarModal();
    } catch (error) {
      mostrarMensaje('Error: ' + error.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    setGuardando(true);
    try {
      // Eliminar imagen del storage si tenia
      if (productoSeleccionado.imagen_url) {
        await eliminarImagenProducto(productoSeleccionado.imagen_url);
      }
      await eliminarProducto(productoSeleccionado.id);
      mostrarMensaje('Producto eliminado correctamente', 'success');
      cerrarModal();
    } catch (error) {
      mostrarMensaje('Error al eliminar: ' + error.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleActualizarStock = async () => {
    const stock = parseInt(formData.stock);
    if (isNaN(stock) || stock < 0) {
      mostrarMensaje('El stock debe ser un numero valido', 'error');
      return;
    }

    setGuardando(true);
    try {
      await editarProducto(productoSeleccionado.id, {
        nombre: productoSeleccionado.nombre,
        precio: productoSeleccionado.precio,
        stock,
        codigoBarras: productoSeleccionado.codigo_barras || null,
        imagenUrl: productoSeleccionado.imagen_url || null,
        activo: productoSeleccionado.activo !== false
      });
      mostrarMensaje('Stock actualizado correctamente', 'success');
      cerrarModal();
    } catch (error) {
      mostrarMensaje('Error: ' + error.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleVender = (producto) => {
    setCantidadVenta(1);
    setVentaPendiente(producto);
  };

  const getNombrePago = nombrePago;

  const confirmarVenta = async (tipoPago) => {
    if (!ventaPendiente) return;
    const producto = ventaPendiente;
    const cantidad = cantidadVenta;
    setVentaPendiente(null);
    try {
      const resultado = await registrarVenta(producto.id, cantidad, tipoPago);

      setProductoVendido(producto.id);
      setTimeout(() => setProductoVendido(null), 1500);
      mostrarMensaje(`Venta registrada: ${resultado.producto}${cantidad > 1 ? ` x${cantidad}` : ''} — ${getNombrePago(tipoPago)} — Stock: ${resultado.stock_restante}`, 'success');
    } catch (error) {
      mostrarMensaje('Error: ' + error.message, 'error');
    }
  };

  // --- DRAG AND DROP ---

  const dragEnabled = !busqueda;

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const items = [...productos];
    const fromIndex = items.findIndex(p => p.id === draggedId);
    const toIndex = items.findIndex(p => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);

    const nuevosOrden = items.map((item, i) => ({ id: item.id, orden: i + 1 }));

    setDraggedId(null);
    setDragOverId(null);

    try {
      await reordenarBatch(nuevosOrden);
    } catch {
      mostrarMensaje('Error al reordenar', 'error');
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // --- FILTROS ---

  const productosFiltrados = productos.filter(p => {
    if (filtroActivo === 'activos' && p.activo === false) return false;
    if (filtroActivo === 'inactivos' && p.activo !== false) return false;
    if (!busqueda) return true;
    const b = busqueda.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(b) ||
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(b))
    );
  });

  // Rango de fechas y, opcionalmente, franja horaria diaria (HH:MM)
  const enRangoHistorial = (iso) => {
    const f = new Date(iso);
    const fecha = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
    if (filtroDesde && fecha < filtroDesde) return false;
    if (filtroHasta && fecha > filtroHasta) return false;
    const hora = `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
    if (horaDesde && hora < horaDesde) return false;
    if (horaHasta && hora > horaHasta) return false;
    return true;
  };

  const ventasFiltradas = ventas.filter(v => {
    if (!enRangoHistorial(v.created_at)) return false;
    // Una venta mixta entra en el filtro de cada método con que se pagó
    if (metodoHistorial !== 'todos' && !asignacionesPago(v, pagosPorTicket).some(a => a.tipo === metodoHistorial)) return false;
    if (busquedaHistorial) {
      const b = busquedaHistorial.toLowerCase();
      if (!v.nombre_producto?.toLowerCase().includes(b) && !nombreUsuario(v.vendido_por).toLowerCase().includes(b)) return false;
    }
    return true;
  });

  // Historial de egresos de caja (quién, cuándo, cuánto y por qué)
  const egresosFiltrados = egresosCaja.filter(e => {
    if (!enRangoHistorial(e.created_at)) return false;
    if (busquedaHistorial) {
      const b = busquedaHistorial.toLowerCase();
      if (!e.descripcion?.toLowerCase().includes(b) && !nombreUsuario(e.registrado_por).toLowerCase().includes(b)) return false;
    }
    return true;
  });
  const totalEgresosFiltrados = egresosFiltrados.reduce((sum, e) => sum + parseFloat(e.monto), 0);

  const ingresosFiltrados = ingresosCaja.filter(i => {
    if (!enRangoHistorial(i.created_at)) return false;
    if (busquedaHistorial) {
      const b = busquedaHistorial.toLowerCase();
      if (!i.descripcion?.toLowerCase().includes(b) && !nombreUsuario(i.registrado_por).toLowerCase().includes(b)) return false;
    }
    return true;
  });
  const totalIngresosFiltrados = ingresosFiltrados.reduce((sum, i) => sum + parseFloat(i.monto), 0);

  // Historial de stock. Una venta y su descuento de stock ocurren en la misma
  // transacción, así que comparten producto y marca de tiempo exacta.
  const clavesVentas = new Set(ventas.map(v => `${v.producto_id}|${v.created_at}`));
  const tipoMovimientoStock = (m) => {
    if (m.es_alta) return 'Alta';
    return clavesVentas.has(`${m.producto_id}|${m.created_at}`) ? 'Venta' : 'Ajuste';
  };
  const movimientosStockFiltrados = movimientosStock.filter(m => {
    if (!enRangoHistorial(m.created_at)) return false;
    // Las ventas ya aparecen como tal en el historial
    if (tipoMovimientoStock(m) === 'Venta') return false;
    if (busquedaHistorial) {
      const b = busquedaHistorial.toLowerCase();
      if (!m.nombre_producto?.toLowerCase().includes(b) && !nombreUsuario(m.usuario_id).toLowerCase().includes(b)) return false;
    }
    return true;
  });

  // Con un método elegido, el total es solo lo cobrado por ese método
  const totalVentasFiltradas = ventasFiltradas.reduce((sum, v) => {
    if (metodoHistorial === 'todos') return sum + parseFloat(v.precio_venta) * v.cantidad;
    return sum + asignacionesPago(v, pagosPorTicket)
      .filter(a => a.tipo === metodoHistorial)
      .reduce((s, a) => s + a.monto, 0);
  }, 0);

  // Historial unificado: ventas, egresos de caja y movimientos de stock en una
  // sola lista por fecha. Los empleados solo ven ventas.
  const mostrarVentas = tipoHistorial === 'todo' || tipoHistorial === 'venta';
  // Egresos y stock no tienen método de pago: con uno elegido solo se ven ventas
  const sinMetodo = metodoHistorial === 'todos';
  const mostrarEgresos = !empleado && sinMetodo && (tipoHistorial === 'todo' || tipoHistorial === 'egreso');
  const mostrarIngresos = !empleado && sinMetodo && (tipoHistorial === 'todo' || tipoHistorial === 'ingreso');
  const mostrarStock = !empleado && sinMetodo && (tipoHistorial === 'todo' || tipoHistorial === 'stock');

  const entradasHistorial = [
    ...(mostrarVentas ? ventasFiltradas.map(v => ({ tipo: 'venta', id: `v-${v.id}`, fecha: v.created_at, dato: v })) : []),
    ...(mostrarEgresos ? egresosFiltrados.map(e => ({ tipo: 'egreso', id: `e-${e.id}`, fecha: e.created_at, dato: e })) : []),
    ...(mostrarIngresos ? ingresosFiltrados.map(i => ({ tipo: 'ingreso', id: `i-${i.id}`, fecha: i.created_at, dato: i })) : []),
    ...(mostrarStock ? movimientosStockFiltrados.map(m => ({ tipo: 'stock', id: `s-${m.id}`, fecha: m.created_at, dato: m })) : [])
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const entradasPaginadas = entradasHistorial.slice(0, limitHistorial);
  // Los movimientos de stock se piden al servidor por tandas
  const hayMasHistorial = entradasHistorial.length > limitHistorial || (mostrarStock && hayMasMovimientos);
  const cargarMasHistorial = () => {
    setLimitHistorial(prev => prev + 50);
    if (mostrarStock && hayMasMovimientos) cargarMasMovimientosStock();
  };

  // Desglose por metodo de pago
  // (el monto de una línea pagada con varios métodos se reparte entre ellos)
  const desglosePago = ventasFiltradas.reduce((acc, v) => {
    asignacionesPago(v, pagosPorTicket).forEach(({ tipo, monto }) => {
      if (metodoHistorial !== 'todos' && tipo !== metodoHistorial) return;
      if (!acc[tipo]) acc[tipo] = { total: 0, cantidad: 0 };
      acc[tipo].total += monto;
      acc[tipo].cantidad += 1;
    });
    return acc;
  }, {});

  // Agrupar ventas por semana (lunes a domingo) usando fecha local
  const ventasPorSemana = ventas.reduce((acc, v) => {
    const fecha = new Date(v.created_at);
    const dia = fecha.getDay();
    const diffLunes = dia === 0 ? 6 : dia - 1;
    const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - diffLunes);
    const clave = `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, '0')}-${String(lunes.getDate()).padStart(2, '0')}`;
    if (!acc[clave]) acc[clave] = { total: 0, cantidad: 0 };
    acc[clave].total += parseFloat(v.precio_venta) * v.cantidad;
    acc[clave].cantidad += 1;
    return acc;
  }, {});

  const [verTodasSemanas, setVerTodasSemanas] = useState(false);

  const semanasOrdenadas = Object.entries(ventasPorSemana)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([lunes, datos]) => {
      const fechaLunes = new Date(lunes + 'T12:00:00');
      const fechaDomingo = new Date(fechaLunes);
      fechaDomingo.setDate(fechaLunes.getDate() + 6);
      const formatear = (f) => f.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
      return {
        label: `${formatear(fechaLunes)} - ${formatear(fechaDomingo)}`,
        ...datos
      };
    });

  // --- CAJA ---
  const hoyStr = (() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
  })();

  const fechaLocal = (iso) => {
    const f = new Date(iso);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  };

  // La caja arrastra su saldo de un día a otro: lo que queda hoy es la apertura
  // de mañana. El saldo es el fondo inicial más todo el efectivo vendido menos
  // todos los egresos desde la fecha en que se fijó ese fondo.
  const CAJA_INICIAL = 156.80;
  const CAJA_FECHA_INICIO = '2026-04-14';

  // Solo cuenta la parte pagada en efectivo (una venta puede mezclar métodos)
  const ventasEfectivo = ventas
    .filter(v => fechaLocal(v.created_at) >= CAJA_FECHA_INICIO)
    .map(v => ({
      created_at: v.created_at,
      monto: asignacionesPago(v, pagosPorTicket).filter(a => a.tipo === 'efectivo').reduce((sum, a) => sum + a.monto, 0)
    }))
    .filter(v => v.monto > 0);
  const montoVenta = (v) => v.monto;
  const egresosDesdeInicio = egresosCaja.filter(e => fechaLocal(e.created_at) >= CAJA_FECHA_INICIO);

  const totalEfectivoHoy = ventasEfectivo
    .filter(v => fechaLocal(v.created_at) === hoyStr)
    .reduce((sum, v) => sum + montoVenta(v), 0);

  const egresosHoy = egresosDesdeInicio.filter(e => fechaLocal(e.created_at) === hoyStr);
  const totalEgresosHoy = egresosHoy.reduce((sum, e) => sum + parseFloat(e.monto), 0);

  // Ingresos manuales de efectivo (no son ventas): aportes, cambio, devoluciones
  const ingresosDesdeInicio = ingresosCaja.filter(i => fechaLocal(i.created_at) >= CAJA_FECHA_INICIO);
  const ingresosHoy = ingresosDesdeInicio.filter(i => fechaLocal(i.created_at) === hoyStr);
  const totalIngresosHoy = ingresosHoy.reduce((sum, i) => sum + parseFloat(i.monto), 0);

  const saldoCaja = CAJA_INICIAL
    + ventasEfectivo.reduce((sum, v) => sum + montoVenta(v), 0)
    + ingresosDesdeInicio.reduce((sum, i) => sum + parseFloat(i.monto), 0)
    - egresosDesdeInicio.reduce((sum, e) => sum + parseFloat(e.monto), 0);
  const aperturaCaja = saldoCaja - totalEfectivoHoy - totalIngresosHoy + totalEgresosHoy;

  // Plin, Yape y QR: lo cobrado por cada medio en un día (arrancan en 0 cada
  // día). Los egresos de caja solo salen del efectivo.
  const METODOS_DIGITALES = [
    { tipo: 'plin', label: 'Plin', color: 'text-cyan-600', fondo: 'bg-cyan-50' },
    { tipo: 'yape', label: 'Yape', color: 'text-purple-600', fondo: 'bg-purple-50' },
    { tipo: 'qr', label: 'QR', color: 'text-amber-600', fondo: 'bg-amber-50' }
  ];
  const fechaVistaDigital = fechaDigital || hoyStr;
  const totalesDigitales = { plin: 0, yape: 0, qr: 0 };
  ventas
    .filter(v => fechaLocal(v.created_at) === fechaVistaDigital)
    .forEach(v => {
      asignacionesPago(v, pagosPorTicket).forEach(a => {
        if (a.tipo in totalesDigitales) totalesDigitales[a.tipo] += a.monto;
      });
    });

  const handleRegistrarMovimiento = async () => {
    const esIngreso = modalMovimiento === 'ingreso';
    const monto = parseFloat(movimientoForm.monto);
    if (isNaN(monto) || monto <= 0) {
      mostrarMensaje('Ingresa un monto valido', 'error');
      return;
    }
    if (!movimientoForm.descripcion.trim()) {
      mostrarMensaje('Ingresa una descripcion', 'error');
      return;
    }
    setGuardando(true);
    try {
      const registrar = esIngreso ? registrarIngresoCaja : registrarEgresoCaja;
      await registrar(monto, movimientoForm.descripcion.trim());
      mostrarMensaje(`${esIngreso ? 'Ingreso' : 'Egreso'} registrado: S/ ${monto.toFixed(2)}`, 'success');
      setModalMovimiento(null);
      setMovimientoForm({ monto: '', descripcion: '' });
    } catch (error) {
      mostrarMensaje('Error: ' + error.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const formatearFechaHora = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // --- TABS ---

  const tabs = [
    ...(!empleado ? [{ valor: 'inventario', label: 'Inventario' }] : []),
    { valor: 'modo-venta', label: 'Modo venta' },
    { valor: 'ventas', label: 'Ventas' },
    { valor: 'historial', label: 'Historial' },
  ];

  const stockColor = (stock) => {
    if (stock === 0) return 'text-red-600 bg-red-50 border-red-100';
    if (stock <= 5) return 'text-amber-700 bg-amber-50 border-amber-100';
    return 'text-emerald-700 bg-emerald-50 border-emerald-100';
  };

  // --- LOADING ---

  if (loadingProductos && loadingVentas) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // --- RENDER INVENTARIO ---

  const renderInventario = () => (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o codigo de barras..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
          />
        </div>
        <button
          onClick={abrirModalAgregar}
          className="px-6 py-3 bg-black text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Agregar producto
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 mb-4">
        {[
          { valor: 'activos', label: 'Activos' },
          { valor: 'inactivos', label: 'Inactivos' },
          { valor: 'todos', label: 'Todos' }
        ].map(f => (
          <button
            key={f.valor}
            onClick={() => setFiltroActivo(f.valor)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filtroActivo === f.valor
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <span className="px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
          {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
        </span>
        {productos.filter(p => p.stock === 0 && p.activo !== false).length > 0 && (
          <span className="px-3 py-1.5 bg-red-50 rounded-full text-xs font-medium text-red-600">
            {productos.filter(p => p.stock === 0 && p.activo !== false).length} sin stock
          </span>
        )}
        {productos.filter(p => p.activo === false).length > 0 && (
          <span className="px-3 py-1.5 bg-gray-50 rounded-full text-xs font-medium text-gray-400">
            {productos.filter(p => p.activo === false).length} inactivo{productos.filter(p => p.activo === false).length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Lista de productos */}
      {productosFiltrados.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl">
          <svg className="w-14 h-14 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-gray-400 text-sm">
            {busqueda ? 'No se encontraron productos' : 'No hay productos en el inventario'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productosFiltrados.map((producto) => (
            <div
              key={producto.id}
              draggable={dragEnabled}
              onDragStart={(e) => dragEnabled && handleDragStart(e, producto.id)}
              onDragOver={(e) => dragEnabled && handleDragOver(e, producto.id)}
              onDrop={(e) => dragEnabled && handleDrop(e, producto.id)}
              onDragEnd={handleDragEnd}
              className={`bg-white rounded-xl shadow-sm border p-5 transition-all ${
                dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''
              } ${
                draggedId === producto.id ? 'opacity-40 scale-95' : 'hover:shadow-md'
              } ${
                dragOverId === producto.id && draggedId !== producto.id ? 'border-black border-2 shadow-lg' : 'border-gray-100'
              } ${
                producto.activo === false ? 'opacity-50' : ''
              }`}
            >
              {/* Badge inactivo */}
              {producto.activo === false && (
                <div className="mb-3">
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-[10px] font-semibold uppercase tracking-wider rounded">
                    Inactivo
                  </span>
                </div>
              )}

              {/* Imagen */}
              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden mb-4">
                {producto.imagen_url ? (
                  <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-3xl font-bold text-gray-300">{producto.nombre.charAt(0).toUpperCase()}</span>
                )}
              </div>

              {/* Info */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-semibold text-gray-900 text-base truncate">{producto.nombre}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">S/ {parseFloat(producto.precio).toFixed(2)}</span>
                  <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${stockColor(producto.stock)}`}>
                    {producto.stock} uds
                  </span>
                </div>
                {producto.codigo_barras && (
                  <p className="text-xs text-gray-300 mt-1">{producto.codigo_barras}</p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActivoProducto(producto)}
                  className={`h-9 px-3 flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-all ${
                    producto.activo === false
                      ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                  title={producto.activo === false ? 'Activar' : 'Desactivar'}
                >
                  {producto.activo === false ? 'Activar' : 'Desactivar'}
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => abrirModalEditar(producto)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition-all"
                  title="Editar"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => abrirModalEliminar(producto)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-200 hover:bg-red-50 transition-all"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  // --- RENDER VENTAS ---

  const renderVentas = () => {
    const productosVenta = productos.filter(p => {
      if (p.activo === false) return false;
      if (!busqueda) return true;
      const b = busqueda.toLowerCase();
      return p.nombre.toLowerCase().includes(b) || (p.codigo_barras && p.codigo_barras.toLowerCase().includes(b));
    });
    const productosConStock = productosVenta.filter(p => p.stock > 0);
    const productosSinStock = productosVenta.filter(p => p.stock === 0);

    return (
      <>
        {/* Busqueda */}
        <div className="relative mb-4">
          <svg className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
          />
        </div>

        {productosVenta.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl">
            <p className="text-gray-400 text-sm">
              {busqueda ? 'No se encontraron productos' : 'No hay productos registrados'}
            </p>
          </div>
        ) : (
          <>
            {/* Productos con stock - layout compacto */}
            <div className="space-y-2 mb-4">
              {productosConStock.map((producto) => (
                <div
                  key={producto.id}
                  className={`relative flex items-center gap-3 bg-white rounded-xl border p-3 transition-all duration-300 ${
                    productoVendido === producto.id
                      ? 'border-emerald-400 shadow-emerald-100 shadow-md'
                      : 'border-gray-100 hover:shadow-sm'
                  }`}
                >
                  {/* Overlay vendido */}
                  {productoVendido === producto.id && (
                    <div className="absolute inset-0 bg-emerald-500/90 rounded-xl flex items-center justify-center z-10">
                      <svg className="w-6 h-6 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-white font-bold text-sm uppercase tracking-wide">Vendido</span>
                    </div>
                  )}

                  {/* Imagen miniatura */}
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {producto.imagen_url ? (
                      <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-lg font-bold text-gray-300">{producto.nombre.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{producto.nombre}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-medium text-gray-900">S/ {parseFloat(producto.precio).toFixed(2)}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${stockColor(producto.stock)}`}>
                        {producto.stock}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  {!empleado && (
                    <button
                      onClick={() => abrirModalStock(producto)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition-all flex-shrink-0"
                      title="Editar stock"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleVender(producto)}
                    className="px-5 py-2 bg-black text-white text-xs font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all flex-shrink-0"
                  >
                    Vender
                  </button>
                </div>
              ))}
            </div>

            {/* Productos sin stock */}
            {productosSinStock.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Sin stock</p>
                <div className="space-y-2">
                  {productosSinStock.map((producto) => (
                    <div
                      key={producto.id}
                      className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 opacity-40"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                        {producto.imagen_url ? (
                          <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-lg font-bold text-gray-300">{producto.nombre.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-500 text-sm truncate">{producto.nombre}</h3>
                        <span className="text-sm font-medium text-gray-400">S/ {parseFloat(producto.precio).toFixed(2)}</span>
                      </div>
                      {!empleado && (
                        <button
                          onClick={() => abrirModalStock(producto)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition-all flex-shrink-0"
                          title="Agregar stock"
                        >
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      )}
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg">
                        Agotado
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </>
    );
  };

  // --- RENDER HISTORIAL ---

  const hayFiltrosActivos = filtroDesde || filtroHasta || horaDesde || horaHasta || busquedaHistorial || metodoHistorial !== 'todos';

  const renderHistorial = () => (
    <>
      {/* Filtros */}
      <div className="space-y-3 mb-6">
        {/* Busqueda + botones rapidos */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={empleado ? 'Buscar producto o vendedor...' : 'Buscar producto, descripcion o responsable...'}
              value={busquedaHistorial}
              onChange={(e) => setBusquedaHistorial(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={() => {
              const hoy = new Date();
              const str = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
              setFiltroDesde(str);
              setFiltroHasta(str);
            }}
            className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            Hoy
          </button>
          {hayFiltrosActivos && (
            <button
              onClick={() => { setFiltroDesde(''); setFiltroHasta(''); setHoraDesde(''); setHoraHasta(''); setBusquedaHistorial(''); setMetodoHistorial('todos'); setLimitHistorial(50); }}
              className="px-5 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
            >
              Limpiar
            </button>
          )}
        </div>
        {/* Rango de fechas */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
          />
          <span className="text-xs text-gray-400">a</span>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
          />
        </div>
        {/* Rango de horas (franja diaria) */}
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={horaDesde}
            onChange={(e) => setHoraDesde(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
          />
          <span className="text-xs text-gray-400">a</span>
          <input
            type="time"
            value={horaHasta}
            onChange={(e) => setHoraHasta(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
          />
        </div>
        {/* Metodo de pago */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest mr-1">Pago</span>
          {[{ id: 'todos', nombre: 'Todos' }, ...METODOS_PAGO].map(m => (
            <button
              key={m.id}
              onClick={() => { setMetodoHistorial(m.id); setLimitHistorial(50); }}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                metodoHistorial === m.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m.nombre}
            </button>
          ))}
        </div>
        {/* Tipo de movimiento */}
        {!empleado && (
          <div className="flex flex-wrap gap-2">
            {[
              { valor: 'todo', label: 'Todo' },
              { valor: 'venta', label: 'Ventas' },
              { valor: 'ingreso', label: 'Ingresos' },
              { valor: 'egreso', label: 'Egresos' },
              { valor: 'stock', label: 'Stock' }
            ].map(t => (
              <button
                key={t.valor}
                onClick={() => { setTipoHistorial(t.valor); setLimitHistorial(50); }}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                  tipoHistorial === t.valor ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resumen semanal */}
      {mostrarVentas && !hayFiltrosActivos && semanasOrdenadas.length > 0 && (() => {
        const semanasVisibles = verTodasSemanas ? semanasOrdenadas : semanasOrdenadas.slice(0, 4);
        const hayMas = semanasOrdenadas.length > 4;
        return (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Total por semana</h3>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5 font-semibold">Semana</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Ventas</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {semanasVisibles.map((semana, i) => (
                    <tr
                      key={i}
                      className={i === 0 ? 'bg-gray-900 text-white' : 'bg-white border-t border-gray-100'}
                    >
                      <td className={`px-4 py-3 font-medium ${i === 0 ? 'text-gray-200' : 'text-gray-600'}`}>
                        {semana.label}
                      </td>
                      <td className={`px-4 py-3 text-center ${i === 0 ? 'text-gray-400' : 'text-gray-400'}`}>
                        {semana.cantidad}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${i === 0 ? 'text-white' : 'text-gray-900'}`}>
                        S/ {semana.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hayMas && (
              <button
                onClick={() => setVerTodasSemanas(!verTodasSemanas)}
                className="mt-2 w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {verTodasSemanas ? 'Ver menos' : `Ver todas (${semanasOrdenadas.length} semanas)`}
              </button>
            )}
          </div>
        );
      })()}

      {/* Desglose por metodo de pago */}
      {mostrarVentas && ventasFiltradas.length > 0 && (Object.keys(desglosePago).length > 1 || metodoHistorial !== 'todos') && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Por metodo de pago</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(desglosePago).sort(([,a], [,b]) => b.total - a.total).map(([tipo, datos]) => (
              <div key={tipo} className="bg-white border border-gray-100 rounded-xl p-3">
                <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full mb-2 ${badgePago(tipo)}`}>
                  {getNombrePago(tipo)}
                </span>
                <p className="text-sm font-bold text-gray-900">S/ {datos.total.toFixed(2)}</p>
                <p className="text-[11px] text-gray-400">{datos.cantidad} venta{datos.cantidad !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista del historial: ventas, egresos y movimientos de stock */}
      {entradasHistorial.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl">
          <svg className="w-14 h-14 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-400 text-sm">
            {hayFiltrosActivos || tipoHistorial !== 'todo' ? 'No hay movimientos con estos filtros' : 'No hay movimientos registrados'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {entradasPaginadas.map((entrada) => {
              const d = entrada.dato;

              if (entrada.tipo === 'venta') {
                return (
                  <div key={entrada.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{d.nombre_producto}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Venta
                        </span>
                        <span className="text-xs text-gray-400">{formatearFechaHora(d.created_at)}</span>
                        {d.cantidad > 1 && (
                          <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-500">
                            x{d.cantidad}
                          </span>
                        )}
                        {(pagosPorTicket.get(d.ticket_id) || [{ tipo_pago: d.tipo_pago }]).map((pago) => (
                          <span key={pago.tipo_pago} className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${badgePago(pago.tipo_pago)}`}>
                            {getNombrePago(pago.tipo_pago)}
                            {pago.monto != null && pagosPorTicket.get(d.ticket_id).length > 1 && ` S/ ${parseFloat(pago.monto).toFixed(2)}`}
                          </span>
                        ))}
                        <span className="text-xs text-gray-500">
                          Vendido por <span className="font-medium text-gray-700">{nombreUsuario(d.vendido_por)}</span>
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className="font-semibold text-gray-900 text-sm">
                        S/ {(parseFloat(d.precio_venta) * d.cantidad).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              }

              if (entrada.tipo === 'ingreso') {
                return (
                  <div key={entrada.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{d.descripcion}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                          Ingreso
                        </span>
                        <span className="text-xs text-gray-400">{formatearFechaHora(d.created_at)}</span>
                        <span className="text-xs text-gray-500">
                          Registrado por <span className="font-medium text-gray-700">{nombreUsuario(d.registrado_por)}</span>
                        </span>
                      </div>
                    </div>
                    <span className="ml-4 font-semibold text-emerald-600 text-sm">+ S/ {parseFloat(d.monto).toFixed(2)}</span>
                  </div>
                );
              }

              if (entrada.tipo === 'egreso') {
                return (
                  <div key={entrada.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{d.descripcion}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-red-50 text-red-600 border border-red-100">
                          Egreso
                        </span>
                        <span className="text-xs text-gray-400">{formatearFechaHora(d.created_at)}</span>
                        <span className="text-xs text-gray-500">
                          Registrado por <span className="font-medium text-gray-700">{nombreUsuario(d.registrado_por)}</span>
                        </span>
                      </div>
                    </div>
                    <span className="ml-4 font-semibold text-red-600 text-sm">- S/ {parseFloat(d.monto).toFixed(2)}</span>
                  </div>
                );
              }

              const tipoStock = tipoMovimientoStock(d);
              return (
                <div key={entrada.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{d.nombre_producto}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${
                        tipoStock === 'Alta'
                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {tipoStock === 'Alta' ? 'Stock · Alta' : 'Stock · Ajuste'}
                      </span>
                      <span className="text-xs text-gray-400">{formatearFechaHora(d.created_at)}</span>
                      <span className="text-xs text-gray-500">
                        Por <span className="font-medium text-gray-700">{nombreUsuario(d.usuario_id)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className={`font-semibold text-sm ${d.diferencia > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {d.diferencia > 0 ? '+' : ''}{d.diferencia}
                    </p>
                    <p className="text-[11px] text-gray-400">{d.stock_anterior} → {d.stock_nuevo}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cargar mas */}
          {hayMasHistorial && (
            <button
              onClick={cargarMasHistorial}
              className="mt-4 w-full py-3 bg-gray-50 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cargar mas
            </button>
          )}

          {/* Totales */}
          {mostrarVentas && ventasFiltradas.length > 0 && (
            <div className="mt-6 bg-gray-900 text-white rounded-xl p-5 flex items-center justify-between">
              <span className="text-sm text-gray-300">
                Total ventas{hayFiltrosActivos ? ' filtrado' : ' general'} ({ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? 's' : ''})
              </span>
              <span className="text-xl font-bold">
                S/ {totalVentasFiltradas.toFixed(2)}
              </span>
            </div>
          )}
          {mostrarIngresos && ingresosFiltrados.length > 0 && (
            <div className="mt-3 bg-gray-900 text-white rounded-xl p-5 flex items-center justify-between">
              <span className="text-sm text-gray-300">
                Total ingresos{hayFiltrosActivos ? ' filtrado' : ' general'} ({ingresosFiltrados.length})
              </span>
              <span className="text-xl font-bold">S/ {totalIngresosFiltrados.toFixed(2)}</span>
            </div>
          )}
          {mostrarEgresos && egresosFiltrados.length > 0 && (
            <div className="mt-3 bg-gray-900 text-white rounded-xl p-5 flex items-center justify-between">
              <span className="text-sm text-gray-300">
                Total egresos{hayFiltrosActivos ? ' filtrado' : ' general'} ({egresosFiltrados.length})
              </span>
              <span className="text-xl font-bold">S/ {totalEgresosFiltrados.toFixed(2)}</span>
            </div>
          )}
        </>
      )}
    </>
  );

  // --- RENDER MODALES ---

  const renderModales = () => (
    <>
      {/* Modal Agregar/Editar Producto */}
      {(modalTipo === 'agregar' || modalTipo === 'editar') && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-scaleIn">
            <div className="p-8 pb-2 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {modalTipo === 'agregar' ? 'Agregar producto' : 'Editar producto'}
              </h2>
              <button
                onClick={cerrarModal}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-8 pt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre del producto"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Foto <span className="text-gray-400 font-normal">(opcional)</span></label>
                {previewImagen ? (
                  <div className="border border-gray-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400">Preview</p>
                      <button
                        type="button"
                        onClick={quitarImagen}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
                      <img src={previewImagen} alt="Preview" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                ) : null}
                <label
                  onDrop={handleDropImagen}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-dashed border-gray-300 rounded-lg hover:border-gray-500 cursor-pointer transition-all"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-500">
                    {previewImagen ? 'Cambiar imagen' : 'Seleccionar imagen'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleArchivoSeleccionado}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-gray-400 mt-1">PNG, JPG o WebP. Maximo 2MB.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Precio (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Codigo de barras <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input
                  type="text"
                  value={formData.codigoBarras}
                  onChange={(e) => setFormData({ ...formData, codigoBarras: e.target.value })}
                  placeholder="Ej: 7750000000000"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="p-8 pt-4 flex gap-3 justify-end">
              <button
                onClick={cerrarModal}
                className="px-6 py-3 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="px-6 py-3 bg-black text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {modalTipo === 'eliminar' && productoSeleccionado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl animate-scaleIn">
            <div className="p-8">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 text-center mb-2">Eliminar producto</h2>
              <p className="text-sm text-gray-500 text-center mb-1">
                Estas seguro de eliminar <span className="font-semibold text-gray-900">{productoSeleccionado.nombre}</span>?
              </p>
              <p className="text-xs text-gray-400 text-center">
                Las ventas historicas se mantendran en el historial.
              </p>
            </div>
            <div className="p-8 pt-2 flex gap-3">
              <button
                onClick={cerrarModal}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={guardando}
                className="flex-1 px-6 py-3 bg-red-500 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {guardando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Metodo de Pago */}
      {ventaPendiente && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl animate-scaleIn">
            <div className="p-8 pb-4">
              <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Metodo de pago</h2>
              <p className="text-sm text-gray-500 text-center mb-4">
                {ventaPendiente.nombre} — S/ {parseFloat(ventaPendiente.precio).toFixed(2)}
              </p>
              {/* Selector de cantidad */}
              <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-xl py-3">
                <button
                  onClick={() => setCantidadVenta(prev => Math.max(1, prev - 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all text-lg font-bold"
                >
                  -
                </button>
                <div className="text-center min-w-[60px]">
                  <span className="text-2xl font-bold text-gray-900">{cantidadVenta}</span>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">unidad{cantidadVenta !== 1 ? 'es' : ''}</p>
                </div>
                <button
                  onClick={() => setCantidadVenta(prev => Math.min(ventaPendiente.stock, prev + 1))}
                  disabled={cantidadVenta >= ventaPendiente.stock}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 active:scale-95 transition-all text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              {cantidadVenta > 1 && (
                <p className="text-center text-sm font-semibold text-gray-900 mt-2">
                  Total: S/ {(parseFloat(ventaPendiente.precio) * cantidadVenta).toFixed(2)}
                </p>
              )}
            </div>
            <div className="px-8 pb-8 flex flex-col gap-3">
              {METODOS_PAGO.map((m) => (
                <button
                  key={m.id}
                  onClick={() => confirmarVenta(m.id)}
                  className={`w-full py-4 text-sm font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all uppercase tracking-wide border-2 ${m.clase}`}
                >
                  {m.nombre}
                </button>
              ))}
              <button
                onClick={() => setVentaPendiente(null)}
                className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Stock */}
      {modalTipo === 'stock' && productoSeleccionado && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl animate-scaleIn">
            <div className="p-8 pb-2 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Editar stock</h2>
                <p className="text-sm text-gray-500 mt-0.5">{productoSeleccionado.nombre}</p>
              </div>
              <button
                onClick={cerrarModal}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-8 pt-6">
              <label className="block text-sm font-medium text-gray-600 mb-2">Cantidad en stock</label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white transition-all"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-2">Stock actual: {productoSeleccionado.stock} unidades</p>
            </div>
            <div className="p-8 pt-4 flex gap-3 justify-end">
              <button
                onClick={cerrarModal}
                className="px-6 py-3 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleActualizarStock}
                disabled={guardando}
                className="px-6 py-3 bg-black text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {guardando ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Ingreso / Egreso de caja */}
      {modalMovimiento && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl animate-scaleIn">
            <div className="p-8 pb-2 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {modalMovimiento === 'ingreso' ? 'Registrar ingreso' : 'Registrar egreso'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {modalMovimiento === 'ingreso' ? 'Entrada de efectivo a caja' : 'Retiro de efectivo de caja'}
                </p>
              </div>
              <button
                onClick={() => { setModalMovimiento(null); setMovimientoForm({ monto: '', descripcion: '' }); }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-8 pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Monto (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={movimientoForm.monto}
                  onChange={(e) => setMovimientoForm({ ...movimientoForm, monto: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Descripcion</label>
                <input
                  type="text"
                  value={movimientoForm.descripcion}
                  onChange={(e) => setMovimientoForm({ ...movimientoForm, descripcion: e.target.value })}
                  placeholder={modalMovimiento === 'ingreso' ? 'Ej: Aporte, cambio, devolucion, etc.' : 'Ej: Pago proveedor, cambio, etc.'}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="p-8 pt-4 flex gap-3 justify-end">
              <button
                onClick={() => { setModalMovimiento(null); setMovimientoForm({ monto: '', descripcion: '' }); }}
                className="px-6 py-3 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarMovimiento}
                disabled={guardando}
                className={`px-6 py-3 text-white text-sm font-medium rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 ${
                  modalMovimiento === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {guardando ? 'Registrando...' : modalMovimiento === 'ingreso' ? 'Registrar ingreso' : 'Registrar egreso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // --- RENDER PRINCIPAL ---

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 md:px-6 lg:px-8 py-6 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-1">
            Kiosco
          </h1>
          <p className="text-gray-400 text-sm">
            Gestiona el inventario y las ventas del kiosco
          </p>
        </div>

        {/* Toast flotante */}
        {mensaje && (
          <div className={`fixed top-24 right-4 z-50 max-w-sm px-5 py-4 rounded-xl border shadow-lg flex items-center gap-3 text-sm animate-slideUp ${
            mensaje.tipo === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {mensaje.tipo === 'success' ? (
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {mensaje.texto}
          </div>
        )}

        {/* Caja del dia - solo admins */}
        {!empleado && <div className="mb-6">
          <div
            className="bg-gray-900 rounded-xl p-4 cursor-pointer transition-all hover:bg-gray-800"
            onClick={() => setCajaExpandida(!cajaExpandida)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Efectivo en caja</p>
                  <p className={`text-2xl font-bold ${saldoCaja >= 0 ? 'text-white' : 'text-red-400'}`}>
                    S/ {saldoCaja.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-gray-500">Apertura S/ {aperturaCaja.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Efectivo</p>
                  <p className="text-sm font-semibold text-emerald-400">+ S/ {totalEfectivoHoy.toFixed(2)}</p>
                </div>
                {totalIngresosHoy > 0 && (
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ingresos</p>
                    <p className="text-sm font-semibold text-emerald-400">+ S/ {totalIngresosHoy.toFixed(2)}</p>
                  </div>
                )}
                {totalEgresosHoy > 0 && (
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Egresos</p>
                    <p className="text-sm font-semibold text-red-400">- S/ {totalEgresosHoy.toFixed(2)}</p>
                  </div>
                )}
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${cajaExpandida ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Plin, Yape y QR */}
          <div className="flex items-center justify-between gap-2 mt-3 mb-1.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
              {fechaVistaDigital === hoyStr ? 'Pagos digitales de hoy' : 'Pagos digitales del día'}
            </p>
            <div className="flex items-center gap-2">
              {fechaVistaDigital !== hoyStr && (
                <button
                  onClick={() => setFechaDigital('')}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Ir a hoy
                </button>
              )}
              <input
                type="date"
                value={fechaVistaDigital}
                max={hoyStr}
                onChange={(e) => setFechaDigital(e.target.value === hoyStr ? '' : e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {METODOS_DIGITALES.map(m => (
              <div key={m.tipo} className={`${m.fondo} rounded-xl p-3`}>
                <p className={`text-[10px] uppercase tracking-widest font-semibold ${m.color}`}>{m.label}</p>
                <p className="text-lg font-bold text-gray-900">S/ {totalesDigitales[m.tipo].toFixed(2)}</p>
              </div>
            ))}
          </div>

          {/* Detalle expandido */}
          {cajaExpandida && (
            <div className="mt-2 bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              {/* Resumen movil */}
              <div className="flex gap-3 sm:hidden">
                <div className="flex-1 bg-emerald-50 rounded-lg p-3">
                  <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Efectivo</p>
                  <p className="text-sm font-bold text-emerald-700">+ S/ {totalEfectivoHoy.toFixed(2)}</p>
                </div>
                {totalIngresosHoy > 0 && (
                  <div className="flex-1 bg-emerald-50 rounded-lg p-3">
                    <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Ingresos</p>
                    <p className="text-sm font-bold text-emerald-700">+ S/ {totalIngresosHoy.toFixed(2)}</p>
                  </div>
                )}
                {totalEgresosHoy > 0 && (
                  <div className="flex-1 bg-red-50 rounded-lg p-3">
                    <p className="text-[10px] text-red-600 uppercase tracking-wider">Egresos</p>
                    <p className="text-sm font-bold text-red-700">- S/ {totalEgresosHoy.toFixed(2)}</p>
                  </div>
                )}
              </div>

              {/* Lista de ingresos de hoy */}
              {ingresosHoy.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Ingresos de hoy</p>
                  <div className="space-y-1.5">
                    {ingresosHoy.map((ingreso) => (
                      <div key={ingreso.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-700">{ingreso.descripcion}</p>
                          <p className="text-[11px] text-gray-400">
                            {new Date(ingreso.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-emerald-600">+ S/ {parseFloat(ingreso.monto).toFixed(2)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Eliminar este ingreso?')) eliminarIngresoCaja(ingreso.id);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de egresos de hoy */}
              {egresosHoy.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Egresos de hoy</p>
                  <div className="space-y-1.5">
                    {egresosHoy.map((egreso) => (
                      <div key={egreso.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-700">{egreso.descripcion}</p>
                          <p className="text-[11px] text-gray-400">
                            {new Date(egreso.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-red-600">- S/ {parseFloat(egreso.monto).toFixed(2)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Eliminar este egreso?')) eliminarEgresoCaja(egreso.id);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones registrar ingreso / egreso */}
              <div className="flex gap-2">
                <button
                  onClick={() => setModalMovimiento('ingreso')}
                  className="flex-1 py-2.5 border border-dashed border-gray-300 text-gray-500 text-sm font-medium rounded-lg hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Registrar ingreso
                </button>
                <button
                  onClick={() => setModalMovimiento('egreso')}
                  className="flex-1 py-2.5 border border-dashed border-gray-300 text-gray-500 text-sm font-medium rounded-lg hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  Registrar egreso
                </button>
              </div>
            </div>
          )}
        </div>}

        {/* Tabs pill-style */}
        <div className="flex gap-1 bg-gray-100 rounded-full p-1 w-fit mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.valor}
              onClick={() => { setTabActivo(tab.valor); setBusqueda(''); }}
              className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${
                tabActivo === tab.valor
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido del tab */}
        {tabActivo === 'inventario' && renderInventario()}
        {tabActivo === 'modo-venta' && <ModoVenta onMensaje={mostrarMensaje} />}
        {tabActivo === 'ventas' && renderVentas()}
        {tabActivo === 'historial' && renderHistorial()}
      </div>

      {/* Modales */}
      {renderModales()}
    </div>
  );
};

export default KioscoAdmin;
