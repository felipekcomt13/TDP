/**
 * Utilidad para calcular precios de reservas según cancha y horario
 *
 * Estructura de precios (POR HORA):
 * - Anexa 1 y Anexa 2: 50 soles/hora
 * - Principal mañana/tarde (8am - 5pm): 70 soles/hora
 * - Principal nocturno (después de 5pm): 80 soles/hora
 */

// Constantes de precios (por hora)
export const PRECIOS = {
  ANEXA: 50,
  PRINCIPAL_DIURNO: 70,
  PRINCIPAL_NOCTURNO: 80
};

// Hora límite para considerar horario nocturno (17:00 = 5pm)
const HORA_LIMITE_NOCTURNO = 17;

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
 * Obtiene el precio base por hora según cancha y horario
 * @param {string} cancha - 'principal', 'anexa-1', o 'anexa-2'
 * @param {string} hora - Hora en formato 'HH:MM'
 * @returns {number} Precio base por hora
 */
const obtenerPrecioBase = (cancha, hora) => {
  // Canchas anexas siempre cuestan 50 soles/hora
  if (cancha === 'anexa-1' || cancha === 'anexa-2') {
    return PRECIOS.ANEXA;
  }

  // Cancha principal: depende del horario
  if (cancha === 'principal') {
    const horaNum = parseInt(hora.split(':')[0], 10);
    return horaNum >= HORA_LIMITE_NOCTURNO ? PRECIOS.PRINCIPAL_NOCTURNO : PRECIOS.PRINCIPAL_DIURNO;
  }

  return 0;
};

/**
 * Calcula el precio para cancha principal con múltiples horas
 * (considerando cambio de horario diurno a nocturno)
 * @param {string} horaInicio - Hora en formato 'HH:MM'
 * @param {string} horaFin - Hora en formato 'HH:MM'
 * @returns {number} Precio total
 */
const calcularPrecioPrincipalMultiHora = (horaInicio, horaFin) => {
  const horaInicioNum = parseInt(horaInicio.split(':')[0], 10);
  const horaFinNum = parseInt(horaFin.split(':')[0], 10);

  // Si todo el rango es antes de 17:00 → todo diurno
  if (horaFinNum <= HORA_LIMITE_NOCTURNO) {
    const numHoras = calcularNumeroDeHoras(horaInicio, horaFin);
    return PRECIOS.PRINCIPAL_DIURNO * numHoras;
  }

  // Si todo el rango es después de 17:00 → todo nocturno
  if (horaInicioNum >= HORA_LIMITE_NOCTURNO) {
    const numHoras = calcularNumeroDeHoras(horaInicio, horaFin);
    return PRECIOS.PRINCIPAL_NOCTURNO * numHoras;
  }

  // Cruza horario: calcular horas diurnas y nocturnas
  const horasDiurnas = HORA_LIMITE_NOCTURNO - horaInicioNum;
  const horasNocturnas = horaFinNum - HORA_LIMITE_NOCTURNO;

  return (PRECIOS.PRINCIPAL_DIURNO * horasDiurnas) + (PRECIOS.PRINCIPAL_NOCTURNO * horasNocturnas);
};

/**
 * Calcula el precio de una reserva según la cancha, hora inicio y hora fin
 * @param {string} cancha - 'principal', 'anexa-1', o 'anexa-2'
 * @param {string} horaInicio - Hora en formato 'HH:MM' (ej: '14:00', '18:00')
 * @param {string} horaFin - Hora fin en formato 'HH:MM' (opcional, default = 1 hora después)
 * @returns {number} Precio total en soles
 */
export const calcularPrecioReserva = (cancha, horaInicio, horaFin = null) => {
  // Validar entrada
  if (!cancha || !horaInicio) {
    console.error('calcularPrecioReserva: faltan parámetros', { cancha, horaInicio });
    return 0;
  }

  // Si no hay horaFin, es 1 hora
  if (!horaFin) {
    return obtenerPrecioBase(cancha, horaInicio);
  }

  // Calcular número de horas
  const numHoras = calcularNumeroDeHoras(horaInicio, horaFin);

  // Para canchas anexas, simplemente multiplicar
  if (cancha === 'anexa-1' || cancha === 'anexa-2') {
    return PRECIOS.ANEXA * numHoras;
  }

  // Para cancha principal, considerar cambio de horario diurno/nocturno
  if (cancha === 'principal') {
    return calcularPrecioPrincipalMultiHora(horaInicio, horaFin);
  }

  // Si la cancha no es válida, retornar 0
  console.warn('calcularPrecioReserva: cancha no válida', cancha);
  return 0;
};

/**
 * Obtiene información detallada del precio (para mostrar desglose)
 * @param {string} cancha - 'principal', 'anexa-1', o 'anexa-2'
 * @param {string} horaInicio - Hora en formato 'HH:MM'
 * @param {string} horaFin - Hora fin en formato 'HH:MM' (opcional)
 * @returns {object} { precioTotal, numHoras, precioPorHora, desglose }
 */
export const obtenerDesglosePrecio = (cancha, horaInicio, horaFin = null) => {
  if (!horaFin) {
    const precioPorHora = obtenerPrecioBase(cancha, horaInicio);
    return {
      precioTotal: precioPorHora,
      numHoras: 1,
      precioPorHora,
      desglose: `${precioPorHora} soles/hora × 1 hora`
    };
  }

  const numHoras = calcularNumeroDeHoras(horaInicio, horaFin);
  const precioTotal = calcularPrecioReserva(cancha, horaInicio, horaFin);

  // Para anexas, es simple
  if (cancha === 'anexa-1' || cancha === 'anexa-2') {
    return {
      precioTotal,
      numHoras,
      precioPorHora: PRECIOS.ANEXA,
      desglose: `${PRECIOS.ANEXA} soles/hora × ${numHoras} horas`
    };
  }

  // Para principal, puede ser mixto
  if (cancha === 'principal') {
    const horaInicioNum = parseInt(horaInicio.split(':')[0], 10);
    const horaFinNum = parseInt(horaFin.split(':')[0], 10);

    if (horaFinNum <= HORA_LIMITE_NOCTURNO) {
      return {
        precioTotal,
        numHoras,
        precioPorHora: PRECIOS.PRINCIPAL_DIURNO,
        desglose: `${PRECIOS.PRINCIPAL_DIURNO} soles/hora × ${numHoras} horas (diurno)`
      };
    }

    if (horaInicioNum >= HORA_LIMITE_NOCTURNO) {
      return {
        precioTotal,
        numHoras,
        precioPorHora: PRECIOS.PRINCIPAL_NOCTURNO,
        desglose: `${PRECIOS.PRINCIPAL_NOCTURNO} soles/hora × ${numHoras} horas (nocturno)`
      };
    }

    // Horario mixto
    const horasDiurnas = HORA_LIMITE_NOCTURNO - horaInicioNum;
    const horasNocturnas = horaFinNum - HORA_LIMITE_NOCTURNO;
    return {
      precioTotal,
      numHoras,
      precioPorHora: null, // mixto
      desglose: `${horasDiurnas}h × ${PRECIOS.PRINCIPAL_DIURNO} (diurno) + ${horasNocturnas}h × ${PRECIOS.PRINCIPAL_NOCTURNO} (nocturno)`
    };
  }

  return {
    precioTotal: 0,
    numHoras: 0,
    precioPorHora: 0,
    desglose: 'Error en cálculo'
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
 * Determina si un horario es nocturno (después de 5pm)
 * @param {string} hora - Hora en formato 'HH:MM'
 * @returns {boolean}
 */
export const esHorarioNocturno = (hora) => {
  const horaNum = parseInt(hora.split(':')[0], 10);
  return horaNum >= HORA_LIMITE_NOCTURNO;
};

/**
 * Obtiene el tipo de horario para mostrar al usuario
 * @param {string} cancha - 'principal', 'anexa-1', o 'anexa-2'
 * @param {string} hora - Hora en formato 'HH:MM'
 * @returns {string} Descripción del horario
 */
export const obtenerTipoHorario = (cancha, hora) => {
  if (cancha === 'anexa-1' || cancha === 'anexa-2') {
    return 'Todo el día';
  }

  if (cancha === 'principal') {
    return esHorarioNocturno(hora) ? 'Horario nocturno' : 'Horario diurno';
  }

  return '';
};
