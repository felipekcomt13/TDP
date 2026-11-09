import { useState, useRef, useCallback } from 'react';
import { useKiosco } from '../../context/KioscoContext';
import { useLectorCodigoBarras } from '../../hooks/useLectorCodigoBarras';
import { METODOS_PAGO, nombrePago } from '../../constants/metodosPago';
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

const ModoVenta = ({ onMensaje }) => {
  const { productos, registrarVentaLote } = useKiosco();

  // Carrito: [{ productoId, cantidad }]. El producto se lee siempre de
  // `productos` (que llega en tiempo real), así precio y stock están al día.
  const [carrito, setCarrito] = useState([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  // Métodos con los que se paga la venta. Empieza vacío: quien cobra elige.
  // Con uno solo se cobra el total; con varios, cada uno lleva su monto y la
  // suma debe ser igual al total.
  const [metodosSel, setMetodosSel] = useState([]);
  const [montos, setMontos] = useState({});
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

  const centimos = (n) => Math.round(n * 100);
  const variosMetodos = metodosSel.length > 1;
  const pagos = variosMetodos
    ? metodosSel.map(id => ({ tipoPago: id, monto: parseFloat(montos[id]) || 0 }))
    : metodosSel.map(id => ({ tipoPago: id, monto: total }));
  const restante = (centimos(total) - pagos.reduce((acc, p) => acc + centimos(p.monto), 0)) / 100;
  const pagosValidos = pagos.length > 0 && pagos.every(p => p.monto > 0) && restante === 0;

  const alternarMetodo = (id) => {
    setMetodosSel(prev => {
      if (!prev.includes(id)) return [...prev, id];
      return prev.filter(m => m !== id);
    });
    setMontos({});
  };

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
    setCarritoAbierto(true);
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

  // La pistola funciona en toda la pantalla (también con el modal de venta
  // abierto, para seguir agregando productos); se pausa mientras se cobra o
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

  const vaciarVenta = () => {
    setMetodosSel([]);
    setMontos({});
    setCarrito([]);
    setCarritoAbierto(false);
  };

  const cobrar = async () => {
    if (lineas.length === 0 || cobrando || !pagosValidos) return;
    setCobrando(true);
    try {
      const resultado = await registrarVentaLote(
        lineas.map(l => ({ productoId: l.productoId, cantidad: l.cantidad })),
        pagos
      );

      vaciarVenta();
      const detallePago = pagos.map(p => `${nombrePago(p.tipoPago)}${variosMetodos ? ` ${formatearSoles(p.monto)}` : ''}`).join(' + ');
      onMensaje(`Venta registrada: ${unidades} producto${unidades !== 1 ? 's' : ''} — ${formatearSoles(resultado.total)} — ${detallePago}`, 'success');
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
    <div className="max-w-3xl space-y-4">
      {/* Estado del lector y código manual */}
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

      {/* Para volver a la venta si se cerró el modal sin cobrar */}
      {lineas.length > 0 && !carritoAbierto && (
        <button
          onClick={() => setCarritoAbierto(true)}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-96 z-30 flex items-center justify-between gap-4 px-6 py-4 bg-black text-white rounded-2xl shadow-2xl active:scale-[0.98] transition-all"
        >
          <span className="text-sm font-bold">Ver venta ({unidades})</span>
          <span className="text-lg font-bold">{formatearSoles(total)}</span>
        </button>
      )}

      {/* Modal de venta: lo ve el cliente mientras se escanea */}
      {carritoAbierto && lineas.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[95vh] flex flex-col rounded-3xl shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Venta en curso</h2>
                <p className="text-sm text-gray-500">
                  {cobrando ? 'Registrando…' : 'Sigue escaneando para agregar más productos'}
                </p>
              </div>
              <button
                onClick={() => setCarritoAbierto(false)}
                aria-label="Cerrar y seguir escaneando"
                className="text-gray-400 hover:text-black text-4xl leading-none"
              >
                ×
              </button>
            </div>

            <ul className="px-4 flex-1 overflow-y-auto min-h-0">
              {lineas.map(({ productoId, cantidad, producto }) => (
                <li
                  key={productoId}
                  className={`flex items-center gap-4 px-2 py-3 rounded-2xl transition-colors ${
                    ultimoAgregado === productoId ? 'bg-emerald-50' : ''
                  }`}
                >
                  {producto.imagen_url ? (
                    <img src={producto.imagen_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-gray-900 truncate">{producto.nombre}</p>
                    <p className="text-sm text-gray-500">{formatearSoles(producto.precio)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cambiarCantidad(productoId, -1)}
                      aria-label={`Quitar uno de ${producto.nombre}`}
                      className="w-11 h-11 rounded-xl border border-gray-200 text-gray-700 text-xl font-bold active:scale-95"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-lg font-bold">{cantidad}</span>
                    <button
                      onClick={() => cambiarCantidad(productoId, 1)}
                      aria-label={`Agregar uno de ${producto.nombre}`}
                      className="w-11 h-11 rounded-xl border border-gray-200 text-gray-700 text-xl font-bold active:scale-95"
                    >
                      +
                    </button>
                  </div>
                  <p className="w-24 text-right text-lg font-bold text-gray-900">
                    {formatearSoles(parseFloat(producto.precio) * cantidad)}
                  </p>
                  <button
                    onClick={() => quitar(productoId)}
                    aria-label={`Eliminar ${producto.nombre} del carrito`}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 text-xl"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-100 p-6 space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-500 uppercase tracking-wider">
                  Total · {unidades} producto{unidades !== 1 ? 's' : ''}
                </span>
                <span className="text-5xl font-bold text-gray-900">{formatearSoles(total)}</span>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Método de pago <span className="normal-case tracking-normal">(elige uno o varios)</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {METODOS_PAGO.map(m => (
                    <button
                      key={m.id}
                      onClick={() => alternarMetodo(m.id)}
                      aria-pressed={metodosSel.includes(m.id)}
                      className={`py-3 px-2 rounded-xl border-2 text-xs font-bold uppercase tracking-wide transition-all ${
                        metodosSel.includes(m.id) ? `${m.clase} ring-2 ring-offset-2 ring-black` : 'bg-white text-gray-500 border-gray-200'
                      }`}
                    >
                      {m.nombre}
                    </button>
                  ))}
                </div>

                {variosMetodos && (
                  <div className="mt-4 space-y-2">
                    {metodosSel.map(id => (
                      <div key={id} className="flex items-center gap-3">
                        <span className="w-20 text-sm font-semibold text-gray-700">{nombrePago(id)}</span>
                        <div className="relative flex-1">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">S/</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.10"
                            value={montos[id] ?? ''}
                            onChange={(e) => setMontos(prev => ({ ...prev, [id]: e.target.value }))}
                            placeholder="0.00"
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={restante <= 0}
                          onClick={() => setMontos(prev => ({ ...prev, [id]: ((parseFloat(prev[id]) || 0) + restante).toFixed(2) }))}
                          className="px-3 py-3 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-40 transition-all"
                        >
                          Resto
                        </button>
                      </div>
                    ))}
                    <p className={`text-sm font-medium ${restante === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {restante === 0
                        ? 'Los montos suman el total'
                        : restante > 0
                          ? `Faltan ${formatearSoles(restante)}`
                          : `Sobran ${formatearSoles(-restante)}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={vaciarVenta}
                  disabled={cobrando}
                  className="px-5 py-4 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all"
                >
                  Cancelar venta
                </button>
                <button
                  onClick={cobrar}
                  disabled={cobrando || !pagosValidos}
                  className="flex-1 py-4 bg-black text-white text-lg font-bold rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {cobrando ? 'Registrando…' : metodosSel.length === 0 ? 'Elige un método de pago' : `Cobrar ${formatearSoles(total)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
