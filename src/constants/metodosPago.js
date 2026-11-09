// Métodos con los que se puede cobrar en el kiosco.
export const METODOS_PAGO = [
  { id: 'efectivo', nombre: 'Efectivo', clase: 'bg-gray-900 text-white border-gray-900', badge: 'bg-gray-100 text-gray-500' },
  { id: 'plin', nombre: 'Plin', clase: 'bg-[#00D4AA] text-white border-[#00D4AA]', badge: 'bg-teal-50 text-teal-700 border border-teal-100' },
  { id: 'yape', nombre: 'Yape', clase: 'bg-[#742284] text-white border-[#742284]', badge: 'bg-purple-50 text-purple-600 border border-purple-100' },
  { id: 'qr', nombre: 'QR', clase: 'bg-blue-600 text-white border-blue-600', badge: 'bg-blue-50 text-blue-600 border border-blue-100' }
];

// Las ventas antiguas pueden tener métodos que ya no se ofrecen (cuentas personales).
const NOMBRES_ANTIGUOS = {
  mixto: 'Mixto',
  tata: 'Cuenta Tata',
  david: 'Cuenta David',
  giancarlo: 'Cuenta Giancarlo'
};

export const nombrePago = (id) =>
  METODOS_PAGO.find(m => m.id === id)?.nombre || NOMBRES_ANTIGUOS[id] || id;

export const badgePago = (id) =>
  METODOS_PAGO.find(m => m.id === id)?.badge || 'bg-amber-50 text-amber-700 border border-amber-200';
