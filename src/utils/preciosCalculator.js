/**
 * Precios por deporte y franja horaria
 *
 * BASKET:
 *   Día (antes de 17:00): S/35/h
 *   Noche (17:00+):       S/50/h
 *
 * VOLEY:
 *   Día (antes de 17:00): S/30/h | desde 2h: S/25/h
 *   Noche (17:00+):       S/50/h | desde 2h: S/40/h
 */

const LIMITE_NOCHE = 17; // 5pm

export const TARIFAS = {
  basket: {
    dia: { base: 35 },
    noche: { base: 50 },
  },
  voley: {
    dia: { base: 30, desde2h: 25 },
    noche: { base: 50, desde2h: 40 },
  },
};

/**
 * Obtiene la tarifa por hora de un slot de 30 min según deporte y hora
 */
const tarifaSlot = (deporte, hora) => {
  const [h] = hora.split(':').map(Number);
  const config = TARIFAS[deporte] || TARIFAS.voley;
  return h < LIMITE_NOCHE ? config.dia : config.noche;
};

/**
 * Genera los slots de 30 min entre horaInicio y horaFin
 */
const generarSlots = (horaInicio, horaFin) => {
  const [hi, mi] = horaInicio.split(':').map(Number);
  const [hf, mf] = horaFin.split(':').map(Number);
  const minInicio = hi * 60 + mi;
  const minFin = hf * 60 + mf;
  const slots = [];
  for (let m = minInicio; m < minFin; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
  }
  return slots;
};

/**
 * Calcula el precio total de una reserva
 */
export const calcularPrecioReserva = (cancha, horaInicio, horaFin = null, deporte = 'voley') => {
  if (!horaInicio) return 0;
  if (!horaFin) {
    // 1 hora por defecto
    const [h, m] = horaInicio.split(':').map(Number);
    horaFin = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  const slots = generarSlots(horaInicio, horaFin);
  const totalMinutos = slots.length * 30;
  const totalHoras = totalMinutos / 60;
  const tiene2hOMas = totalHoras >= 2;

  let total = 0;
  for (const slot of slots) {
    const franja = tarifaSlot(deporte, slot);
    const tarifa = tiene2hOMas && franja.desde2h ? franja.desde2h : franja.base;
    total += tarifa * 0.5; // cada slot es media hora
  }

  return Math.round(total * 100) / 100;
};

/**
 * Obtiene desglose detallado del precio
 */
export const obtenerDesglosePrecio = (cancha, horaInicio, horaFin = null, deporte = 'voley') => {
  if (!horaInicio) return { precioTotal: 0, desglose: '', lineas: [] };
  if (!horaFin) {
    const [h, m] = horaInicio.split(':').map(Number);
    horaFin = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  const slots = generarSlots(horaInicio, horaFin);
  const totalMinutos = slots.length * 30;
  const totalHoras = totalMinutos / 60;
  const tiene2hOMas = totalHoras >= 2;

  // Agrupar slots por tarifa
  const grupos = {};
  for (const slot of slots) {
    const franja = tarifaSlot(deporte, slot);
    const tarifa = tiene2hOMas && franja.desde2h ? franja.desde2h : franja.base;
    if (!grupos[tarifa]) grupos[tarifa] = 0;
    grupos[tarifa] += 30; // minutos
  }

  const lineas = Object.entries(grupos).map(([tarifa, minutos]) => {
    const horas = minutos / 60;
    const horasLabel = horas % 1 === 0 ? `${horas}h` : `${horas}h`;
    return { tarifa: Number(tarifa), horas, label: `S/${tarifa}/h × ${horasLabel}` };
  });

  const precioTotal = lineas.reduce((sum, l) => sum + l.tarifa * l.horas, 0);

  return {
    precioTotal: Math.round(precioTotal * 100) / 100,
    numHoras: totalHoras,
    lineas,
    desglose: lineas.map(l => l.label).join(' + '),
  };
};

/**
 * Obtiene el nombre descriptivo de una cancha
 */
export const obtenerNombreCancha = (cancha) => {
  const nombres = {
    'principal': 'Cancha Principal',
    'anexa-1': 'Cancha Anexa 1',
    'anexa-2': 'Cancha Anexa 2'
  };
  return nombres[cancha] || cancha;
};

export const obtenerTipoHorario = () => 'Tarifa Regular';
