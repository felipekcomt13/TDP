/**
 * Tarifa de alquiler de cancha
 *
 * Tarifa única: ya no distingue basket de vóley (antes sí lo hacía).
 *
 *   Turno día   (antes de las 18:00): 1h = S/35 | 1.5h = S/50 | 2h = S/65
 *   Turno noche (18:00 en adelante):  1h = S/60 | 1.5h = S/75 | 2h = S/90
 *
 * En ambos turnos cada media hora adicional a la primera hora cuesta
 * exactamente S/15 más (35→50→65 y 60→75→90). Eso permite modelar el precio
 * como "primer bloque de 30 min" + "S/15 por cada bloque de 30 min extra",
 * lo que reproduce la tabla exacta de arriba y además se extiende de forma
 * razonable a duraciones que el negocio no cotizó explícitamente:
 *   - Menos de 1 hora (ej. 30 min sueltos): un bloque menos que 1h, mismo
 *     salto de S/15 hacia abajo (S/20 día, S/45 noche).
 *   - Más de 2 horas: se sigue sumando S/15 por cada media hora extra.
 *
 * El turno de toda la reserva lo determina la hora en que EMPIEZA (si
 * alguien reserva de 17:30 a 19:00, paga turno día completo) — es la regla
 * más simple y predecible para el cliente.
 */

const INICIO_TURNO_NOCHE = 18; // 6:00 pm

const PRIMER_BLOQUE = { dia: 20, noche: 45 }; // precio de los primeros 30 min
const BLOQUE_ADICIONAL = 15; // precio de cada bloque de 30 min extra, en ambos turnos

// Tabla de referencia para mostrar en pantalla (p. ej. CampoPage), derivada
// de las mismas constantes que usa el cálculo real para que nunca se desincronicen.
export const TARIFAS = {
  dia: {
    '1h': PRIMER_BLOQUE.dia + BLOQUE_ADICIONAL,
    '1.5h': PRIMER_BLOQUE.dia + BLOQUE_ADICIONAL * 2,
    '2h': PRIMER_BLOQUE.dia + BLOQUE_ADICIONAL * 3,
  },
  noche: {
    '1h': PRIMER_BLOQUE.noche + BLOQUE_ADICIONAL,
    '1.5h': PRIMER_BLOQUE.noche + BLOQUE_ADICIONAL * 2,
    '2h': PRIMER_BLOQUE.noche + BLOQUE_ADICIONAL * 3,
  },
};

/**
 * Determina el turno (dia/noche) a partir de una hora 'HH:MM'
 */
const obtenerTurno = (hora) => {
  const [h] = hora.split(':').map(Number);
  return h >= INICIO_TURNO_NOCHE ? 'noche' : 'dia';
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

const calcularTotal = (horaInicio, numSlots) => {
  if (numSlots <= 0) return 0;
  const turno = obtenerTurno(horaInicio);
  const total = PRIMER_BLOQUE[turno] + (numSlots - 1) * BLOQUE_ADICIONAL;
  return { total: Math.round(total * 100) / 100, turno };
};

/**
 * Calcula el precio total de una reserva.
 * `cancha` y `deporte` ya no afectan el precio (tarifa única); se
 * mantienen en la firma para no romper a quienes ya llaman esta función.
 */
export const calcularPrecioReserva = (cancha, horaInicio, horaFin = null) => {
  if (!horaInicio) return 0;
  if (!horaFin) {
    // 1 hora por defecto
    const [h, m] = horaInicio.split(':').map(Number);
    horaFin = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  const slots = generarSlots(horaInicio, horaFin);
  const { total } = calcularTotal(horaInicio, slots.length);
  return total;
};

/**
 * Obtiene desglose detallado del precio
 */
export const obtenerDesglosePrecio = (cancha, horaInicio, horaFin = null) => {
  if (!horaInicio) return { precioTotal: 0, desglose: '', lineas: [], numHoras: 0 };
  if (!horaFin) {
    const [h, m] = horaInicio.split(':').map(Number);
    horaFin = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  const slots = generarSlots(horaInicio, horaFin);
  const numHoras = (slots.length * 30) / 60;
  const { total: precioTotal, turno } = calcularTotal(horaInicio, slots.length);
  const bloquesAdicionales = slots.length - 1;

  const lineas = [
    { tarifa: PRIMER_BLOQUE[turno], label: `S/${PRIMER_BLOQUE[turno]} primera media hora (turno ${turno})` },
  ];
  if (bloquesAdicionales > 0) {
    lineas.push({
      tarifa: BLOQUE_ADICIONAL * bloquesAdicionales,
      label: `S/${BLOQUE_ADICIONAL} × ${bloquesAdicionales} bloque${bloquesAdicionales !== 1 ? 's' : ''} de 30 min`,
    });
  }

  return {
    precioTotal,
    numHoras,
    turno,
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

export const obtenerTipoHorario = (hora) => {
  if (!hora) return 'Tarifa Regular';
  return obtenerTurno(hora) === 'noche' ? 'Turno noche' : 'Turno día';
};
