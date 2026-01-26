import { useState, useEffect } from 'react';
import { useReservas } from '../context/ReservasContext';
import { useAuth } from '../context/AuthContext';
import { calcularPrecioReserva, obtenerNombreCancha, obtenerTipoHorario, obtenerDesglosePrecio } from '../utils/preciosCalculator';

const FormularioReserva = ({ horarioSeleccionado, onCerrar, onReservaCreada }) => {
  const { agregarReserva, verificarDisponibilidad, verificarDisponibilidadRango, obtenerHorasEnRango } = useReservas();
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    dni: '',
    notas: '',
    deporte: 'basket' // 'basket' o 'voley'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirigiendo, setRedirigiendo] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [urlWhatsApp, setUrlWhatsApp] = useState('');

  useEffect(() => {
    if (horarioSeleccionado) {
      // Verificar disponibilidad al abrir el modal
      // Nota: las reservas pendientes no bloquean, solo las confirmadas
      if (horarioSeleccionado.horaFin) {
        // Es un rango
        const disponible = verificarDisponibilidadRango(
          horarioSeleccionado.fecha,
          horarioSeleccionado.horaInicio,
          horarioSeleccionado.horaFin
        );
        if (!disponible) {
          setError('Uno o más horarios en el rango ya están confirmados');
        }
      } else {
        // Es un solo horario (compatibilidad retroactiva)
        const hora = horarioSeleccionado.horaInicio || horarioSeleccionado.hora;
        const disponible = verificarDisponibilidad(horarioSeleccionado.fecha, hora);
        if (!disponible) {
          setError('Este horario ya está confirmado por otro usuario');
        }
      }
    }
  }, [horarioSeleccionado, verificarDisponibilidad, verificarDisponibilidadRango]);

  // Autocompletar campos si el usuario está logueado
  useEffect(() => {
    if (user && profile) {
      setFormData(prev => ({
        ...prev,
        nombre: profile.nombre || '',
        email: user.email || '',
        deporte: prev.deporte || 'basket' // Mantener deporte seleccionado
      }));
    }
  }, [user, profile]);

  // Efecto para el countdown de redirección
  useEffect(() => {
    if (redirigiendo && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (redirigiendo && countdown === 0) {
      // Ejecutar redirección
      window.open(urlWhatsApp, '_blank');

      // Limpiar formulario
      setFormData({
        nombre: '',
        telefono: '',
        email: '',
        dni: '',
        notas: ''
      });

      // Resetear estados
      setRedirigiendo(false);
      setCountdown(5);

      // Cerrar modal
      onCerrar();
    }
  }, [redirigiendo, countdown, urlWhatsApp, onCerrar]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    if (!formData.dni.trim()) {
      setError('El DNI es obligatorio');
      return;
    }

    if (formData.dni.trim().length !== 8 || !/^\d+$/.test(formData.dni.trim())) {
      setError('El DNI debe tener 8 dígitos numéricos');
      return;
    }

    if (!formData.telefono.trim() && !formData.email.trim()) {
      setError('Debes proporcionar al menos un teléfono o email');
      return;
    }

    // Verificar disponibilidad nuevamente antes de guardar
    // Nota: las reservas pendientes no bloquean, solo las confirmadas
    let disponible;
    if (horarioSeleccionado.horaFin) {
      // Verificar rango completo
      disponible = verificarDisponibilidadRango(
        horarioSeleccionado.fecha,
        horarioSeleccionado.horaInicio,
        horarioSeleccionado.horaFin
      );
    } else {
      // Verificar solo una hora (compatibilidad retroactiva)
      const hora = horarioSeleccionado.horaInicio || horarioSeleccionado.hora;
      disponible = verificarDisponibilidad(horarioSeleccionado.fecha, hora);
    }

    if (!disponible) {
      setError('Este horario ya está confirmado por otro usuario');
      return;
    }

    setLoading(true);

    try {
      // Construir mensaje de WhatsApp
      const fechaFormateada = new Date(horarioSeleccionado.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const horarioTexto = horarioSeleccionado.horaFin
        ? `${horarioSeleccionado.horaInicio} - ${horarioSeleccionado.horaFin}`
        : horarioSeleccionado.horaInicio || horarioSeleccionado.hora;

      // Mensaje sin emojis, usando puntos
      let mensaje = `Deseo confirmar mi reserva para:\n\n`;
      mensaje += `• Fecha: ${fechaFormateada}\n`;
      mensaje += `• Horario: ${horarioTexto}\n`;
      mensaje += `• Cancha: ${obtenerNombreCancha(horarioSeleccionado.cancha || 'principal')}\n`;
      mensaje += `• Deporte: ${formData.deporte === 'basket' ? 'Básquet' : 'Vóley'}\n`;
      mensaje += `• A nombre de: ${formData.nombre}\n`;
      mensaje += `• Correo de la reserva: ${formData.email || 'No proporcionado'}\n`;
      mensaje += `• DNI: ${formData.dni}\n`;

      if (formData.telefono) {
        mensaje += `• Telefono: ${formData.telefono}\n`;
      }

      if (formData.notas) {
        mensaje += `• Notas: ${formData.notas}\n`;
      }

      // Codificar mensaje para URL
      const mensajeCodificado = encodeURIComponent(mensaje);
      const numeroWhatsApp = '51977510600'; // Número de WhatsApp del complejo (PROD)
      const url = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;

      // Crear reserva con estado pendiente
      const nuevaReserva = {
        ...formData,
        fecha: horarioSeleccionado.fecha,
        hora: horarioSeleccionado.horaInicio || horarioSeleccionado.hora,
        diaSemana: horarioSeleccionado.diaSemana,
        estado: 'pendiente', // Agregar estado pendiente
        cancha: horarioSeleccionado.cancha || 'principal', // Agregar cancha
        deporte: formData.deporte // Agregar deporte
      };

      // Agregar horaFin solo si existe
      if (horarioSeleccionado.horaFin) {
        nuevaReserva.horaFin = horarioSeleccionado.horaFin;
      }

      const reservaCreada = agregarReserva(nuevaReserva);

      if (onReservaCreada) {
        onReservaCreada(reservaCreada);
      }

      // Guardar URL y activar countdown
      setUrlWhatsApp(url);
      setRedirigiendo(true);
      setLoading(false);
    } catch (err) {
      setError('Error al crear la reserva. Por favor intenta de nuevo.');
      setLoading(false);
    }
  };

  if (!horarioSeleccionado) return null;

  // Calcular precio total según cancha y horario (por hora)
  const cancha = horarioSeleccionado.cancha || 'principal';
  const desglose = obtenerDesglosePrecio(cancha, horarioSeleccionado.horaInicio, horarioSeleccionado.horaFin);
  const costoTotal = desglose.precioTotal;
  const nombreCancha = obtenerNombreCancha(cancha);
  const tipoHorario = obtenerTipoHorario(cancha, horarioSeleccionado.horaInicio);

  // Si está redirigiendo, mostrar mensaje de countdown
  if (redirigiendo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white max-w-md w-full p-12 text-center border border-gray-200">
          <div className="mb-8">
            <div className="w-24 h-24 bg-black flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-black mb-3 tracking-tight">RESERVA CREADA</h2>
            <p className="text-gray-600 text-sm mb-6 uppercase tracking-wide">
              Redirigiendo a WhatsApp
            </p>
            <div className="bg-gray-50 border border-gray-200 p-6 mb-6">
              <p className="text-black font-bold text-5xl mb-2">
                {countdown}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-widest">
                segundo{countdown !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-full bg-gray-200 h-1 overflow-hidden">
              <div
                className="bg-black h-1 transition-all duration-1000 ease-linear"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }}
              ></div>
            </div>
          </div>
          <button
            onClick={() => {
              setRedirigiendo(false);
              setCountdown(5);
              onCerrar();
            }}
            className="px-8 py-3 border border-gray-300 text-gray-700 text-sm font-medium tracking-wide hover:bg-gray-50 transition-colors uppercase"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="sticky top-0 bg-white z-10 p-6 pb-4 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-black tracking-tight mb-1">NUEVA RESERVA</h2>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Complejo Deportivo Triple Doble</p>
            </div>
            <button
              onClick={onCerrar}
              className="text-gray-400 hover:text-black text-3xl leading-none transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 pt-4">
          <div className="bg-gray-50 border-l-2 border-black p-4 mb-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Cancha</p>
              <p className="font-bold text-black">{nombreCancha}</p>
              <p className="text-[9px] text-gray-600 uppercase mt-0.5">{tipoHorario}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Fecha</p>
              <p className="font-medium text-black">
                {new Date(horarioSeleccionado.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Horario</p>
              <p className="font-medium text-black">
                {horarioSeleccionado.horaFin ? (
                  <>{horarioSeleccionado.horaInicio} - {horarioSeleccionado.horaFin}</>
                ) : (
                  <>{horarioSeleccionado.horaInicio || horarioSeleccionado.hora}</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Selector de deporte */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">Deporte</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, deporte: 'basket' }))}
              className={`flex-1 px-4 py-2 text-sm font-medium tracking-wide transition-colors ${
                formData.deporte === 'basket'
                  ? 'bg-black text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              BÁSQUET
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, deporte: 'voley' }))}
              className={`flex-1 px-4 py-2 text-sm font-medium tracking-wide transition-colors ${
                formData.deporte === 'voley'
                  ? 'bg-black text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              VÓLEY
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-gray-50 border-l-2 border-gray-800 text-gray-800 px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-[10px] font-medium text-gray-500 mb-2 uppercase tracking-widest">
              Nombre completo *
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full px-0 py-2 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none bg-transparent text-black placeholder-gray-400 transition-colors"
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="telefono" className="block text-[10px] font-medium text-gray-500 mb-2 uppercase tracking-widest">
                Teléfono
              </label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full px-0 py-2 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none bg-transparent text-black placeholder-gray-400 transition-colors"
                placeholder="999 999 999"
              />
            </div>

            <div>
              <label htmlFor="dni" className="block text-[10px] font-medium text-gray-500 mb-2 uppercase tracking-widest">
                DNI *
              </label>
              <input
                type="text"
                id="dni"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                className="w-full px-0 py-2 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none bg-transparent text-black placeholder-gray-400 transition-colors"
                placeholder="12345678"
                maxLength="8"
                pattern="\d*"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-[10px] font-medium text-gray-500 mb-2 uppercase tracking-widest">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-0 py-2 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none bg-transparent text-black placeholder-gray-400 transition-colors"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label htmlFor="notas" className="block text-[10px] font-medium text-gray-500 mb-2 uppercase tracking-widest">
              Notas adicionales
            </label>
            <textarea
              id="notas"
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              rows="2"
              className="w-full px-0 py-2 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none bg-transparent text-black placeholder-gray-400 resize-none transition-colors"
              placeholder="Información adicional..."
            />
          </div>

          {/* Sección de costo total */}
          <div className="bg-gray-50 border-l-2 border-black p-4">
            <h3 className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 font-semibold">
              Total a pagar
            </h3>
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">
                {nombreCancha} - {tipoHorario}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {desglose.desglose}
              </p>
              <p className="text-sm text-gray-700">
                Total: <span className="font-bold text-black text-3xl">S/ {costoTotal}</span>
              </p>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 leading-relaxed">
                Recuerda enviar la foto del comprobante de pago al número de WhatsApp
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium tracking-wide hover:bg-gray-50 transition-colors uppercase disabled:opacity-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-black text-white text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors uppercase disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default FormularioReserva;
