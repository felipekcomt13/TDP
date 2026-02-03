export const ESTADOS_RESERVA = {
  PENDIENTE: 'pendiente',
  CONFIRMADA: 'confirmada',
  RECHAZADA: 'rechazada'
};

export const CANCHAS = {
  PRINCIPAL: 'principal',
  ANEXA_1: 'anexa-1',
  ANEXA_2: 'anexa-2'
};

export const DEPORTES = {
  BASKET: 'basket',
  FUTSAL: 'futsal',
  VOLEY: 'voley'
};

export const CANCHAS_INFO = {
  [CANCHAS.PRINCIPAL]: {
    nombre: 'Cancha Principal',
    descripcion: 'Cancha de basketball completa'
  },
  [CANCHAS.ANEXA_1]: {
    nombre: 'Cancha Anexa 1',
    descripcion: 'Media cancha lado izquierdo'
  },
  [CANCHAS.ANEXA_2]: {
    nombre: 'Cancha Anexa 2',
    descripcion: 'Media cancha lado derecho'
  }
};

export const DEPORTES_INFO = {
  [DEPORTES.BASKET]: {
    nombre: 'Basketball',
    icon: 'basketball'
  },
  [DEPORTES.FUTSAL]: {
    nombre: 'Futsal',
    icon: 'futsal'
  },
  [DEPORTES.VOLEY]: {
    nombre: 'Voley',
    icon: 'voley'
  }
};
