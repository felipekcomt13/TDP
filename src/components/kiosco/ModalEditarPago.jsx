import { useState } from 'react';
import { METODOS_PAGO, nombrePago } from '../../constants/metodosPago';

const centimos = (n) => Math.round(n * 100);
const formatearSoles = (n) => `S/ ${n.toFixed(2)}`;

// Corrige el método de pago de una venta ya registrada. Se edita el ticket completo
// (todas sus líneas comparten los mismos pagos); con varios métodos cada uno lleva
// su monto y la suma debe ser igual al total.
const ModalEditarPago = ({ venta, ventas, pagosPorTicket, onCerrar, onGuardar }) => {
  const lineas = venta.ticket_id ? ventas.filter(v => v.ticket_id === venta.ticket_id) : [venta];
  const total = lineas.reduce((acc, v) => acc + parseFloat(v.precio_venta) * v.cantidad, 0);

  // Pagos actuales del ticket. Las ventas antiguas sin filas de pagos usan su tipo_pago
  // si todavía es un método válido; si no (mixto, cuentas retiradas) se elige desde cero.
  const pagosActuales = (venta.ticket_id && pagosPorTicket.get(venta.ticket_id))
    || (METODOS_PAGO.some(m => m.id === venta.tipo_pago) ? [{ tipo_pago: venta.tipo_pago, monto: total }] : []);
  const idsValidos = pagosActuales.filter(p => METODOS_PAGO.some(m => m.id === p.tipo_pago));

  const [metodosSel, setMetodosSel] = useState(idsValidos.map(p => p.tipo_pago));
  const [montos, setMontos] = useState(
    idsValidos.length > 1 ? Object.fromEntries(idsValidos.map(p => [p.tipo_pago, parseFloat(p.monto).toFixed(2)])) : {}
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const variosMetodos = metodosSel.length > 1;
  const pagos = variosMetodos
    ? metodosSel.map(id => ({ tipoPago: id, monto: parseFloat(montos[id]) || 0 }))
    : metodosSel.map(id => ({ tipoPago: id, monto: total }));
  const restante = (centimos(total) - pagos.reduce((acc, p) => acc + centimos(p.monto), 0)) / 100;
  const pagosValidos = pagos.length > 0 && pagos.every(p => p.monto > 0) && restante === 0;

  const alternarMetodo = (id) => {
    setMetodosSel(prev => (prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]));
    setMontos({});
  };

  const guardar = async () => {
    if (!pagosValidos || guardando) return;
    setGuardando(true);
    setError('');
    try {
      await onGuardar(venta.id, pagos);
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
        <div className="p-6 pb-3">
          <h2 className="text-lg font-bold text-gray-900">Editar método de pago</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(venta.created_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="px-6 space-y-3">
          <ul className="bg-gray-50 rounded-xl divide-y divide-gray-100">
            {lineas.map(l => (
              <li key={l.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-gray-700 truncate">{l.nombre_producto}{l.cantidad > 1 ? ` x${l.cantidad}` : ''}</span>
                <span className="font-medium text-gray-900 ml-3">{formatearSoles(parseFloat(l.precio_venta) * l.cantidad)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between px-3 py-2 text-sm font-bold">
              <span>Total</span>
              <span>{formatearSoles(total)}</span>
            </li>
          </ul>

          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Método de pago <span className="normal-case tracking-normal">(elige uno o varios)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
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
            <div className="space-y-2">
              {metodosSel.map(id => (
                <div key={id} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-semibold text-gray-700">{nombrePago(id)}</span>
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
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={restante <= 0}
                    onClick={() => setMontos(prev => ({ ...prev, [id]: ((parseFloat(prev[id]) || 0) + restante).toFixed(2) }))}
                    className="px-3 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-40 transition-all"
                  >
                    Resto
                  </button>
                </div>
              ))}
              <p className={`text-sm font-medium ${restante === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {restante === 0
                  ? 'Los montos suman el total'
                  : restante > 0 ? `Faltan ${formatearSoles(restante)}` : `Sobran ${formatearSoles(-restante)}`}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="p-6 flex gap-3">
          <button
            onClick={onCerrar}
            disabled={guardando}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || !pagosValidos}
            className="flex-1 px-6 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEditarPago;
