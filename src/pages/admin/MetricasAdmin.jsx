import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useKiosco } from '../../context/KioscoContext';
import { useReservas } from '../../context/ReservasContext';
import { CANCHAS, CANCHAS_INFO, DEPORTES_INFO } from '../../constants/reservas';

const PERIODOS = [
  { id: 7, label: '7 días' },
  { id: 30, label: '30 días' },
  { id: 90, label: '90 días' },
  { id: 0, label: 'Todo' }
];

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_ORDEN = [1, 2, 3, 4, 5, 6, 0]; // Lunes a Domingo
const FRANJAS = [
  { id: 'manana', label: 'mañana', desde: 6, hasta: 12 },
  { id: 'tarde', label: 'tarde', desde: 12, hasta: 18 },
  { id: 'noche', label: 'noche', desde: 18, hasta: 24 }
];
const METODOS = { efectivo: 'Efectivo', plin: 'Plin QR' };

const soles = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n) => `${Math.round(n * 100)}%`;
const fechaISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const aMinutos = (hhmm) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
};
const horaLabel = (h) => `${String(h % 24).padStart(2, '0')}:00`;
const sumar = (mapa, clave, valor) => mapa.set(clave, (mapa.get(clave) || 0) + valor);
const ordenarDesc = (mapa) => [...mapa.entries()].sort((a, b) => b[1] - a[1]);

const Tarjeta = ({ titulo, valor, detalle }) => (
  <div className="border border-gray-200 rounded-2xl p-5">
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{titulo}</p>
    <p className="text-2xl font-bold text-black mt-1.5">{valor}</p>
    {detalle && <p className="text-xs text-gray-400 mt-1">{detalle}</p>}
  </div>
);

const Seccion = ({ titulo, subtitulo, children }) => (
  <section className="border border-gray-200 rounded-2xl p-5">
    <h2 className="text-sm font-bold text-black">{titulo}</h2>
    {subtitulo && <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

const Vacio = () => <p className="text-sm text-gray-400 py-4 text-center">Sin datos en este período</p>;

// Barras horizontales: filas = [{ label, valor, texto }]
const BarrasH = ({ filas }) => {
  if (filas.length === 0) return <Vacio />;
  const max = Math.max(...filas.map(f => f.valor), 1);
  return (
    <div className="space-y-2.5">
      {filas.map(f => (
        <div key={f.label}>
          <div className="flex justify-between gap-3 text-xs mb-1">
            <span className="text-gray-700 truncate">{f.label}</span>
            <span className="text-gray-500 flex-shrink-0">{f.texto}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-black rounded-full" style={{ width: `${(f.valor / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

// Columnas verticales: cols = [{ label, valor, titulo }]
const BarrasV = ({ cols }) => {
  if (cols.length === 0 || cols.every(c => c.valor === 0)) return <Vacio />;
  const max = Math.max(...cols.map(c => c.valor), 1);
  return (
    <div className="flex items-end gap-1 h-36">
      {cols.map(c => (
        <div key={c.label} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1" title={c.titulo}>
          <div className="w-full bg-black rounded-t" style={{ height: `${(c.valor / max) * 100}%`, minHeight: c.valor > 0 ? 2 : 0 }} />
          <span className="text-[10px] text-gray-400">{c.label}</span>
        </div>
      ))}
    </div>
  );
};

const MetricasAdmin = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { ventas, productos } = useKiosco();
  const { reservas } = useReservas();

  const [tab, setTab] = useState('kiosco');
  const [periodo, setPeriodo] = useState(30);

  useEffect(() => {
    if (!isAdmin()) navigate('/');
  }, [isAdmin, navigate]);

  const hoy = new Date();
  const hoyISO = fechaISO(hoy);
  const desde = useMemo(() => {
    const h = new Date();
    return periodo ? new Date(h.getFullYear(), h.getMonth(), h.getDate() - periodo + 1) : null;
  }, [periodo, hoyISO]);
  const desdeISO = desde ? fechaISO(desde) : null;

  // ---------------- KIOSCO ----------------
  const kiosco = useMemo(() => {
    const lista = ventas.filter(v => !desde || new Date(v.created_at) >= desde);
    const ingresos = lista.reduce((s, v) => s + Number(v.precio_venta) * v.cantidad, 0);
    const unidades = lista.reduce((s, v) => s + v.cantidad, 0);

    // Un ticket agrupa las líneas de un mismo carrito; las ventas viejas (sin
    // ticket_id) cuentan como un ticket por fila.
    const tickets = new Map();
    lista.forEach(v => {
      const clave = v.ticket_id || v.id;
      if (!tickets.has(clave)) tickets.set(clave, []);
      tickets.get(clave).push(v);
    });

    const porProducto = new Map();
    lista.forEach(v => {
      const p = porProducto.get(v.nombre_producto) || { unidades: 0, ingresos: 0 };
      p.unidades += v.cantidad;
      p.ingresos += Number(v.precio_venta) * v.cantidad;
      porProducto.set(v.nombre_producto, p);
    });
    const productosOrdenados = [...porProducto.entries()].map(([nombre, d]) => ({ nombre, ...d }));

    const porDia = new Map();
    const porHora = new Map();
    const porMetodo = new Map();
    lista.forEach(v => {
      const f = new Date(v.created_at);
      const monto = Number(v.precio_venta) * v.cantidad;
      sumar(porDia, fechaISO(f), monto);
      sumar(porHora, f.getHours(), monto);
      sumar(porMetodo, v.tipo_pago || 'efectivo', monto);
    });

    // Pares de productos que se compran juntos en el mismo ticket
    const pares = new Map();
    tickets.forEach(lineas => {
      const nombres = [...new Set(lineas.map(l => l.nombre_producto))].sort();
      for (let i = 0; i < nombres.length; i++) {
        for (let j = i + 1; j < nombres.length; j++) sumar(pares, `${nombres[i]} + ${nombres[j]}`, 1);
      }
    });

    const vendidos = new Set(lista.map(v => v.producto_id).filter(Boolean));
    const sinMovimiento = productos.filter(p => p.activo && !vendidos.has(p.id));
    const stockBajo = productos
      .filter(p => p.activo && p.stock <= 3)
      .sort((a, b) => a.stock - b.stock);

    return {
      ingresos, unidades,
      tickets: tickets.size,
      ticketPromedio: tickets.size ? ingresos / tickets.size : 0,
      topUnidades: [...productosOrdenados].sort((a, b) => b.unidades - a.unidades).slice(0, 8),
      topIngresos: [...productosOrdenados].sort((a, b) => b.ingresos - a.ingresos).slice(0, 8),
      porDia, porHora,
      porMetodo: ordenarDesc(porMetodo),
      pares: ordenarDesc(pares).filter(([, n]) => n >= 2).slice(0, 5),
      sinMovimiento, stockBajo
    };
  }, [ventas, productos, desde]);

  // Últimos días con ventas (máx. 30 columnas) para el gráfico diario
  const colsDia = useMemo(() => {
    const dias = periodo || 30;
    const cols = [];
    const n = Math.min(dias, 30);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
      const iso = fechaISO(d);
      const valor = kiosco.porDia.get(iso) || 0;
      cols.push({ label: String(d.getDate()), valor, titulo: `${iso}: ${soles(valor)}` });
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kiosco.porDia, periodo]);

  const colsHora = useMemo(() => {
    const horas = [...kiosco.porHora.keys()];
    if (horas.length === 0) return [];
    const min = Math.min(...horas);
    const max = Math.max(...horas);
    return Array.from({ length: max - min + 1 }, (_, i) => {
      const h = min + i;
      const valor = kiosco.porHora.get(h) || 0;
      return { label: String(h), valor, titulo: `${horaLabel(h)}: ${soles(valor)}` };
    });
  }, [kiosco.porHora]);

  // ---------------- RESERVAS ----------------
  const res = useMemo(() => {
    const enPeriodo = reservas.filter(r => (!desdeISO || r.fecha >= desdeISO) && r.fecha <= hoyISO);
    const confirmadas = enPeriodo.filter(r => r.estado === 'confirmada');
    const pendientes = reservas.filter(r => r.estado === 'pendiente').length;
    const rechazadas = enPeriodo.filter(r => r.estado === 'rechazada').length;

    const ingresos = confirmadas.reduce((s, r) => s + Number(r.montoTotal || 0), 0);
    const porCancha = new Map();
    const porDeporte = new Map();
    const porCliente = new Map();
    // Ocupación en "medias canchas": la principal ocupa las dos mitades.
    // Cada celda [día][hora] acumula medias-canchas·hora ocupadas.
    const celdas = Array.from({ length: 7 }, () => new Map());
    let horasTotales = 0;

    confirmadas.forEach(r => {
      const ini = aMinutos(r.hora);
      const fin = r.horaFin ? aMinutos(r.horaFin) : ini + 60;
      const horas = Math.max(fin - ini, 30) / 60;
      horasTotales += horas;
      sumar(porCancha, r.cancha, horas);
      sumar(porDeporte, r.deporte, 1);
      sumar(porCliente, r.nombre, 1);

      const [y, m, d] = r.fecha.split('-').map(Number);
      const dia = new Date(y, m - 1, d).getDay();
      const peso = r.cancha === CANCHAS.PRINCIPAL ? 2 : 1;
      for (let t = ini; t < Math.max(fin, ini + 30); t += 30) {
        sumar(celdas[dia], Math.floor(t / 60), 0.5 * peso);
      }
    });

    // Cuántas veces ocurrió cada día de la semana en el período (denominador)
    const inicio = desde || (reservas.length ? new Date(Math.min(...reservas.map(r => new Date(`${r.fecha}T00:00`)))) : hoy);
    const ocurrencias = Array(7).fill(0);
    for (let d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()); fechaISO(d) <= hoyISO; d.setDate(d.getDate() + 1)) {
      ocurrencias[d.getDay()] += 1;
    }

    return { enPeriodo, confirmadas, pendientes, rechazadas, ingresos, porCancha, porDeporte, porCliente, celdas, ocurrencias, horasTotales };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservas, desdeISO, hoyISO]);

  const ocupacion = (dia, hora) => {
    const veces = res.ocurrencias[dia];
    if (!veces) return 0;
    return (res.celdas[dia].get(hora) || 0) / (veces * 2);
  };

  const rangoHoras = useMemo(() => {
    let min = 6;
    let max = 23;
    res.celdas.forEach(m => m.forEach((_, h) => {
      if (h < min) min = h;
      if (h > max) max = h;
    }));
    return Array.from({ length: Math.min(max, 26) - min + 1 }, (_, i) => min + i);
  }, [res.celdas]);

  const porHoraGlobal = useMemo(() => rangoHoras.map(h => {
    const total = DIAS_ORDEN.reduce((s, d) => s + (res.celdas[d].get(h) || 0), 0);
    return { label: String(h % 24), valor: total, titulo: `${horaLabel(h)}: ${total} medias-canchas·hora` };
  }), [rangoHoras, res.celdas]);

  const porDiaSemana = useMemo(() => DIAS_ORDEN.map(d => {
    const total = [...res.celdas[d].values()].reduce((s, v) => s + v, 0);
    return { label: DIAS[d].slice(0, 3), valor: total, titulo: `${DIAS[d]}: ${total} medias-canchas·hora` };
  }), [res.celdas]);

  // Franjas (día × mañana/tarde/noche) ordenadas por ocupación, base de las promociones
  const franjas = useMemo(() => {
    const lista = [];
    DIAS_ORDEN.forEach(d => {
      FRANJAS.forEach(f => {
        let suma = 0;
        let n = 0;
        for (let h = f.desde; h < f.hasta; h++) { suma += ocupacion(d, h); n += 1; }
        lista.push({ dia: d, franja: f, ocupacion: suma / n });
      });
    });
    return lista.sort((a, b) => a.ocupacion - b.ocupacion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res]);

  const promociones = useMemo(() => {
    const out = [];
    if (res.confirmadas.length < 10) return out;
    franjas.filter(f => f.ocupacion < 0.25).slice(0, 3).forEach(f => {
      out.push({
        titulo: `Descuento ${DIAS[f.dia]} por la ${f.franja.label}`,
        detalle: `Solo el ${pct(f.ocupacion)} de la capacidad se usa en ese horario. Una tarifa reducida o "2da hora gratis" puede llenarlo.`
      });
    });
    const pico = [...franjas].reverse().find(f => f.ocupacion >= 0.6);
    if (pico) {
      out.push({
        titulo: `Cuidado con descontar el ${DIAS[pico.dia]} por la ${pico.franja.label}`,
        detalle: `Ya está al ${pct(pico.ocupacion)}. Es tu horario fuerte: mantén el precio o considera una tarifa de hora pico.`
      });
    }
    const clientesFrecuentes = [...res.porCliente.values()].filter(n => n >= 4).length;
    if (clientesFrecuentes > 0) {
      out.push({
        titulo: 'Paquete o membresía para clientes frecuentes',
        detalle: `${clientesFrecuentes} cliente(s) reservaron 4 veces o más en el período. Un pack de reservas fidelizaría a los que ya vuelven.`
      });
    }
    if (kiosco.pares.length > 0) {
      out.push({
        titulo: `Combo en el kiosco: ${kiosco.pares[0][0]}`,
        detalle: `Se compraron juntos ${kiosco.pares[0][1]} veces. Un precio combo o ofrecerlo con la reserva puede subir el ticket.`
      });
    }
    return out;
  }, [franjas, res, kiosco.pares]);

  const heatmapColor = (v) => ({ backgroundColor: `rgba(0,0,0,${Math.min(v, 1) * 0.9 + (v > 0 ? 0.06 : 0)})`, color: v > 0.5 ? '#fff' : '#111' });

  const topFranjaLlena = franjas.length ? franjas[franjas.length - 1] : null;

  return (
    <div className="bg-white min-h-full">
      <div className="px-6 lg:px-8 py-12 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black tracking-tight mb-2">MÉTRICAS</h1>
          <p className="text-gray-600 text-sm tracking-wide">Ventas del kiosco y demanda de reservas</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div className="flex gap-1 bg-gray-100 rounded-full p-1">
            {[{ id: 'kiosco', label: 'Kiosco' }, { id: 'reservas', label: 'Reservas' }].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${tab === t.id ? 'bg-black text-white shadow-sm' : 'text-gray-500'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {PERIODOS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all ${periodo === p.id ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'kiosco' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Tarjeta titulo="Ingresos" valor={soles(kiosco.ingresos)} />
              <Tarjeta titulo="Tickets" valor={kiosco.tickets} detalle={`${kiosco.unidades} unidades vendidas`} />
              <Tarjeta titulo="Ticket promedio" valor={soles(kiosco.ticketPromedio)} />
              <Tarjeta
                titulo="Producto estrella"
                valor={kiosco.topUnidades[0]?.nombre || '—'}
                detalle={kiosco.topUnidades[0] ? `${kiosco.topUnidades[0].unidades} unidades` : null}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <Seccion titulo="Más vendidos" subtitulo="Por unidades">
                <BarrasH filas={kiosco.topUnidades.map(p => ({ label: p.nombre, valor: p.unidades, texto: `${p.unidades} u.` }))} />
              </Seccion>
              <Seccion titulo="Los que más dinero dejan" subtitulo="Por ingresos">
                <BarrasH filas={kiosco.topIngresos.map(p => ({ label: p.nombre, valor: p.ingresos, texto: soles(p.ingresos) }))} />
              </Seccion>
            </div>

            <Seccion titulo="Ventas por día" subtitulo={`Últimos ${Math.min(periodo || 30, 30)} días (el número es el día del mes)`}>
              <BarrasV cols={colsDia} />
            </Seccion>

            <div className="grid lg:grid-cols-2 gap-5">
              <Seccion titulo="Horas con más ventas" subtitulo="Ingresos por hora del día">
                <BarrasV cols={colsHora} />
              </Seccion>
              <Seccion titulo="Método de pago">
                <BarrasH filas={kiosco.porMetodo.map(([id, monto]) => ({
                  label: METODOS[id] || id.charAt(0).toUpperCase() + id.slice(1),
                  valor: monto,
                  texto: `${soles(monto)} · ${pct(kiosco.ingresos ? monto / kiosco.ingresos : 0)}`
                }))} />
              </Seccion>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <Seccion titulo="Se compran juntos" subtitulo="Productos en un mismo ticket (mín. 2 veces)">
                {kiosco.pares.length === 0 ? <p className="text-sm text-gray-400">Aún no hay suficientes tickets con varios productos</p> : (
                  <BarrasH filas={kiosco.pares.map(([par, n]) => ({ label: par, valor: n, texto: `${n} veces` }))} />
                )}
              </Seccion>
              <Seccion titulo="Atención de inventario">
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Stock bajo (3 o menos)</p>
                    {kiosco.stockBajo.length === 0 ? <p className="text-gray-400">Todo con stock suficiente</p> : (
                      <p className="text-gray-600">{kiosco.stockBajo.map(p => `${p.nombre} (${p.stock})`).join(' · ')}</p>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Activos sin ventas en el período</p>
                    {kiosco.sinMovimiento.length === 0 ? <p className="text-gray-400">Todos tuvieron al menos una venta</p> : (
                      <p className="text-gray-600">{kiosco.sinMovimiento.map(p => p.nombre).join(' · ')}</p>
                    )}
                  </div>
                </div>
              </Seccion>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Tarjeta titulo="Reservas confirmadas" valor={res.confirmadas.length} detalle={`${res.rechazadas} rechazadas · ${res.pendientes} pendientes ahora`} />
              <Tarjeta titulo="Ingresos" valor={soles(res.ingresos)} detalle="Solo confirmadas" />
              <Tarjeta titulo="Horas reservadas" valor={res.horasTotales.toFixed(1)} detalle="Suma de todas las canchas" />
              <Tarjeta
                titulo="Horario más lleno"
                valor={topFranjaLlena ? `${DIAS[topFranjaLlena.dia]} ${topFranjaLlena.franja.label}` : '—'}
                detalle={topFranjaLlena ? `${pct(topFranjaLlena.ocupacion)} de ocupación` : null}
              />
            </div>

            <Seccion titulo="Mapa de ocupación" subtitulo="Cuanto más oscuro, más ocupado. La cancha principal cuenta como las dos anexas.">
              {res.confirmadas.length === 0 ? <Vacio /> : (
                <div className="overflow-x-auto">
                  <table className="text-[10px] border-separate border-spacing-0.5 w-full">
                    <thead>
                      <tr>
                        <th />
                        {rangoHoras.map(h => <th key={h} className="font-normal text-gray-400 px-1">{h % 24}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {DIAS_ORDEN.map(d => (
                        <tr key={d}>
                          <td className="text-xs text-gray-600 pr-2 whitespace-nowrap">{DIAS[d].slice(0, 3)}</td>
                          {rangoHoras.map(h => {
                            const v = ocupacion(d, h);
                            return (
                              <td key={h} title={`${DIAS[d]} ${horaLabel(h)}: ${pct(v)}`} className="h-7 min-w-[18px] rounded text-center" style={heatmapColor(v)}>
                                {v > 0 ? Math.round(v * 100) : ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Seccion>

            <div className="grid lg:grid-cols-2 gap-5">
              <Seccion titulo="Horas más reservadas" subtitulo="Hora de inicio del bloque (24 h)">
                <BarrasV cols={porHoraGlobal} />
              </Seccion>
              <Seccion titulo="Días más reservados">
                <BarrasV cols={porDiaSemana} />
              </Seccion>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <Seccion titulo="Por cancha" subtitulo="Horas reservadas">
                <BarrasH filas={ordenarDesc(res.porCancha).map(([c, h]) => ({ label: CANCHAS_INFO[c]?.nombre || c, valor: h, texto: `${h.toFixed(1)} h` }))} />
              </Seccion>
              <Seccion titulo="Por deporte" subtitulo="Cantidad de reservas">
                <BarrasH filas={ordenarDesc(res.porDeporte).map(([d, n]) => ({ label: DEPORTES_INFO[d]?.nombre || d, valor: n, texto: `${n}` }))} />
              </Seccion>
            </div>

            <Seccion titulo="Propuestas de promociones" subtitulo="Calculadas con la ocupación real del período seleccionado">
              {promociones.length === 0 ? (
                <p className="text-sm text-gray-400">Se necesitan al menos 10 reservas confirmadas en el período para proponer promociones.</p>
              ) : (
                <ul className="space-y-3">
                  {promociones.map(p => (
                    <li key={p.titulo} className="border border-gray-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-black">{p.titulo}</p>
                      <p className="text-xs text-gray-500 mt-1">{p.detalle}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricasAdmin;
