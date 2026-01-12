import { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useReservas } from '../context/ReservasContext';

const CalendarioSemanal = ({ onSeleccionarHorario }) => {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [rangoSeleccion, setRangoSeleccion] = useState(null); // { fecha, horaInicio, dia, diaFecha }
  const [rangoHover, setRangoHover] = useState(null); // { horaFin, horas, esValido }
  const {
    generarHorarios,
    verificarDisponibilidad,
    verificarDisponibilidadRango,
    obtenerReservaEnSlot,
    obtenerHorasEnRango,
    obtenerReservasPorFecha,
    configuracion
  } = useReservas();

  const inicioSemana = startOfWeek(fechaActual, { weekStartsOn: 1 });
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i));
  const horarios = generarHorarios();

  // Función para calcular la hora de fin de un slot
  const calcularHoraFin = (horaInicio) => {
    const [hora, minuto] = horaInicio.split(':').map(Number);
    let nuevaHora = hora;
    let nuevoMinuto = minuto + configuracion.intervalo;

    if (nuevoMinuto >= 60) {
      nuevaHora += Math.floor(nuevoMinuto / 60);
      nuevoMinuto = nuevoMinuto % 60;
    }

    return `${nuevaHora.toString().padStart(2, '0')}:${nuevoMinuto.toString().padStart(2, '0')}`;
  };

  const cambiarSemana = (direccion) => {
    const nuevaFecha = addDays(fechaActual, direccion * 7);
    setFechaActual(nuevaFecha);
    setRangoSeleccion(null);
    setRangoHover(null);
  };

  const obtenerEstadoCelda = (fecha, hora) => {
    const fechaStr = format(fecha, 'yyyy-MM-dd');
    const disponible = verificarDisponibilidad(fechaStr, hora);
    const reserva = obtenerReservaEnSlot(fechaStr, hora);

    return { disponible, reserva };
  };

  const cancelarSeleccion = () => {
    setRangoSeleccion(null);
    setRangoHover(null);
  };

  const calcularRangoPreview = (horaInicio, horaFin, fecha) => {
    const horariosArray = generarHorarios();
    const indexInicio = horariosArray.indexOf(horaInicio);
    const indexFin = horariosArray.indexOf(horaFin);

    if (indexInicio === -1 || indexFin === -1) return null;

    // Determinar el orden correcto
    const inicio = Math.min(indexInicio, indexFin);
    const fin = Math.max(indexInicio, indexFin);

    const horasEnRango = horariosArray.slice(inicio, fin + 1);

    // Verificar si todas las horas están disponibles
    const esValido = horasEnRango.every(hora => verificarDisponibilidad(fecha, hora));

    // Calcular la hora de fin real (fin del último slot)
    const ultimaHora = horariosArray[fin];
    const horaFinReal = calcularHoraFin(ultimaHora);

    return {
      horaFin: horaFinReal, // Hora de fin del último slot
      horas: horasEnRango,
      esValido
    };
  };

  const manejarMouseEnter = (fecha, hora) => {
    // Solo calcular preview si hay una selección inicial
    if (!rangoSeleccion) return;

    const fechaStr = format(fecha, 'yyyy-MM-dd');

    // Solo permitir hover en el mismo día
    if (rangoSeleccion.fecha !== fechaStr) {
      setRangoHover(null);
      return;
    }

    // Calcular el rango preview
    const preview = calcularRangoPreview(rangoSeleccion.horaInicio, hora, fechaStr);
    setRangoHover(preview);
  };

  const manejarClickCelda = (fecha, hora, disponible) => {
    if (!disponible) return;

    const fechaStr = format(fecha, 'yyyy-MM-dd');
    const diaSemana = format(fecha, 'EEEE', { locale: es });

    // Primer click: establecer hora inicial
    if (!rangoSeleccion) {
      setRangoSeleccion({
        fecha: fechaStr,
        horaInicio: hora,
        dia: diaSemana,
        diaFecha: fecha
      });
      return;
    }

    // Si clickea en otro día, reiniciar selección
    if (rangoSeleccion.fecha !== fechaStr) {
      setRangoSeleccion({
        fecha: fechaStr,
        horaInicio: hora,
        dia: diaSemana,
        diaFecha: fecha
      });
      setRangoHover(null);
      return;
    }

    // Segundo click: confirmar rango
    // Si clickeó en la misma celda, es reserva de 1 hora
    if (hora === rangoSeleccion.horaInicio) {
      // Calcular la hora de fin sumando el intervalo
      const horaFinCalculada = calcularHoraFin(rangoSeleccion.horaInicio);

      onSeleccionarHorario({
        fecha: fechaStr,
        horaInicio: rangoSeleccion.horaInicio,
        horaFin: horaFinCalculada, // Hora de fin calculada correctamente
        diaSemana: diaSemana
      });
      setRangoSeleccion(null);
      setRangoHover(null);
      return;
    }

    // Si hay hover preview, validar que sea válido
    if (rangoHover && !rangoHover.esValido) {
      alert('Uno o más horarios en el rango seleccionado ya están reservados. Por favor, selecciona otro rango.');
      return;
    }

    // Determinar orden correcto de horas
    const horariosArray = generarHorarios();
    const indexInicio = horariosArray.indexOf(rangoSeleccion.horaInicio);
    const indexFin = horariosArray.indexOf(hora);

    // Calcular las horas de inicio y fin del rango
    const horaInicioRango = indexInicio <= indexFin ? rangoSeleccion.horaInicio : hora;
    const horaFinRango = indexInicio <= indexFin ? calcularHoraFin(hora) : calcularHoraFin(rangoSeleccion.horaInicio);

    // Verificar disponibilidad del rango completo antes de confirmar
    const rangoDisponible = verificarDisponibilidadRango(fechaStr, horaInicioRango, hora);

    if (!rangoDisponible) {
      alert('Uno o más horarios en el rango seleccionado ya están reservados. Por favor, selecciona otro rango.');
      setRangoSeleccion(null);
      setRangoHover(null);
      return;
    }

    // Todo OK, abrir formulario con el rango
    onSeleccionarHorario({
      fecha: fechaStr,
      horaInicio: horaInicioRango,
      horaFin: horaFinRango,
      diaSemana: diaSemana
    });

    // Limpiar selección
    setRangoSeleccion(null);
    setRangoHover(null);
  };

  return (
    <div className="w-full">
      {/* Navegación de semanas */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => cambiarSemana(-1)}
          className="px-6 py-3 bg-black text-white text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors"
        >
          ← ANTERIOR
        </button>
        <h2 className="text-2xl font-bold tracking-tight uppercase">
          {format(inicioSemana, 'd MMM', { locale: es })} - {format(addDays(inicioSemana, 6), 'd MMM yyyy', { locale: es })}
        </h2>
        <button
          onClick={() => cambiarSemana(1)}
          className="px-6 py-3 bg-black text-white text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors"
        >
          SIGUIENTE →
        </button>
      </div>

      {/* Indicador de selección en progreso */}
      {rangoSeleccion && (
        <div className={`mb-6 p-6 border ${
          rangoHover && !rangoHover.esValido
            ? 'bg-gray-50 border-gray-400'
            : rangoHover
            ? 'bg-gray-50 border-black'
            : 'bg-gray-50 border-gray-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-semibold text-black text-sm uppercase tracking-wide mb-2">
                {rangoHover && !rangoHover.esValido
                  ? 'Rango inválido'
                  : rangoHover
                  ? `${rangoHover.horas.length} hora${rangoHover.horas.length !== 1 ? 's' : ''} seleccionada${rangoHover.horas.length !== 1 ? 's' : ''}`
                  : 'Seleccionando horario'
                }
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Inicio:</span> {rangoSeleccion.horaInicio}
                {rangoHover && rangoHover.horaFin && rangoHover.horaFin !== rangoSeleccion.horaInicio && (
                  <span className="ml-4">
                    <span className="font-medium">Fin:</span> {rangoHover.horaFin}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {rangoHover && !rangoHover.esValido
                  ? 'Hay horarios ocupados en el rango seleccionado'
                  : rangoHover
                  ? 'Click para confirmar la reserva'
                  : 'Pasa el mouse por las horas y haz click para confirmar'
                }
              </p>
            </div>
            <button
              onClick={cancelarSeleccion}
              className="ml-6 px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium tracking-wide hover:bg-gray-100 transition-colors"
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}

      {/* Tabla de horarios */}
      <div className="overflow-x-auto border border-gray-200">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="bg-black text-white">
              <th className="p-4 text-left font-semibold text-xs tracking-wider uppercase border-r border-gray-700">Horario</th>
              {diasSemana.map((dia, index) => (
                <th key={index} className="p-4 text-center font-medium border-r border-gray-700 min-w-[140px] last:border-r-0">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest opacity-70">{format(dia, 'EEE', { locale: es })}</span>
                    <span className={`text-lg font-bold mt-1 ${isSameDay(dia, new Date()) ? 'underline' : ''}`}>
                      {format(dia, 'd MMM', { locale: es })}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horarios.map((hora, horaIndex) => (
              <tr key={horaIndex} className="border-b border-gray-100 last:border-b-0">
                <td className="p-4 font-medium border-r border-gray-200 bg-gray-50 text-sm text-gray-700">
                  {hora} - {calcularHoraFin(hora)}
                </td>
                {diasSemana.map((dia, diaIndex) => {
                  const { disponible, reserva } = obtenerEstadoCelda(dia, hora);
                  const fechaStr = format(dia, 'yyyy-MM-dd');

                  // Verificar si esta celda es parte de un bloque multi-hora pero no es la primera
                  let esCeldaOculta = false;
                  if (!disponible && reserva && reserva.horaFin) {
                    if (reserva.hora !== hora) {
                      esCeldaOculta = true;
                    }
                  }

                  if (esCeldaOculta) {
                    return null;
                  }

                  // Calcular rowspan si es reserva multi-hora
                  let rowspan = 1;
                  if (!disponible && reserva && reserva.horaFin && reserva.hora === hora) {
                    const horasBloque = obtenerHorasEnRango(reserva.hora, reserva.horaFin);
                    rowspan = horasBloque.length;
                  }

                  // Determinar si esta celda está en el rango de hover
                  const esHoraInicial = rangoSeleccion &&
                    rangoSeleccion.fecha === fechaStr &&
                    rangoSeleccion.horaInicio === hora;

                  const enRangoHover = rangoHover &&
                    rangoSeleccion &&
                    rangoSeleccion.fecha === fechaStr &&
                    rangoHover.horas.includes(hora);

                  // Determinar clases CSS - Premium Minimalista
                  let clasesCelda = 'p-4 border-r border-gray-200 text-center transition-all ';

                  if (!disponible) {
                    // Celda reservada - diferenciar por estado
                    if (reserva?.estado === 'pendiente') {
                      clasesCelda += 'bg-gray-100 text-gray-600 cursor-not-allowed';
                    } else {
                      clasesCelda += 'bg-black text-white cursor-not-allowed';
                    }
                  } else if (esHoraInicial) {
                    // Hora inicial seleccionada
                    clasesCelda += 'bg-black text-white font-bold cursor-pointer border-2 border-black';
                  } else if (enRangoHover && !rangoHover.esValido) {
                    // En rango pero inválido
                    clasesCelda += 'bg-gray-200 text-gray-500 cursor-pointer border border-gray-400';
                  } else if (enRangoHover && rangoHover.esValido) {
                    // En rango y válido
                    clasesCelda += 'bg-gray-200 hover:bg-gray-300 text-black cursor-pointer font-semibold border border-gray-400';
                  } else if (rangoSeleccion && rangoSeleccion.fecha === fechaStr) {
                    // Mismo día pero no en rango hover
                    clasesCelda += 'bg-gray-50 hover:bg-gray-100 text-gray-700 cursor-pointer';
                  } else {
                    // Disponible normal
                    clasesCelda += 'bg-white hover:bg-gray-50 text-gray-600 cursor-pointer';
                  }

                  return (
                    <td
                      key={diaIndex}
                      rowSpan={rowspan}
                      onClick={() => manejarClickCelda(dia, hora, disponible)}
                      onMouseEnter={() => manejarMouseEnter(dia, hora)}
                      className={clasesCelda}
                    >
                      {disponible ? (
                        <div className="text-sm">
                          {esHoraInicial ? (
                            <div className="font-bold">
                              <div className="text-[10px] uppercase tracking-wider mb-1">Inicio</div>
                              <div className="text-base">{hora}</div>
                            </div>
                          ) : enRangoHover ? (
                            <div className="text-2xl font-bold">
                              {rangoHover.esValido ? '•' : '×'}
                            </div>
                          ) : (
                            <span className="text-xs uppercase tracking-wide">Disponible</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs">
                          <span className="font-semibold block uppercase tracking-wide text-[10px] mb-1">
                            {reserva?.estado === 'pendiente' ? 'Pendiente' : 'Confirmado'}
                          </span>
                          {reserva?.nombre && (
                            <span className={`block text-xs ${reserva?.estado === 'pendiente' ? 'text-gray-600' : 'text-gray-300'}`}>
                              {reserva.nombre}
                            </span>
                          )}
                          {reserva?.horaFin && (
                            <span className={`block mt-1 text-[10px] ${reserva?.estado === 'pendiente' ? 'text-gray-500' : 'text-gray-400'}`}>
                              {reserva.hora} - {reserva.horaFin}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="mt-6 flex gap-6 justify-center text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white border border-gray-300"></div>
          <span className="uppercase tracking-wide text-gray-600">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-100 border border-gray-300"></div>
          <span className="uppercase tracking-wide text-gray-600">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-black border border-black"></div>
          <span className="uppercase tracking-wide text-gray-600">Confirmado</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarioSemanal;
