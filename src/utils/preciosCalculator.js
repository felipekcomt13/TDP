/**
 * Utilidad para calcular precios de reservas según cancha
 *
 * Estructura de precios (POR HORA):
 * - Anexa 1 y Anexa 2: S/ 50/hora
 * - Principal: S/ 80/hora
 */

export const PRECIOS = {
  ANEXA: 50,
  PRINCIPAL: 80
};

/**
 * Calcula minutos entre dos horarios
 */
const calcularMinutos = (horaInicio, horaFin) => {
  const [hiHora, hiMin] = horaInicio.split(':').map(Number);
  const [hfHora, hfMin] = horaFin.split(':').map(Number);
  return Math.max(30, (hfHora * 60 + hfMin) - (hiHora * 60 + hiMin));
};

/**
 * Obtiene el precio base por hora según cancha
 */
const obtenerPrecioBase = (cancha) => {
  if (cancha === 'anexa-1' || cancha === 'anexa-2') return PRECIOS.ANEXA;
  if (cancha === 'principal') return PRECIOS.PRINCIPAL;
  return 0;
};

/**
 * Calcula el precio de una reserva según la cancha y horas
 */
export const calcularPrecioReserva = (cancha, horaInicio, horaFin = null) => {
  if (!cancha || !horaInicio) return 0;
  const precioPorHora = obtenerPrecioBase(cancha);
  if (!horaFin) return precioPorHora;
  return precioPorHora * (calcularMinutos(horaInicio, horaFin) / 60);
};

/**
 * Obtiene información detallada del precio (para mostrar desglose)
 */
export const obtenerDesglosePrecio = (cancha, horaInicio, horaFin = null) => {
  const precioPorHora = obtenerPrecioBase(cancha);

  if (!horaFin) {
    return {
      precioTotal: precioPorHora,
      numHoras: 1,
      precioPorHora,
      desglose: `${precioPorHora} soles/hora × 1 hora`,
    };
  }

  const min = calcularMinutos(horaInicio, horaFin);
  const horas = min / 60;
  const precioTotal = precioPorHora * horas;
  const horasLabel = horas % 1 === 0 ? `${horas} hora${horas > 1 ? 's' : ''}` : `${horas}h`;

  return {
    precioTotal,
    numHoras: horas,
    precioPorHora,
    desglose: `${precioPorHora} soles/hora × ${horasLabel}`,
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

/**
 * Obtiene el tipo de tarifa para mostrar al usuario
 */
export const obtenerTipoHorario = () => {
  return 'Tarifa Regular';
};
