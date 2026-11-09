// Agrupa los pagos de cada ticket: Map ticket_id -> [{ tipo_pago, monto }]
export const agruparPagosPorTicket = (pagos) => {
  const mapa = new Map();
  pagos.forEach(p => {
    if (!mapa.has(p.ticket_id)) mapa.set(p.ticket_id, []);
    mapa.get(p.ticket_id).push(p);
  });
  return mapa;
};

// Reparte el monto de una línea de venta entre los métodos con que se pagó su
// ticket, en proporción a lo pagado con cada uno. Las ventas anteriores a los
// pagos múltiples no tienen filas de pagos: se usan con su tipo_pago de siempre.
export const asignacionesPago = (venta, pagosPorTicket) => {
  const monto = parseFloat(venta.precio_venta) * venta.cantidad;
  const pagos = venta.ticket_id ? pagosPorTicket.get(venta.ticket_id) : null;
  if (!pagos || pagos.length === 0) return [{ tipo: venta.tipo_pago || 'efectivo', monto }];
  const totalPagos = pagos.reduce((s, p) => s + parseFloat(p.monto), 0);
  if (totalPagos <= 0) return [{ tipo: venta.tipo_pago || 'efectivo', monto }];
  return pagos.map(p => ({ tipo: p.tipo_pago, monto: monto * parseFloat(p.monto) / totalPagos }));
};
