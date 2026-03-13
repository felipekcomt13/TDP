import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReservas } from '../../context/ReservasContext';
import { useCanchas } from '../../context/CanchasContext';

const formatearFechaCorta = (fecha) => {
  const d = new Date(fecha + 'T12:00:00');
  return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatearHora = (hora) => {
  const [h] = hora.split(':').map(Number);
  if (h >= 24) return `${(h - 24).toString().padStart(2, '0')}:00`;
  return hora;
};

const DisponibilidadRapida = () => {
  const navigate = useNavigate();
  const { verificarDisponibilidad, generarHorarios } = useReservas();
  const { canchas } = useCanchas();

  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
  const [fecha, setFecha] = useState(hoyStr);
  const [canchaMovil, setCanchaMovil] = useState(0);

  const canchasDisponibles = canchas.filter(c => c.estado === 'disponible');
  const horarios = useMemo(() => generarHorarios(), [generarHorarios]);

  // Hora actual para marcar slots pasados
  const horaActualNum = hoy.getHours() * 60 + hoy.getMinutes();
  const esHoy = fecha === hoyStr;

  const esHoraPasada = (hora) => {
    if (!esHoy) return false;
    const [h, m] = hora.split(':').map(Number);
    // Para horas >= 24 (ej: 25:00 = 1am del día siguiente), nunca son pasadas "hoy"
    if (h >= 24) return false;
    return (h * 60 + m) < horaActualNum;
  };

  const handleClickSlot = (cancha, hora) => {
    navigate(`/reservas?cancha=${cancha.id}&fecha=${fecha}&hora=${hora}`);
  };

  // Generar fechas: hoy + 6 dias
  const fechas = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(hoy);
      d.setDate(d.getDate() + i);
      const str = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      arr.push(str);
    }
    return arr;
  }, []);

  return (
    <div className="px-6 lg:px-8 py-16 md:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-black mb-4 tracking-tight">
            DISPONIBILIDAD
          </h2>
          <p className="text-gray-600 text-sm uppercase tracking-wide">
            Horarios disponibles en tiempo real
          </p>
        </div>

        {/* Selector de fecha */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide justify-center">
          {fechas.map((f) => (
            <button
              key={f}
              onClick={() => setFecha(f)}
              className={`flex-shrink-0 px-4 py-2.5 text-xs font-medium rounded-lg transition-all capitalize ${
                fecha === f
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === hoyStr ? 'Hoy' : formatearFechaCorta(f)}
            </button>
          ))}
        </div>

        {/* Tabs de cancha en movil */}
        <div className="md:hidden flex gap-1 mb-6 border-b border-gray-200">
          {canchasDisponibles.map((cancha, idx) => (
            <button
              key={cancha.id}
              onClick={() => setCanchaMovil(idx)}
              className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors relative ${
                canchaMovil === idx
                  ? 'text-black'
                  : 'text-gray-400'
              }`}
            >
              {cancha.nombre.replace('Cancha ', '')}
              {canchaMovil === idx && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          ))}
        </div>

        {/* Grid desktop: 3 columnas */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {canchasDisponibles.map((cancha) => (
            <CanchaColumna
              key={cancha.id}
              cancha={cancha}
              horarios={horarios}
              fecha={fecha}
              verificarDisponibilidad={verificarDisponibilidad}
              esHoraPasada={esHoraPasada}
              onClickSlot={handleClickSlot}
            />
          ))}
        </div>

        {/* Vista movil: solo cancha seleccionada */}
        <div className="md:hidden">
          {canchasDisponibles[canchaMovil] && (
            <CanchaColumna
              cancha={canchasDisponibles[canchaMovil]}
              horarios={horarios}
              fecha={fecha}
              verificarDisponibilidad={verificarDisponibilidad}
              esHoraPasada={esHoraPasada}
              onClickSlot={handleClickSlot}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const CanchaColumna = ({ cancha, horarios, fecha, verificarDisponibilidad, esHoraPasada, onClickSlot }) => {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-bold text-black tracking-tight mb-4 text-center uppercase">
        {cancha.nombre}
      </h3>
      <div className="space-y-1.5">
        {horarios.map((hora) => {
          const pasada = esHoraPasada(hora);
          const disponible = !pasada && verificarDisponibilidad(fecha, hora, cancha.id);

          if (!disponible) return null;

          return (
            <button
              key={hora}
              onClick={() => onClickSlot(cancha, hora)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:shadow-sm cursor-pointer"
            >
              <span className="font-mono">{formatearHora(hora)}</span>
              <span>Libre</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DisponibilidadRapida;
