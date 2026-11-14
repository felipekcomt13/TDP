import { useState } from 'react';
import { useKiosco } from '../../context/KioscoContext';
import { nombrePago, badgePago } from '../../constants/metodosPago';

const PAGINA = 50;

const TIPOS = [
  { valor: 'todo', label: 'Todo' },
  { valor: 'pago', label: 'Edición de pago' },
  { valor: 'stock', label: 'Stock' },
  { valor: 'ingreso', label: 'Ingresos' },
  { valor: 'egreso', label: 'Egresos' },
  { valor: 'eliminacion', label: 'Eliminados' }
];

const fechaLocal = (iso) => {
  const f = new Date(iso);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
};

const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const textoPagos = (pagos) =>
  pagos.map(p => `${nombrePago(p.tipo_pago)}${pagos.length > 1 ? ` S/ ${parseFloat(p.monto).toFixed(2)}` : ''}`).join(' + ');

const ListaPagos = ({ pagos }) => (
  <>
    {pagos.map((p, i) => (
      <span key={i} className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${badgePago(p.tipo_pago)}`}>
        {nombrePago(p.tipo_pago)}{pagos.length > 1 && ` S/ ${parseFloat(p.monto).toFixed(2)}`}
      </span>
    ))}
  </>
);

// Todo lo que modifica dinero o inventario fuera de una venta normal, en un solo lugar:
// ediciones de pago, altas y ajustes de stock, e ingresos y egresos de caja.
// Solo se muestra a los administradores (ver KioscoAdmin).
const AuditoriaKiosco = () => {
  const {
    ventas,
    ingresosCaja,
    egresosCaja,
    edicionesPago,
    eliminacionesCaja,
    movimientosStock,
    hayMasMovimientos,
    cargarMasMovimientosStock,
    nombreUsuario
  } = useKiosco();

  const [tipo, setTipo] = useState('todo');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [limite, setLimite] = useState(PAGINA);

  const enRango = (iso) => {
    const fecha = fechaLocal(iso);
    return !(desde && fecha < desde) && !(hasta && fecha > hasta);
  };
  const coincide = (...textos) => {
    if (!busqueda) return true;
    const b = busqueda.toLowerCase();
    return textos.some(t => t?.toLowerCase().includes(b));
  };

  // Una venta y su descuento de stock ocurren en la misma transacción, así que
  // comparten producto y marca de tiempo exacta: esas bajas no son ajustes manuales.
  const clavesVentas = new Set(ventas.map(v => `${v.producto_id}|${v.created_at}`));
  const esVenta = (m) => !m.es_alta && clavesVentas.has(`${m.producto_id}|${m.created_at}`);

  const entradas = [
    ...(tipo === 'todo' || tipo === 'pago' ? edicionesPago
      .filter(e => enRango(e.created_at) && coincide(e.detalle, nombreUsuario(e.usuario_id)))
      .map(e => ({ tipo: 'pago', id: `p-${e.id}`, fecha: e.created_at, dato: e })) : []),
    ...(tipo === 'todo' || tipo === 'stock' ? movimientosStock
      .filter(m => !esVenta(m) && enRango(m.created_at) && coincide(m.nombre_producto, nombreUsuario(m.usuario_id)))
      .map(m => ({ tipo: 'stock', id: `s-${m.id}`, fecha: m.created_at, dato: m })) : []),
    ...(tipo === 'todo' || tipo === 'ingreso' ? ingresosCaja
      .filter(i => enRango(i.created_at) && coincide(i.descripcion, nombreUsuario(i.registrado_por)))
      .map(i => ({ tipo: 'ingreso', id: `i-${i.id}`, fecha: i.created_at, dato: i })) : []),
    ...(tipo === 'todo' || tipo === 'egreso' ? egresosCaja
      .filter(e => enRango(e.created_at) && coincide(e.descripcion, nombreUsuario(e.registrado_por)))
      .map(e => ({ tipo: 'egreso', id: `e-${e.id}`, fecha: e.created_at, dato: e })) : []),
    ...(tipo === 'todo' || tipo === 'eliminacion' ? eliminacionesCaja
      .filter(e => enRango(e.created_at) && coincide(e.descripcion, nombreUsuario(e.eliminado_por), nombreUsuario(e.registrado_por)))
      .map(e => ({ tipo: 'eliminacion', id: `x-${e.id}`, fecha: e.created_at, dato: e })) : [])
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const visibles = entradas.slice(0, limite);
  // Los movimientos de stock se piden al servidor por tandas
  const hayMas = entradas.length > limite || ((tipo === 'todo' || tipo === 'stock') && hayMasMovimientos);
  const cargarMas = () => {
    setLimite(prev => prev + PAGINA);
    if ((tipo === 'todo' || tipo === 'stock') && hayMasMovimientos) cargarMasMovimientosStock();
  };

  const hayFiltros = desde || hasta || busqueda;

  const descripcionExcel = (e) => {
    const d = e.dato;
    if (e.tipo === 'pago') return [d.detalle, 'Edición de pago', `${textoPagos(d.pagos_anteriores)} → ${textoPagos(d.pagos_nuevos)}`, d.usuario_id, parseFloat(d.total)];
    if (e.tipo === 'stock') return [d.nombre_producto, d.es_alta ? 'Stock · Alta' : 'Stock · Ajuste', `${d.stock_anterior} → ${d.stock_nuevo} (${d.diferencia > 0 ? '+' : ''}${d.diferencia})`, d.usuario_id, null];
    if (e.tipo === 'ingreso') return [d.descripcion, 'Ingreso', '', d.registrado_por, parseFloat(d.monto)];
    if (e.tipo === 'eliminacion') return [d.descripcion, `${d.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} eliminado`, `Registrado por ${nombreUsuario(d.registrado_por)}`, d.eliminado_por, d.tipo === 'ingreso' ? -parseFloat(d.monto) : parseFloat(d.monto)];
    return [d.descripcion, 'Egreso', '', d.registrado_por, -parseFloat(d.monto)];
  };

  const exportarExcel = async () => {
    const { default: ExcelJS } = await import('exceljs');
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet('Auditoría');
    hoja.columns = [
      { header: 'Descripción', key: 'nombre', width: 40 },
      { header: 'Tipo', key: 'tipo', width: 18 },
      { header: 'Cambio', key: 'cambio', width: 44 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Hora', key: 'hora', width: 8 },
      { header: 'Responsable', key: 'responsable', width: 24 },
      { header: 'Monto (S/)', key: 'monto', width: 14, style: { numFmt: '0.00' } }
    ];
    hoja.getRow(1).font = { bold: true };
    entradas.forEach(e => {
      const [nombre, etiqueta, cambio, responsable, monto] = descripcionExcel(e);
      const f = new Date(e.fecha);
      hoja.addRow([nombre, etiqueta, cambio, f.toLocaleDateString('es-PE'), f.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }), nombreUsuario(responsable), monto]);
    });

    const buffer = await libro.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-kiosco-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fila = 'flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100';

  return (
    <>
      <div className="space-y-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setLimite(PAGINA); }}
            placeholder="Buscar por descripción, producto o responsable…"
            className="flex-1 min-w-[220px] px-4 py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
          />
          <button
            onClick={exportarExcel}
            disabled={entradas.length === 0}
            className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Exportar Excel
          </button>
          {hayFiltros && (
            <button
              onClick={() => { setDesde(''); setHasta(''); setBusqueda(''); setLimite(PAGINA); }}
              className="px-5 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
            >
              Limpiar
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={desde}
            onChange={(e) => { setDesde(e.target.value); setLimite(PAGINA); }}
            className="flex-1 px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
          />
          <span className="text-xs text-gray-400">a</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => { setHasta(e.target.value); setLimite(PAGINA); }}
            className="flex-1 px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map(t => (
            <button
              key={t.valor}
              onClick={() => { setTipo(t.valor); setLimite(PAGINA); }}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                tipo === t.valor ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {entradas.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl">
          <p className="text-gray-400 text-sm">
            {hayFiltros || tipo !== 'todo' ? 'No hay registros con estos filtros' : 'Aún no hay registros de auditoría'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {visibles.map(({ tipo: t, id, dato: d }) => {
              if (t === 'pago') {
                return (
                  <div key={id} className={fila}>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{d.detalle}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          Edición de pago
                        </span>
                        <span className="text-xs text-gray-400">{formatearFechaHora(d.created_at)}</span>
                        <ListaPagos pagos={d.pagos_anteriores} />
                        <span className="text-xs text-gray-400">→</span>
                        <ListaPagos pagos={d.pagos_nuevos} />
                        <span className="text-xs text-gray-500">
                          Por <span className="font-medium text-gray-700">{nombreUsuario(d.usuario_id)}</span>
                        </span>
                      </div>
                    </div>
                    <span className="ml-4 font-semibold text-gray-900 text-sm">S/ {parseFloat(d.total).toFixed(2)}</span>
                  </div>
                );
              }

              if (t === 'eliminacion') {
                return (
                  <div key={id} className={fila}>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{d.descripcion}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-900 text-white">
                          {d.tipo === 'ingreso' ? 'Ingreso eliminado' : 'Egreso eliminado'}
                        </span>
                        <span className="text-xs text-gray-400">{formatearFechaHora(d.created_at)}</span>
                        <span className="text-xs text-gray-500">
                          Eliminado por <span className="font-medium text-gray-700">{nombreUsuario(d.eliminado_por)}</span>
                        </span>
                        <span className="text-xs text-gray-400">
                          Registrado por {nombreUsuario(d.registrado_por)}{d.fecha_original && ` el ${formatearFechaHora(d.fecha_original)}`}
                        </span>
                      </div>
                    </div>
                    <span className="ml-4 font-semibold text-gray-400 text-sm line-through">S/ {parseFloat(d.monto).toFixed(2)}</span>
                  </div>
                );
              }

              if (t === 'ingreso' || t === 'egreso') {
                const esIngreso = t === 'ingreso';
                return (
                  <div key={id} className={fila}>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{d.descripcion}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${
                          esIngreso ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {esIngreso ? 'Ingreso' : 'Egreso'}
                        </span>
                        <span className="text-xs text-gray-400">{formatearFechaHora(d.created_at)}</span>
                        <span className="text-xs text-gray-500">
                          Registrado por <span className="font-medium text-gray-700">{nombreUsuario(d.registrado_por)}</span>
                        </span>
                      </div>
                    </div>
                    <span className={`ml-4 font-semibold text-sm ${esIngreso ? 'text-emerald-600' : 'text-red-600'}`}>
                      {esIngreso ? '+' : '-'} S/ {parseFloat(d.monto).toFixed(2)}
                    </span>
                  </div>
                );
              }

              return (
                <div key={id} className={fila}>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{d.nombre_producto}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${
                        d.es_alta ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {d.es_alta ? 'Stock · Alta' : 'Stock · Ajuste'}
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

          {hayMas && (
            <button
              onClick={cargarMas}
              className="mt-4 w-full py-3 bg-gray-50 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cargar mas
            </button>
          )}
        </>
      )}
    </>
  );
};

export default AuditoriaKiosco;
