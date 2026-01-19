import { useState, useRef, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useReservas } from '../context/ReservasContext';
import { useAuth } from '../context/AuthContext';
import { obtenerNombreCancha } from '../utils/preciosCalculator';

const CalendarioSemanal = ({ onSeleccionarHorario }) => {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [rangoSeleccion, setRangoSeleccion] = useState(null); // { fecha, horaInicio, dia, diaFecha, cancha }
  const [rangoHover, setRangoHover] = useState(null); // { horaFin, horas, esValido }
  const [vistaCancha, setVistaCancha] = useState('principal'); // 'principal' o 'anexas'
  const [showScrollIndicators, setShowScrollIndicators] = useState({ left: false, right: false });
  const scrollContainerRef = useRef(null);

  // Estado para drag-to-scroll
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragDistance, setDragDistance] = useState(0);
  const {
    generarHorarios,
    verificarDisponibilidad,
    verificarDisponibilidadRango,
    obtenerReservaEnSlot,
    obtenerHorasEnRango,
    obtenerReservasPorFecha,
    obtenerCanchasBloqueadas,
    configuracion
  } = useReservas();
  const { user, isAdmin } = useAuth();

  const inicioSemana = startOfWeek(fechaActual, { weekStartsOn: 1 });
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i));
  const horarios = generarHorarios();

  // Manejar indicadores de scroll
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowScrollIndicators({
          left: scrollLeft > 10,
          right: scrollLeft < scrollWidth - clientWidth - 10
        });
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      handleScroll(); // Check initial state
      container.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);

      return () => {
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [vistaCancha]);

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

  // Drag-to-scroll handlers (mouse)
  const handleMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setDragDistance(0);
    scrollContainerRef.current.style.cursor = 'grabbing';
    scrollContainerRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Multiplicador para velocidad
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    setDragDistance(Math.abs(walk));
  };

  const handleMouseUp = () => {
    if (!scrollContainerRef.current) return;
    setIsDragging(false);
    scrollContainerRef.current.style.cursor = 'grab';
    scrollContainerRef.current.style.userSelect = 'auto';
  };

  const handleMouseLeave = () => {
    if (!scrollContainerRef.current) return;
    setIsDragging(false);
    scrollContainerRef.current.style.cursor = 'grab';
    scrollContainerRef.current.style.userSelect = 'auto';
  };

  // Drag-to-scroll handlers (touch)
  const handleTouchStart = (e) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setDragDistance(0);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    setDragDistance(Math.abs(walk));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Función auxiliar para renderizar una celda de cancha
  const renderizarCelda = (dia, hora, cancha, diaIndex) => {
    const { disponible, reserva, estaBloqueada, canchaQueBloquea } = obtenerEstadoCelda(dia, hora, cancha);
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

    // Determinar si esta celda está en el rango de hover (mismo día y misma cancha)
    const esHoraInicial = rangoSeleccion &&
      rangoSeleccion.fecha === fechaStr &&
      rangoSeleccion.horaInicio === hora &&
      rangoSeleccion.cancha === cancha;

    const enRangoHover = rangoHover &&
      rangoSeleccion &&
      rangoSeleccion.fecha === fechaStr &&
      rangoSeleccion.cancha === cancha &&
      rangoHover.horas.includes(hora);

    // Determinar si es una celda que puede ser fin de rango (para mobile)
    const esPosibleFinDeRango = rangoSeleccion &&
      rangoSeleccion.fecha === fechaStr &&
      rangoSeleccion.cancha === cancha &&
      disponible &&
      !esHoraInicial &&
      hora >= rangoSeleccion.horaInicio;

    // Determinar clases CSS
    let clasesCelda = 'p-2 md:p-4 border-r border-gray-200 text-center transition-all ';

    if (estaBloqueada) {
      // Cancha bloqueada por otra reserva
      clasesCelda += 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60';
    } else if (!disponible) {
      // Celda reservada
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
    } else if (esPosibleFinDeRango) {
      // Celda que puede ser seleccionada como fin de rango (principalmente para mobile)
      clasesCelda += 'bg-blue-50 hover:bg-blue-100 text-blue-700 cursor-pointer border border-blue-200';
    } else if (rangoSeleccion && rangoSeleccion.fecha === fechaStr && rangoSeleccion.cancha === cancha) {
      // Mismo día y misma cancha pero no en rango hover (para desktop)
      clasesCelda += 'bg-gray-50 hover:bg-gray-100 text-gray-700 cursor-pointer';
    } else {
      // Disponible normal
      clasesCelda += 'bg-white hover:bg-gray-50 text-gray-600 cursor-pointer';
    }

    return (
      <td
        key={`${diaIndex}-${cancha}`}
        rowSpan={rowspan}
        onClick={() => !estaBloqueada && manejarClickCelda(dia, hora, disponible, cancha)}
        onMouseEnter={() => !estaBloqueada && manejarMouseEnter(dia, hora)}
        className={clasesCelda}
      >
        {estaBloqueada ? (
          <div className="text-[10px] md:text-xs">
            <div className="text-[9px] md:text-[10px] uppercase tracking-wide font-semibold text-gray-600">
              Reservado
            </div>
            {canchaQueBloquea && (
              <div className="text-[7px] md:text-[8px] text-gray-500 mt-0.5 leading-tight">
                {obtenerNombreCancha(canchaQueBloquea)}
              </div>
            )}
          </div>
        ) : disponible ? (
          <div className="text-xs md:text-sm">
            {esHoraInicial ? (
              <div className="font-bold">
                <div className="text-[9px] md:text-[10px] uppercase tracking-wider mb-1">Inicio</div>
                <div className="text-sm md:text-base">{hora}</div>
              </div>
            ) : enRangoHover ? (
              <div className="text-xl md:text-2xl font-bold">
                {rangoHover.esValido ? '•' : '×'}
              </div>
            ) : esPosibleFinDeRango ? (
              <div className="flex flex-col items-center justify-center">
                <span className="text-lg md:text-xl">↓</span>
                <span className="text-[8px] md:text-[9px] uppercase tracking-wide text-blue-600 font-semibold">Fin</span>
              </div>
            ) : (
              <span className="text-[10px] md:text-xs uppercase tracking-wide">
                <span className="hidden md:inline">Disponible</span>
                <span className="md:hidden">Disp</span>
              </span>
            )}
          </div>
        ) : (
          <div className="text-[10px] md:text-xs">
            <span className="font-semibold block uppercase tracking-wide text-[9px] md:text-[10px] mb-1">
              {reserva?.estado === 'pendiente' ? 'Pend' : 'Conf'}
            </span>
            {reserva?.nombre && (isAdmin() || reserva.userId === user?.id) && (
              <span className={`block text-[10px] md:text-xs ${reserva?.estado === 'pendiente' ? 'text-gray-600' : 'text-gray-300'} truncate max-w-[80px] md:max-w-none`}>
                {reserva.nombre}
              </span>
            )}
            {reserva?.horaFin && (
              <span className={`block mt-1 text-[9px] md:text-[10px] ${reserva?.estado === 'pendiente' ? 'text-gray-500' : 'text-gray-400'}`}>
                {reserva.hora} - {reserva.horaFin}
              </span>
            )}
          </div>
        )}
      </td>
    );
  };

  const obtenerEstadoCelda = (fecha, hora, cancha) => {
    const fechaStr = format(fecha, 'yyyy-MM-dd');
    const disponible = verificarDisponibilidad(fechaStr, hora, cancha);
    const reserva = obtenerReservaEnSlot(fechaStr, hora, cancha);
    const canchasBloqueadas = obtenerCanchasBloqueadas(fechaStr, hora);
    const estaBloqueada = canchasBloqueadas.includes(cancha);

    // Identificar qué cancha está causando el bloqueo
    let canchaQueBloquea = null;
    if (estaBloqueada && !reserva) {
      // Buscar qué cancha tiene la reserva que causa el bloqueo
      if (cancha === 'anexa-1' || cancha === 'anexa-2') {
        // Las anexas son bloqueadas por principal
        const reservaPrincipal = obtenerReservaEnSlot(fechaStr, hora, 'principal');
        if (reservaPrincipal) {
          canchaQueBloquea = 'principal';
        }
      } else if (cancha === 'principal') {
        // Principal es bloqueada por cualquier anexa
        const reservaAnexa1 = obtenerReservaEnSlot(fechaStr, hora, 'anexa-1');
        const reservaAnexa2 = obtenerReservaEnSlot(fechaStr, hora, 'anexa-2');
        if (reservaAnexa1) {
          canchaQueBloquea = 'anexa-1';
        } else if (reservaAnexa2) {
          canchaQueBloquea = 'anexa-2';
        }
      }
    }

    return { disponible, reserva, estaBloqueada, canchasBloqueadas, canchaQueBloquea };
  };

  const cancelarSeleccion = () => {
    setRangoSeleccion(null);
    setRangoHover(null);
  };

  const calcularRangoPreview = (horaInicio, horaFin, fecha, cancha) => {
    const horariosArray = generarHorarios();
    const indexInicio = horariosArray.indexOf(horaInicio);
    const indexFin = horariosArray.indexOf(horaFin);

    if (indexInicio === -1 || indexFin === -1) return null;

    // Determinar el orden correcto
    const inicio = Math.min(indexInicio, indexFin);
    const fin = Math.max(indexInicio, indexFin);

    const horasEnRango = horariosArray.slice(inicio, fin + 1);

    // Verificar si todas las horas están disponibles en la cancha especificada
    const esValido = horasEnRango.every(hora => verificarDisponibilidad(fecha, hora, cancha));

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

    // Calcular el rango preview con la cancha seleccionada
    const preview = calcularRangoPreview(rangoSeleccion.horaInicio, hora, fechaStr, rangoSeleccion.cancha);
    setRangoHover(preview);
  };

  const manejarClickCelda = (fecha, hora, disponible, cancha) => {
    // Prevenir click si acabamos de hacer drag
    if (dragDistance > 5) {
      setDragDistance(0);
      return;
    }

    if (!disponible) return;

    const fechaStr = format(fecha, 'yyyy-MM-dd');
    const diaSemana = format(fecha, 'EEEE', { locale: es });

    // Primer click: establecer hora inicial
    if (!rangoSeleccion) {
      setRangoSeleccion({
        fecha: fechaStr,
        horaInicio: hora,
        dia: diaSemana,
        diaFecha: fecha,
        cancha: cancha
      });
      return;
    }

    // Si clickea en otro día u otra cancha, reiniciar selección
    if (rangoSeleccion.fecha !== fechaStr || rangoSeleccion.cancha !== cancha) {
      setRangoSeleccion({
        fecha: fechaStr,
        horaInicio: hora,
        dia: diaSemana,
        diaFecha: fecha,
        cancha: cancha
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
        diaSemana: diaSemana,
        cancha: cancha
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
    const rangoDisponible = verificarDisponibilidadRango(fechaStr, horaInicioRango, hora, cancha);

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
      diaSemana: diaSemana,
      cancha: cancha
    });

    // Limpiar selección
    setRangoSeleccion(null);
    setRangoHover(null);
  };

  return (
    <div className="w-full">
      {/* Navegación de semanas */}
      <div className="flex items-center justify-between mb-6 md:mb-8 gap-2">
        <button
          onClick={() => cambiarSemana(-1)}
          className="px-3 py-2 md:px-6 md:py-3 bg-black text-white text-xs md:text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors"
        >
          <span className="hidden sm:inline">← ANTERIOR</span>
          <span className="sm:hidden">←</span>
        </button>
        <h2 className="text-base md:text-2xl font-bold tracking-tight uppercase text-center">
          {format(inicioSemana, 'd MMM', { locale: es })} - {format(addDays(inicioSemana, 6), 'd MMM yyyy', { locale: es })}
        </h2>
        <button
          onClick={() => cambiarSemana(1)}
          className="px-3 py-2 md:px-6 md:py-3 bg-black text-white text-xs md:text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors"
        >
          <span className="hidden sm:inline">SIGUIENTE →</span>
          <span className="sm:hidden">→</span>
        </button>
      </div>

      {/* Selector de vista de cancha */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
        <button
          onClick={() => {
            setVistaCancha('principal');
            cancelarSeleccion();
          }}
          className={`px-4 py-2 md:px-8 md:py-3 text-xs md:text-sm font-medium tracking-wide transition-colors ${
            vistaCancha === 'principal'
              ? 'bg-black text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          CANCHA PRINCIPAL
        </button>
        <button
          onClick={() => {
            setVistaCancha('anexas');
            cancelarSeleccion();
          }}
          className={`px-4 py-2 md:px-8 md:py-3 text-xs md:text-sm font-medium tracking-wide transition-colors ${
            vistaCancha === 'anexas'
              ? 'bg-black text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          CANCHAS ANEXAS
        </button>
      </div>

      {/* Indicador de selección en progreso */}
      {rangoSeleccion && (
        <div className={`mb-4 md:mb-6 p-4 md:p-6 border ${
          rangoHover && !rangoHover.esValido
            ? 'bg-gray-50 border-gray-400'
            : rangoHover
            ? 'bg-gray-50 border-black'
            : 'bg-gray-50 border-gray-300'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1">
              <p className="font-semibold text-black text-xs md:text-sm uppercase tracking-wide mb-2">
                {rangoHover && !rangoHover.esValido
                  ? 'Rango inválido'
                  : rangoHover
                  ? `${rangoHover.horas.length} hora${rangoHover.horas.length !== 1 ? 's' : ''} seleccionada${rangoHover.horas.length !== 1 ? 's' : ''}`
                  : 'Seleccionando horario'
                }
              </p>
              <p className="text-xs md:text-sm text-gray-600 mb-1">
                <span className="font-medium">Inicio:</span> {rangoSeleccion.horaInicio}
                {rangoHover && rangoHover.horaFin && rangoHover.horaFin !== rangoSeleccion.horaInicio && (
                  <span className="ml-2 md:ml-4">
                    <span className="font-medium">Fin:</span> {rangoHover.horaFin}
                  </span>
                )}
              </p>
              <p className="text-[10px] md:text-xs text-gray-500">
                {rangoHover && !rangoHover.esValido
                  ? 'Hay horarios ocupados en el rango seleccionado'
                  : rangoHover
                  ? 'Click para confirmar la reserva'
                  : <>
                      <span className="hidden md:inline">Pasa el mouse por las horas y haz click para confirmar</span>
                      <span className="md:hidden">Toca la hora de fin o la misma hora para confirmar</span>
                    </>
                }
              </p>
            </div>
            <button
              onClick={cancelarSeleccion}
              className="w-full sm:w-auto px-4 md:px-6 py-2 border border-gray-300 text-gray-700 text-xs md:text-sm font-medium tracking-wide hover:bg-gray-100 transition-colors"
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}

      {/* Tabla de horarios con indicadores de scroll */}
      <div className="relative">
        {/* Sombra izquierda - indica más contenido a la izquierda */}
        {showScrollIndicators.left && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/10 to-transparent pointer-events-none z-20"></div>
        )}

        {/* Sombra derecha - indica más contenido a la derecha */}
        {showScrollIndicators.right && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/10 to-transparent pointer-events-none z-20"></div>
        )}

        <div
          ref={scrollContainerRef}
          className="overflow-x-auto border border-gray-200 relative cursor-grab active:cursor-grabbing"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x pan-y',
            scrollBehavior: isDragging ? 'auto' : 'smooth',
            userSelect: isDragging ? 'none' : 'auto'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="bg-black text-white">
              <th className="p-2 md:p-4 text-left font-semibold text-[10px] md:text-xs tracking-wider uppercase border-r border-gray-700 sticky left-0 bg-black z-10">Horario</th>
              {diasSemana.map((dia, index) => {
                if (vistaCancha === 'principal') {
                  // Vista principal: una columna por día
                  return (
                    <th key={index} className="p-2 md:p-4 text-center font-medium border-r border-gray-700 min-w-[100px] md:min-w-[140px] last:border-r-0">
                      <div className="flex flex-col">
                        <span className="text-[9px] md:text-[10px] uppercase tracking-widest opacity-70">{format(dia, 'EEE', { locale: es })}</span>
                        <span className={`text-sm md:text-lg font-bold mt-1 ${isSameDay(dia, new Date()) ? 'underline' : ''}`}>
                          {format(dia, 'd MMM', { locale: es })}
                        </span>
                      </div>
                    </th>
                  );
                } else {
                  // Vista anexas: dos columnas por día (Anexa 1 y Anexa 2)
                  return (
                    <th key={index} colSpan={2} className="p-0 border-r border-gray-700 last:border-r-0 min-w-[140px] md:min-w-[180px]">
                      <div className="flex flex-col">
                        <div className="p-1 md:p-2 border-b border-gray-700">
                          <span className="text-[9px] md:text-[10px] uppercase tracking-widest opacity-70">{format(dia, 'EEE', { locale: es })}</span>
                          <span className={`text-sm md:text-lg font-bold ml-1 md:ml-2 ${isSameDay(dia, new Date()) ? 'underline' : ''}`}>
                            {format(dia, 'd MMM', { locale: es })}
                          </span>
                        </div>
                        <div className="flex">
                          <div className="flex-1 p-1 md:p-2 text-[9px] md:text-[10px] uppercase tracking-wider border-r border-gray-700">Anexa 1</div>
                          <div className="flex-1 p-1 md:p-2 text-[9px] md:text-[10px] uppercase tracking-wider">Anexa 2</div>
                        </div>
                      </div>
                    </th>
                  );
                }
              })}
            </tr>
          </thead>
          <tbody>
            {horarios.map((hora, horaIndex) => (
              <tr key={horaIndex} className="border-b border-gray-100 last:border-b-0">
                <td className="p-2 md:p-4 font-medium border-r border-gray-200 bg-gray-50 text-[10px] md:text-sm text-gray-700 sticky left-0 z-10">
                  <span className="hidden md:inline">{hora} - {calcularHoraFin(hora)}</span>
                  <span className="md:hidden">{hora}</span>
                </td>
                {diasSemana.map((dia, diaIndex) => {
                  if (vistaCancha === 'principal') {
                    // Vista principal: renderizar una celda por día para cancha principal
                    return renderizarCelda(dia, hora, 'principal', diaIndex);
                  } else {
                    // Vista anexas: renderizar dos celdas por día (Anexa 1 y Anexa 2)
                    return (
                      <>
                        {renderizarCelda(dia, hora, 'anexa-1', `${diaIndex}-1`)}
                        {renderizarCelda(dia, hora, 'anexa-2', `${diaIndex}-2`)}
                      </>
                    );
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-4 md:mt-6 flex gap-3 md:gap-6 justify-center text-[10px] md:text-xs flex-wrap px-2">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-4 h-4 md:w-6 md:h-6 bg-white border border-gray-300"></div>
          <span className="uppercase tracking-wide text-gray-600">Disponible</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-4 h-4 md:w-6 md:h-6 bg-gray-100 border border-gray-300"></div>
          <span className="uppercase tracking-wide text-gray-600">Pendiente</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-4 h-4 md:w-6 md:h-6 bg-black border border-black"></div>
          <span className="uppercase tracking-wide text-gray-600">Confirmado</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarioSemanal;
