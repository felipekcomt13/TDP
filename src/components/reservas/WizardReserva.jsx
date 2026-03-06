import { useState, useEffect } from 'react';
import {
  format, addMonths, startOfMonth, endOfMonth,
  startOfWeek, addDays, isSameDay, isSameMonth
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useReservas } from '../../context/ReservasContext';
import { useAuth } from '../../context/AuthContext';
import { useCanchas } from '../../context/CanchasContext';

const PASOS = ['Deporte', 'Cancha', 'Horario', 'Confirmar'];
const FECHA_INICIO_RESERVAS = new Date(2026, 2, 4); // 4 marzo 2026

const WizardReserva = ({ onCerrar, onReservaCreada, inline = false }) => {
  const [paso, setPaso] = useState(0);
  const [deporte, setDeporte] = useState(null);
  const [cancha, setCancha] = useState(null);
  const [fecha, setFecha] = useState(null);
  const [horaInicio, setHoraInicio] = useState(null);
  const [horaFin, setHoraFin] = useState(null);
  const [mesCalendario, setMesCalendario] = useState(new Date());
  const [formData, setFormData] = useState({ nombre: '', dni: '', telefono: '', email: '', notas: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    generarHorarios,
    verificarDisponibilidad,
    verificarDisponibilidadRango,
    agregarReserva,
    configuracion
  } = useReservas();
  const { user, profile, esSocio } = useAuth();
  const { obtenerCanchasPorDeporte } = useCanchas();

  useEffect(() => {
    if (user && profile) {
      setFormData(prev => ({
        ...prev,
        nombre: profile.nombre || '',
        email: user.email || ''
      }));
    }
  }, [user, profile]);

  const calcularHoraFinSlot = (hora) => {
    const [h, m] = hora.split(':').map(Number);
    let nh = h, nm = m + configuracion.intervalo;
    if (nm >= 60) { nh += Math.floor(nm / 60); nm = nm % 60; }
    return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
  };

  const esHoraPasada = (fechaStr, hora) => {
    const fechaDate = new Date(fechaStr + 'T00:00:00');
    if (fechaDate < FECHA_INICIO_RESERVAS) return true;
    const hoy = new Date();
    const hoyStr = format(hoy, 'yyyy-MM-dd');
    if (fechaStr < hoyStr) return true;
    if (fechaStr === hoyStr) {
      const horaFinSlot = calcularHoraFinSlot(hora);
      const [hf, mf] = horaFinSlot.split(':').map(Number);
      return hf < hoy.getHours() || (hf === hoy.getHours() && mf <= hoy.getMinutes());
    }
    return false;
  };

  // Retorna todos los slots con su estado: 'disponible' | 'ocupado' | 'pasado'
  const obtenerTodosSlots = () => {
    if (!fecha || !cancha) return [];
    return generarHorarios().map(hora => {
      if (esHoraPasada(fecha, hora)) return { hora, estado: 'pasado' };
      if (!verificarDisponibilidad(fecha, hora, cancha.id)) return { hora, estado: 'ocupado' };
      return { hora, estado: 'disponible' };
    });
  };

  const todosSlots = fecha && cancha ? obtenerTodosSlots() : [];
  const hayAlgunoDisponible = todosSlots.some(s => s.estado === 'disponible');

  const manejarClickSlot = (hora) => {
    if (!horaInicio) {
      setHoraInicio(hora);
      setHoraFin(calcularHoraFinSlot(hora));
      return;
    }

    const horarios = generarHorarios();
    const idxInicio = horarios.indexOf(horaInicio);
    const idxClick = horarios.indexOf(hora);

    if (idxClick === idxInicio) {
      setHoraInicio(null);
      setHoraFin(null);
      return;
    }

    if (idxClick > idxInicio) {
      const slotsEnRango = horarios.slice(idxInicio, idxClick + 1);
      const todoDisponible = slotsEnRango.every(h =>
        verificarDisponibilidad(fecha, h, cancha.id) && !esHoraPasada(fecha, h)
      );
      if (todoDisponible) {
        setHoraFin(calcularHoraFinSlot(hora));
      } else {
        setHoraInicio(hora);
        setHoraFin(calcularHoraFinSlot(hora));
      }
      return;
    }

    setHoraInicio(hora);
    setHoraFin(calcularHoraFinSlot(hora));
  };

  const slotEnRango = (hora) => {
    if (!horaInicio || !horaFin) return false;
    return hora >= horaInicio && hora < horaFin;
  };

  const calcularNumHoras = () => {
    if (!horaInicio || !horaFin) return 0;
    const [hi, mi] = horaInicio.split(':').map(Number);
    const [hf, mf] = horaFin.split(':').map(Number);
    return Math.max(1, Math.ceil(((hf * 60 + mf) - (hi * 60 + mi)) / 60));
  };

  const calcularPrecio = () => {
    if (!cancha) return 0;
    const esS = esSocio();
    const precioPorHora = esS && cancha.costo_socio ? cancha.costo_socio : cancha.costo_regular;
    return precioPorHora * Math.max(1, calcularNumHoras());
  };

  const avanzar = () => setPaso(p => Math.min(p + 1, PASOS.length - 1));

  const retroceder = () => {
    if (paso === 2) { setFecha(null); setHoraInicio(null); setHoraFin(null); }
    if (paso === 1) { setCancha(null); }
    setPaso(p => Math.max(p - 1, 0));
  };

  const puedeAvanzar = () => {
    if (paso === 2) return !!(fecha && horaInicio && horaFin);
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    if (!formData.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!formData.dni.trim()) { setError('El DNI es obligatorio'); return; }
    if (formData.dni.trim().length !== 8 || !/^\d+$/.test(formData.dni.trim())) {
      setError('El DNI debe tener 8 dígitos numéricos'); return;
    }
    if (!formData.telefono.trim() && !formData.email.trim()) {
      setError('Debes proporcionar al menos un teléfono o email'); return;
    }

    const disponible = verificarDisponibilidadRango(fecha, horaInicio, horaFin, cancha.id);
    if (!disponible) {
      setError('El horario seleccionado ya no está disponible. Por favor elige otro.');
      return;
    }

    setLoading(true);
    try {
      const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });

      let mensaje = `Deseo confirmar mi reserva para:\n\n`;
      mensaje += `• Fecha: ${fechaFormateada}\n`;
      mensaje += `• Horario: ${horaInicio} - ${horaFin}\n`;
      mensaje += `• Cancha: ${cancha.nombre}\n`;
      mensaje += `• Deporte: ${deporte === 'basket' ? 'Básquet' : 'Vóley'}\n`;
      mensaje += `• A nombre de: ${formData.nombre}\n`;
      mensaje += `• Correo de la reserva: ${formData.email || 'No proporcionado'}\n`;
      mensaje += `• DNI: ${formData.dni}\n`;
      if (formData.telefono) mensaje += `• Telefono: ${formData.telefono}\n`;
      if (formData.notas) mensaje += `• Notas: ${formData.notas}\n`;

      const url = `https://wa.me/51974341064?text=${encodeURIComponent(mensaje)}`;

      const nuevaReserva = {
        nombre: formData.nombre,
        telefono: formData.telefono || null,
        email: formData.email || null,
        dni: formData.dni,
        notas: formData.notas || null,
        fecha,
        hora: horaInicio,
        horaFin,
        diaSemana: new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' }),
        estado: 'pendiente',
        cancha: cancha.id,
        deporte
      };

      const reservaCreada = await agregarReserva(nuevaReserva);
      window.open(url, '_blank');
      if (onReservaCreada) onReservaCreada(reservaCreada);
      if (inline) {
        // En modo inline: resetear el wizard para una nueva reserva
        setPaso(0);
        setDeporte(null);
        setCancha(null);
        setFecha(null);
        setHoraInicio(null);
        setHoraFin(null);
        setFormData({ nombre: '', dni: '', telefono: '', email: '', notas: '' });
      } else {
        onCerrar();
      }
    } catch {
      setError('Error al crear la reserva. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Mini calendario (mes)
  const renderCalendario = () => {
    const inicioMes = startOfMonth(mesCalendario);
    const finMes = endOfMonth(mesCalendario);
    const inicioGrid = startOfWeek(inicioMes, { weekStartsOn: 1 });
    const dias = [];
    let d = inicioGrid;
    while (d <= finMes || dias.length % 7 !== 0) {
      dias.push(d);
      d = addDays(d, 1);
      if (dias.length > 42) break;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return (
      <div className="border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setMesCalendario(addMonths(mesCalendario, -1))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            ←
          </button>
          <span className="font-semibold capitalize text-sm">
            {format(mesCalendario, 'MMMM yyyy', { locale: es })}
          </span>
          <button
            onClick={() => setMesCalendario(addMonths(mesCalendario, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
            <div key={d} className="text-center text-[11px] text-gray-400 font-medium py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dias.map((dia, i) => {
            const fechaStr = format(dia, 'yyyy-MM-dd');
            const esMismoMes = isSameMonth(dia, mesCalendario);
            const esPasada = dia < FECHA_INICIO_RESERVAS || dia < hoy;
            const esSeleccionada = fecha === fechaStr;
            const esHoy = isSameDay(dia, new Date());

            return (
              <button
                key={i}
                disabled={esPasada || !esMismoMes}
                onClick={() => {
                  setFecha(fechaStr);
                  setHoraInicio(null);
                  setHoraFin(null);
                }}
                className={`
                  h-9 w-full rounded-lg text-sm font-medium transition-all
                  ${!esMismoMes ? 'invisible' : ''}
                  ${esPasada && esMismoMes ? 'text-gray-300 cursor-not-allowed' : ''}
                  ${esSeleccionada ? 'bg-black text-white' : ''}
                  ${!esPasada && !esSeleccionada && esMismoMes ? 'hover:bg-gray-100 text-gray-700 cursor-pointer' : ''}
                  ${esHoy && !esSeleccionada ? 'ring-2 ring-black ring-offset-1' : ''}
                `}
              >
                {format(dia, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPaso = () => {
    switch (paso) {
      case 0:
        return (
          <div>
            <h3 className="text-lg font-bold mb-1">¿Qué deporte quieres jugar?</h3>
            <p className="text-sm text-gray-500 mb-6">Selecciona el deporte para ver las canchas disponibles</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'basket', label: 'Básquet', icon: '🏀', desc: 'Cancha de basketball' },
                { id: 'voley', label: 'Vóley', icon: '🏐', desc: 'Cancha de voleibol' }
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => { setDeporte(d.id); setCancha(null); avanzar(); }}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-black hover:shadow-md transition-all text-center active:scale-[0.98]"
                >
                  <div className="text-4xl mb-3">{d.icon}</div>
                  <div className="font-bold text-lg">{d.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 1: {
        const canchasDisponibles = obtenerCanchasPorDeporte(deporte);
        return (
          <div>
            <h3 className="text-lg font-bold mb-1">Selecciona una cancha</h3>
            <p className="text-sm text-gray-500 mb-6">
              Canchas disponibles para {deporte === 'basket' ? 'Básquet' : 'Vóley'}
            </p>
            {canchasDisponibles.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <p className="text-gray-400 text-sm">No hay canchas disponibles para este deporte</p>
              </div>
            ) : (
              <div className="space-y-3">
                {canchasDisponibles.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setCancha(c); setFecha(null); setHoraInicio(null); setHoraFin(null); avanzar(); }}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-black hover:shadow-md transition-all text-left flex items-center gap-4 group active:scale-[0.99]"
                  >
                    {c.foto_url ? (
                      <img src={c.foto_url} alt={c.nombre} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base text-black">{c.nombre}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">
                          S/ {esSocio() && c.costo_socio ? c.costo_socio : c.costo_regular}/hora
                        </span>
                        {esSocio() && c.costo_socio && (
                          <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-medium">
                            Tarifa Socio
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 2:
        return (
          <div>
            <h3 className="text-lg font-bold mb-1">Selecciona fecha y horario</h3>
            <p className="text-sm text-gray-500 mb-4">Los horarios en gris ya están reservados</p>

            {renderCalendario()}

            {fecha && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-black">
                    {new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long', day: 'numeric', month: 'long'
                    })}
                  </p>
                  {horaInicio && (
                    <button
                      onClick={() => { setHoraInicio(null); setHoraFin(null); }}
                      className="text-xs text-gray-400 hover:text-black transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {todosSlots.length === 0 ? null : !hayAlgunoDisponible ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-gray-400 text-sm">No hay horarios disponibles para este día</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {todosSlots.map(({ hora, estado }) => {
                        const enRango = slotEnRango(hora);
                        const esDisponible = estado === 'disponible';
                        return (
                        <button
                          key={hora}
                          disabled={!esDisponible}
                          onClick={() => esDisponible && manejarClickSlot(hora)}
                          className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                            enRango
                              ? 'bg-black text-white shadow-sm active:scale-95'
                              : estado === 'ocupado'
                              ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                              : estado === 'pasado'
                              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 active:scale-95'
                          }`}
                        >
                          {hora}
                        </button>
                        );
                      })}
                    </div>

                    {horaInicio ? (
                      <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <p className="text-sm font-semibold text-black">
                          {horaInicio} – {horaFin}
                          <span className="text-gray-500 font-normal ml-2">
                            ({calcularNumHoras()} hora{calcularNumHoras() !== 1 ? 's' : ''})
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Click en otro horario para extender el rango
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">
                        Click en un horario para seleccionarlo, luego en otro para extender
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">Tus datos</h3>

            {/* Resumen de la reserva */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-5 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Deporte</span>
                <span className="font-medium">{deporte === 'basket' ? 'Básquet 🏀' : 'Vóley 🏐'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cancha</span>
                <span className="font-medium">{cancha?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha</span>
                <span className="font-medium">
                  {fecha && new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Horario</span>
                <span className="font-medium">{horaInicio} – {horaFin}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-1">
                <span className="text-gray-500">Total</span>
                <div className="text-right">
                  <span className="font-bold text-xl text-black">S/ {calcularPrecio()}</span>
                  {esSocio() && cancha?.costo_socio && (
                    <span className="ml-2 text-[10px] bg-black text-white px-2 py-0.5 rounded-full">Socio</span>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre completo *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 text-sm"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">DNI *</label>
                  <input
                    type="text"
                    value={formData.dni}
                    onChange={e => setFormData(p => ({ ...p, dni: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 text-sm"
                    placeholder="12345678"
                    maxLength="8"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={e => setFormData(p => ({ ...p, telefono: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 text-sm"
                    placeholder="999 999 999"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 text-sm"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Notas <span className="text-gray-400">(opcional)</span></label>
                <textarea
                  value={formData.notas}
                  onChange={e => setFormData(p => ({ ...p, notas: e.target.value }))}
                  rows="2"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 text-sm resize-none"
                  placeholder="Información adicional..."
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Al confirmar se abrirá WhatsApp para enviar tu solicitud. Recuerda adjuntar el comprobante de pago.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const contenido = (
    <>
      {/* Header */}
      <div className={`${inline ? '' : 'sticky top-0 bg-white z-10'} p-6 pb-4 border-b border-gray-100`}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className={`font-bold text-black tracking-tight ${inline ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>
              {inline ? 'NUEVA RESERVA' : 'NUEVA RESERVA'}
            </h2>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">
              Complejo Deportivo Triple Doble
            </p>
          </div>
          {!inline && onCerrar && (
            <button
              onClick={onCerrar}
              className="text-gray-400 hover:text-black text-3xl leading-none transition-colors mt-1"
            >
              ×
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4 flex gap-2">
          {PASOS.map((p, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1 w-full rounded-full transition-all ${i <= paso ? 'bg-black' : 'bg-gray-200'}`} />
              <span className={`text-[9px] uppercase tracking-wide ${i === paso ? 'text-black font-semibold' : 'text-gray-400'}`}>
                {p}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderPaso()}

        {/* Botones de navegación (no en paso 0 que avanza automáticamente) */}
        {paso > 0 && (
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={retroceder}
              disabled={loading}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-all"
            >
              ← Atrás
            </button>
            {paso < PASOS.length - 1 ? (
              <button
                onClick={avanzar}
                disabled={!puedeAvanzar()}
                className="flex-1 px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : 'Confirmar y enviar por WhatsApp'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (inline) {
    return (
      <div className="bg-white max-w-lg w-full mx-auto">
        {contenido}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
        {contenido}
      </div>
    </div>
  );
};

export default WizardReserva;
