/**
 * Utilidad para calcular precios de reservas según cancha y tipo de usuario
 *
 * Estructura de precios (POR HORA):
 * - Anexa 1 y Anexa 2: Socio S/ 40/hora, No Socio S/ 50/hora
 * - Principal: Socio S/ 70/hora, No Socio S/ 80/hora
 */

// Constantes de precios (por hora) - diferenciados por tipo de usuario
export const PRECIOS = {
  ANEXA: { SOCIO: 40, NO_SOCIO: 50 },
  PRINCIPAL: { SOCIO: 70, NO_SOCIO: 80 }
};

/**
 * Calcula el número de horas entre dos horarios
 * @param {string} horaInicio - Hora en formato 'HH:MM'
 * @param {string} horaFin - Hora en formato 'HH:MM'
 * @returns {number} Número de horas (redondeado hacia arriba)
 */
const calcularNumeroDeHoras = (horaInicio, horaFin) => {
  // Parsear horas
  const [hiHora, hiMin] = horaInicio.split(':').map(Number);
  const [hfHora, hfMin] = horaFin.split(':').map(Number);

  // Calcular diferencia en minutos
  const minutosInicio = hiHora * 60 + hiMin;
  const minutosFin = hfHora * 60 + hfMin;
  const diferenciaMinutos = minutosFin - minutosInicio;

  // Convertir a horas (redondeando hacia arriba)
  return Math.max(1, Math.ceil(diferenciaMinutos / 60));
};

/**
 * Obtiene el precio base por hora según cancha y si es socio
 * @param {string} cancha - 'principal', 'anexa-1', o 'anexa-2'
 * @param {boolean} esSocio - Si el usuario es socio
 * @returns {number} Precio base por hora
 */
const obtenerPrecioBase = (cancha, esSocio = false) => {
  const tipoTarifa = esSocio ? 'SOCIO' : 'NO_SOCIO';

  // Canchas anexas
  if (cancha === 'anexa-1' || cancha === 'anexa-2') {
    return PRECIOS.ANEXA[tipoTarifa];
  }

  // Cancha principal
  if (cancha === 'principal') {
    return PRECIOS.PRINCIPAL[tipoTarifa];
  }

  return 0;
};

/**
 * Calcula el precio de una reserva según la cancha, horas y tipo de usuario
 * @param {string} cancha - 'principal', 'anexa-1', o 'anexa-2'
 * @param {string} horaInicio - Hora en formato 'HH:MM' (ej: '14:00', '18:00')
 * @param {string} horaFin - Hora fin en formato 'HH:MM' (opcional, default = 1 hora después)
 * @param {boolean} esSocio - Si el usuario es socio (default: false)
 * @returns {number} Precio total en soles
 */
export const calcularPrecioReserva = (cancha, horaInicio, horaFin = null, esSocio = false) => {
  // Validar entrada
  if (!cancha || !horaInicio) {
    return 0;
  }

  const precioPorHora = obtenerPrecioBase(cancha, esSocio);

  // Si no hay horaFin, es 1 hora
  if (!horaFin) {
    return precioPorHora;
  }

  // Calcular número de horas
  const numHoras = calcularNumeroDeHoras(horaInicio, horaFin);

  return precioPorHora * numHoras;
};

/**
 * Obtiene información detallada del precio (para mostrar desglose)
 * @param {string} cancha - 'principal', 'anexa-1', o 'anexa-2'
 * @param {string} horaInicio - Hora en formato 'HH:MM'
 * @param {string} horaFin - Hora fin en formato 'HH:MM' (opcional)
 * @param {boolean} esSocio - Si el usuario es socio (default: false)
 * @returns {object} { precioTotal, numHoras, precioPorHora, desglose, esTarifaSocio }
 */
export const obtenerDesglosePrecio = (cancha, horaInicio, horaFin = null, esSocio = false) => {
  const precioPorHora = obtenerPrecioBase(cancha, esSocio);
  const tipoTarifa = esSocio ? 'Tarifa Socio' : 'Tarifa Regular';

  if (!horaFin) {
    return {
      precioTotal: precioPorHora,
      numHoras: 1,
      precioPorHora,
      desglose: `${precioPorHora} soles/hora × 1 hora`,
      esTarifaSocio: esSocio
    };
  }

  const numHoras = calcularNumeroDeHoras(horaInicio, horaFin);
  const precioTotal = precioPorHora * numHoras;

  return {
    precioTotal,
    numHoras,
    precioPorHora,
    desglose: `${precioPorHora} soles/hora × ${numHoras} hora${numHoras > 1 ? 's' : ''}`,
    esTarifaSocio: esSocio
  };
};

/**
 * Obtiene el nombre descriptivo de una cancha
 * @param {string} cancha - 'principal', 'anexa-1', o 'anexa-2'
 * @returns {string} Nombre legible
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
 * @param {string} cancha - 'principal', 'anexa-1', o 'anexa-2'
 * @param {boolean} esSocio - Si el usuario es socio
 * @returns {string} Descripción de la tarifa
 */
export const obtenerTipoHorario = (cancha, esSocio = false) => {
  return esSocio ? 'Tarifa Socio' : 'Tarifa Regular';
};
