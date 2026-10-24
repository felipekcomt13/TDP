import { useState, useRef, useCallback } from 'react';
import { useKiosco } from '../../context/KioscoContext';
import { useCuentas, CUENTAS } from '../../context/CuentasContext';
import { useLectorCodigoBarras } from '../../hooks/useLectorCodigoBarras';
import ModalCodigoNuevo from './ModalCodigoNuevo';

const formatearSoles = (monto) => `S/ ${Number(monto).toFixed(2)}`;

const normalizarCodigo = (codigo) => codigo.trim();

// Beep corto con Web Audio: agudo = agregado, grave = error / no encontrado.
// Si el navegador no deja reproducir audio, simplemente no suena.
let audioCtx = null;
const beep = (tipo = 'ok') => {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = tipo === 'ok' ? 1400 : 300;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + (tipo === 'ok' ? 0.08 : 0.25));
  } catch {
    // sin audio
  }
};

const METODOS_PAGO = [
  { id: 'efectivo', nombre: 'Efectivo', clase: 'bg-gray-900 text-white border-gray-900' },
  { id: 'plin', nombre: 'Plin QR', clase: 'bg-[#00D4AA] text-white border-[#00D4AA]' },
  ...CUENTAS.map(c => ({ id: c.id, nombre: c.nombre, clase: 'bg-amber-50 text-amber-800 border-amber-300', esCuenta: true })),
];

const ModoVenta = ({ onMensaje }) => {
  const { productos, registrarVentaLote } = useKiosco();
  const { registrarCargo } = useCuentas();

  // Carrito: [{ productoId, cantidad }]. El producto se lee siempre de
  // `productos` (que llega en tiempo real), así precio y stock están al día.
  const [carrito, setCarrito] = useState([]);
  const [tipoPago, setTipoPago] = useState('efectivo');
  const [cobrando, setCobrando] = useState(false);
  const [codigoNuevo, setCodigoNuevo] = useState(null);
  const [codigoManual, setCodigoManual] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [ultimoAgregado, setUltimoAgregado] = useState(null);
  const timeoutResaltado = useRef(null);

  const productoPorId = new Map(productos.map(p => [p.id, p]));
  const lineas = carrito
    .map(item => ({ ...item, producto: productoPorId.get(item.productoId) }))
    .filter(l => l.producto);
  const total = lineas.reduce((acc, l) => acc + parseFloat(l.producto.precio) * l.cantidad, 0);
  const unidades = lineas.reduce((acc, l) => acc + l.cantidad, 0);

  const resaltar = (productoId) => {
    setUltimoAgregado(productoId);
    clearTimeout(timeoutResaltado.current);
    timeoutResaltado.current = setTimeout(() => setUltimoAgregado(null), 1200);
  };

  const agregarAlCarrito = useCallback((producto) => {
    if (!producto.activo) {
      beep('error');
      onMensaje(`${producto.nombre} está inactivo`, 'error');
      return;
    }
    const enCarrito = carrito.find(i => i.productoId === producto.id)?.cantidad || 0;
    if (enCarrito + 1 > producto.stock) {
      beep('error');
      onMensaje(producto.stock === 0 ? `${producto.nombre}: sin stock` : `${producto.nombre}: solo hay ${producto.stock} en stock`, 'error');
      return;
    }
    beep('ok');
    setCarrito(prev => enCarrito > 0
      ? prev.map(i => i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      : [...prev, { productoId: producto.id, cantidad: 1 }]);
    resaltar(producto.id);
  }, [carrito, onMensaje]);

  const procesarCodigo = useCallback((codigoCrudo) => {
    const codigo = normalizarCodigo(codigoCrudo);
    if (!codigo) return;
    const producto = productos.find(p => p.codigo_barras && normalizarCodigo(p.codigo_barras) === codigo);
    if (producto) {
      agregarAlCarrito(producto);
    } else {
      beep('error');
      setCodigoNuevo(codigo);
    }
  }, [productos, agregarAlCarrito]);

  // La pistola funciona en toda la pantalla; se pausa mientras se cobra o
  // mientras está abierto el modal de código nuevo.
  useLectorCodigoBarras(procesarCodigo, { activo: !codigoNuevo && !cobrando });

  const cambiarCantidad = (productoId, delta) => {
    const producto = productoPorId.get(productoId);
    setCarrito(prev => prev
      .map(i => {
        if (i.productoId !== productoId) return i;
        const nueva = i.cantidad + delta;
        if (producto && nueva > producto.stock) {
          onMensaje(`${producto.nombre}: solo hay ${producto.stock} en stock`, 'error');
          return i;
        }
        return { ...i, cantidad: nueva };
      })
      .filter(i => i.cantidad > 0));
  };

  const quitar = (productoId) => setCarrito(prev => prev.filter(i => i.productoId !== productoId));

  const cobrar = async () => {
    if (lineas.length === 0 || cobrando) return;
    setCobrando(true);
    const metodo = METODOS_PAGO.find(m => m.id === tipoPago);
    try {
      const resultado = await registrarVentaLote(
        lineas.map(l => ({ productoId: l.productoId, cantidad: l.cantidad })),
        tipoPago
      );

      if (metodo?.esCuenta) {
        const detalle = lineas
          .map(l => `${l.producto.nombre}${l.cantidad > 1 ? ` x${l.cantidad}` : ''}`)
          .join(', ');
        try {
          await registrarCargo(tipoPago, Number(resultado.total), `Kiosco: ${detalle}`);
        } catch (error) {
          onMensaje(`Venta registrada, pero no se pudo cargar a ${metodo.nombre}: ${error.message}`, 'error');
          setCarrito([]);
          return;
        }
      }

      setCarrito([]);
      setTipoPago('efectivo');
      onMensaje(`Venta registrada: ${unidades} producto${unidades !== 1 ? 's' : ''} — ${formatearSoles(resultado.total)} — ${metodo?.nombre}`, 'success');
    } catch (error) {
      beep('error');
      onMensaje('Error: ' + error.message, 'error');
    } finally {
      setCobrando(false);
    }
  };

  const enviarCodigoManual = (e) => {
    e.preventDefault();
    procesarCodigo(codigoManual);
    setCodigoManual('');
    // Quitar el foco para que la pistola vuelva a funcionar sin abrir el teclado
    e.target.querySelector('input')?.blur();
  };

  const b = busqueda.trim().toLowerCase();
  const resultadosBusqueda = b
    ? productos
      .filter(p => p.activo && (p.nombre.toLowerCase().includes(b) || (p.codigo_barras || '').includes(b)))
      .slice(0, 8)
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-6 items-start">
      {/* Columna izquierda: estado del lector y búsqueda manual */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              {!codigoNuevo && !cobrando && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              )}
              <span className={`relative inline-flex h-3 w-3 rounded-full ${codigoNuevo || cobrando ? 'bg-gray-300' : 'bg-emerald-500'}`} />
            </span>
            <div>
              <p className="text-base font-bold text-gray-900">
                {cobrando ? 'Cobrando…' : codigoNuevo ? 'Lector en pausa' : 'Listo para escanear'}
              </p>
              <p className="text-sm text-gray-500">Apunta la pistola al código de barras del producto</p>
            </div>
          </div>

          <form onSubmit={enviarCodigoManual} className="mt-4 flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={codigoManual}
              onChange={(e) => setCodigoManual(e.target.value)}
              placeholder="O escribe el código y presiona Enter"
              className="flex-1 min-w-0 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
            />
            <button
              type="submit"
              disabled={!codigoManual.trim()}
              className="px-5 py-3 bg-black text-white text-sm font-bold rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition-all"
            >
              Agregar
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <label className="block text-sm font-bold text-gray-900 mb-1">Producto sin código</label>
          <p className="text-sm text-gray-500 mb-3">Búscalo por nombre y tócalo para agregarlo</p>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
          />
          {b && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {resultadosBusqueda.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">Sin resultados</p>
              ) : resultadosBusqueda.map(p => (
                <button
                  key={p.id}
                  onClick={() => { agregarAlCarrito(p); setBusqueda(''); }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-black active:scale-[0.98] transition-all text-left"
                >
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-500">{formatearSoles(p.precio)} · stock {p.stock}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Columna derecha: carrito y cobro */}
      <div className="rounded-2xl border border-gray-200 bg-white md:sticky md:top-24">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-gray-900">
            Carrito {unidades > 0 && <span className="text-gray-400 font-medium">({unidades})</span>}
          </h2>
          {lineas.length > 0 && (
            <button onClick={() => setCarrito([])} className="text-sm text-gray-400 hover:text-red-600 transition-colors">
              Vaciar
            </button>
          )}
        </div>

        {lineas.length === 0 ? (
          <div className="px-5 pb-8 pt-4 text-center">
            <p className="text-sm text-gray-400">Escanea un producto para empezar</p>
          </div>
        ) : (
          <ul className="px-3 max-h-[45vh] overflow-y-auto">
            {lineas.map(({ productoId, cantidad, producto }) => (
              <li
                key={productoId}
                className={`flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors ${
                  ultimoAgregado === productoId ? 'bg-emerald-50' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{producto.nombre}</p>
                  <p className="text-xs text-gray-500">{formatearSoles(producto.precio)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => cambiarCantidad(productoId, -1)}
                    aria-label={`Quitar uno de ${producto.nombre}`}
                    className="w-9 h-9 rounded-lg border border-gray-200 text-gray-700 text-lg font-bold active:scale-95"
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm font-bold">{cantidad}</span>
                  <button
                    onClick={() => cambiarCantidad(productoId, 1)}
                    aria-label={`Agregar uno de ${producto.nombre}`}
                    className="w-9 h-9 rounded-lg border border-gray-200 text-gray-700 text-lg font-bold active:scale-95"
                  >
                    +
                  </button>
                </div>
                <p className="w-20 text-right text-sm font-bold text-gray-900">
                  {formatearSoles(parseFloat(producto.precio) * cantidad)}
                </p>
                <button
                  onClick={() => quitar(productoId)}
                  aria-label={`Eliminar ${producto.nombre} del carrito`}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-gray-100 p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-500 uppercase tracking-wider">Total</span>
            <span className="text-3xl font-bold text-gray-900">{formatearSoles(total)}</span>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_PAGO.map(m => (
                <button
                  key={m.id}
                  onClick={() => setTipoPago(m.id)}
                  aria-pressed={tipoPago === m.id}
                  className={`py-3 px-2 rounded-xl border-2 text-xs font-bold uppercase tracking-wide transition-all ${
                    tipoPago === m.id ? `${m.clase} ring-2 ring-offset-2 ring-black` : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {m.nombre}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={cobrar}
            disabled={lineas.length === 0 || cobrando}
            className="w-full py-4 bg-black text-white text-base font-bold rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {cobrando ? 'Registrando…' : lineas.length === 0 ? 'Cobrar' : `Cobrar ${formatearSoles(total)}`}
          </button>
        </div>
      </div>

      {codigoNuevo && (
        <ModalCodigoNuevo
          codigo={codigoNuevo}
          onCerrar={() => setCodigoNuevo(null)}
          onListo={(producto) => {
            setCodigoNuevo(null);
            agregarAlCarrito(producto);
          }}
          onMensaje={onMensaje}
        />
      )}
    </div>
  );
};

export default ModoVenta;
