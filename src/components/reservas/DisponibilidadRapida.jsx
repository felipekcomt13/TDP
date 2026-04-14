import { useState, useMemo, useRef, useEffect } from 'react';
import { useReservas } from '../../context/ReservasContext';
import { useCanchas } from '../../context/CanchasContext';

const formatearFechaCorta = (fecha) => {
  const d = new Date(fecha + 'T12:00:00');
  return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatearFechaMobile = (fecha) => {
  const d = new Date(fecha + 'T12:00:00');
  const dia = d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '').toUpperCase();
  const num = d.getDate();
  return { dia, num };
};

const formatearHora = (hora) => {
  const [h] = hora.split(':').map(Number);
  if (h >= 24) return `${(h - 24).toString().padStart(2, '0')}:00`;
  return hora;
};

const formatearRango = (hora, intervalo) => {
  const [h, m] = hora.split(':').map(Number);
  const inicio = formatearHora(hora);
  let finH = h, finM = m + intervalo;
  if (finM >= 60) { finH += Math.floor(finM / 60); finM = finM % 60; }
  const finHora = finH >= 24 ? finH - 24 : finH;
  const fin = `${finHora.toString().padStart(2, '0')}:${finM.toString().padStart(2, '0')}`;
  return `${inicio} - ${fin}`;
};

const DisponibilidadRapida = ({ onSeleccionarSlot }) => {
  const { verificarDisponibilidad, generarHorarios, configuracion } = useReservas();
  const { canchas } = useCanchas();

  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
  const [fecha, setFecha] = useState(hoyStr);
  const [deporte, setDeporte] = useState('voley');
  const [canchaMovil, setCanchaMovil] = useState(0);

  const canchasDisponibles = canchas.filter(c => c.estado === 'disponible' && (c.deportes || []).includes(deporte));
  const horarios = useMemo(() => generarHorarios(), [generarHorarios]);

  const horaActualNum = hoy.getHours() * 60 + hoy.getMinutes();
  const esHoy = fecha === hoyStr;

  const esHoraPasada = (hora) => {
    if (!esHoy) return false;
    const [h, m] = hora.split(':').map(Number);
    if (h >= 24) return false;
    return (h * 60 + m) < horaActualNum;
  };

  const handleClickSlot = () => {
    if (onSeleccionarSlot) {
      onSeleccionarSlot();
    }
  };

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

  const slotMatrix = useMemo(() => {
    return horarios.map(hora => ({
      hora,
      canchas: canchasDisponibles.map(cancha => ({
        canchaId: cancha.id,
        disponible: !esHoraPasada(hora) && verificarDisponibilidad(fecha, hora, cancha.id),
        pasada: esHoraPasada(hora),
      }))
    }));
  }, [horarios, fecha, canchasDisponibles, verificarDisponibilidad]);

  // Auto-scroll al primer slot libre en mobile
  const primerLibreRef = useRef(null);
  useEffect(() => {
    if (primerLibreRef.current) {
      primerLibreRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [fecha, canchaMovil]);

  let primerLibreEncontrado = false;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-2xl sm:text-4xl font-bold text-black mb-2 sm:mb-4 tracking-tight">
            DISPONIBILIDAD
          </h2>
          <p className="text-gray-600 text-[11px] sm:text-sm uppercase tracking-wide">
            Horarios en tiempo real — toca un horario libre para reservar
          </p>
        </div>

        {/* Selector de deporte */}
        <div className="flex gap-2 justify-center mb-4 sm:mb-6">
          {[
            { id: 'voley', label: 'VOLEY' },
            { id: 'basket', label: 'BASKET' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => { setDeporte(d.id); setCanchaMovil(0); }}
              className={`px-5 sm:px-6 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                deporte === d.id
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Selector de fecha */}
        <div className="grid grid-cols-7 gap-1.5 sm:flex sm:gap-2 sm:justify-center mb-4 sm:mb-6">
          {fechas.map((f) => {
            const mobile = formatearFechaMobile(f);
            const esHoyChip = f === hoyStr;
            return (
              <button
                key={f}
                onClick={() => setFecha(f)}
                className={`sm:flex-shrink-0 sm:px-4 py-1.5 sm:py-2.5 text-xs font-medium rounded-lg transition-all text-center ${
                  fecha === f
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {/* Mobile: vertical compacto */}
                <span className="sm:hidden flex flex-col items-center gap-0.5">
                  <span className="text-[9px] font-medium tracking-wide uppercase">{esHoyChip ? 'HOY' : mobile.dia}</span>
                  <span className="text-sm font-bold leading-none">{mobile.num}</span>
                </span>
                {/* Desktop: texto completo */}
                <span className="hidden sm:inline capitalize">
                  {esHoyChip ? 'Hoy' : formatearFechaCorta(f)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-5 sm:mb-8 text-[10px] sm:text-[11px] uppercase tracking-wider text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-white border border-gray-300" />
            <span>Libre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-black" />
            <span>Ocupado</span>
          </div>
          {esHoy && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-gray-200" />
              <span>Pasado</span>
            </div>
          )}
        </div>

        {/* Desktop: Tabla horas x canchas */}
        <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-32 p-2.5 text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                  Hora
                </th>
                {canchasDisponibles.map(c => (
                  <th key={c.id} className="p-2.5 text-xs font-bold uppercase tracking-wide text-black">
                    {c.nombre.replace('Cancha ', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slotMatrix.map(row => (
                <tr key={row.hora} className="border-b border-gray-100 last:border-b-0">
                  <td className="p-2 text-xs font-mono text-gray-400 text-center whitespace-nowrap bg-gray-50">
                    {formatearRango(row.hora, configuracion.intervalo)}
                  </td>
                  {row.canchas.map((cell, idx) => {
                    const cancha = canchasDisponibles[idx];
                    if (cell.pasada) {
                      return (
                        <td key={cancha.id} className="p-1.5 text-center bg-gray-100 text-gray-300 text-[11px]">
                          ---
                        </td>
                      );
                    }
                    if (cell.disponible) {
                      return (
                        <td
                          key={cancha.id}
                          onClick={handleClickSlot}
                          className="p-1.5 text-center bg-white text-gray-600 text-xs cursor-pointer hover:bg-gray-50 hover:ring-1 hover:ring-inset hover:ring-black transition-all group"
                        >
                          <span className="font-medium text-gray-500 group-hover:text-black">
                            Libre
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td key={cancha.id} className="p-1.5 text-center bg-black text-white text-[11px]">
                        <span className="font-medium tracking-wide">Ocupado</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet: tabs de cancha */}
        <div className="lg:hidden flex gap-1 mb-4 sm:mb-6 border-b border-gray-200">
          {canchasDisponibles.map((cancha, idx) => (
            <button
              key={cancha.id}
              onClick={() => { setCanchaMovil(idx); primerLibreEncontrado = false; }}
              className={`flex-1 px-2 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs font-medium transition-colors relative ${
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

        {/* Mobile/Tablet: lista vertical completa */}
        <div className="lg:hidden space-y-1 sm:space-y-1.5">
          {slotMatrix.map(row => {
            const cell = row.canchas[canchaMovil];
            if (!cell) return null;

            const esPrimerLibre = cell.disponible && !primerLibreEncontrado;
            if (esPrimerLibre) primerLibreEncontrado = true;

            return (
              <div
                key={row.hora}
                ref={esPrimerLibre ? primerLibreRef : null}
                onClick={() => cell.disponible ? handleClickSlot() : null}
                className={`flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                  cell.pasada
                    ? 'bg-gray-100 text-gray-300'
                    : cell.disponible
                      ? 'bg-white border border-gray-200 text-gray-700 active:scale-[0.98] cursor-pointer hover:border-black'
                      : 'bg-black text-white'
                }`}
              >
                <span className="font-mono">{formatearRango(row.hora, configuracion.intervalo)}</span>
                <span className="uppercase tracking-wider">
                  {cell.pasada ? '---' : cell.disponible ? 'Libre' : 'Ocupado'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DisponibilidadRapida;
