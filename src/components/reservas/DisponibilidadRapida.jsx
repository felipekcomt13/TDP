import { useState } from 'react';
import { useReservas } from '../../context/ReservasContext';
import { useCanchas } from '../../context/CanchasContext';
import { TARIFAS } from '../../utils/preciosCalculator';

// Turnos en que se agrupa la lista. El precio sigue la misma regla que
// preciosCalculator: turno noche desde las 18:00, día antes de eso.
const TURNOS = [
  { id: 'manana', label: 'Mañana', desde: 0, hasta: 12 * 60, precio: TARIFAS.dia['1h'] },
  { id: 'tarde', label: 'Tarde', desde: 12 * 60, hasta: 18 * 60, precio: TARIFAS.dia['1h'] },
  { id: 'noche', label: 'Noche', desde: 18 * 60, hasta: Infinity, precio: TARIFAS.noche['1h'] },
];

const DEPORTES = [
  { id: 'voley', label: 'VOLEY' },
  { id: 'basket', label: 'BASKET' },
];

// Por debajo de esta fracción de horarios libres, el día se marca como "pocos"
const UMBRAL_POCOS = 0.25;

const aMinutos = (hora) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

// Devuelve 'HH:MM' sin normalizar pasada la medianoche (p. ej. '24:30'),
// igual que generarHorarios y el wizard.
const sumarMinutos = (hora, minutos) => {
  const total = aMinutos(hora) + minutos;
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

// Para mostrar: '24:30' -> '00:30'
const formatearHora = (hora) => {
  const [h, m] = hora.split(':').map(Number);
  return `${(h % 24).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const formatearRango = (hora, duracion) => `${formatearHora(hora)} – ${formatearHora(sumarMinutos(hora, duracion))}`;

const aFechaStr = (d) =>
  `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

const nombreCorto = (cancha) => cancha.nombre.replace('Cancha ', '');

const DisponibilidadRapida = ({ onSeleccionarSlot }) => {
  const { verificarDisponibilidad, generarHorarios, configuracion, disponibilidadCargada } = useReservas();
  const { canchas, loading: canchasCargando } = useCanchas();

  const hoy = new Date();
  const hoyStr = aFechaStr(hoy);
  const minutosAhora = hoy.getHours() * 60 + hoy.getMinutes();

  const [fecha, setFecha] = useState(hoyStr);
  const [deporte, setDeporte] = useState('voley');

  const canchasDeporte = canchas.filter(c => c.estado === 'disponible' && (c.deportes || []).includes(deporte));
  const horarios = generarHorarios();
  const intervalo = configuracion.intervalo;

  const fechas = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() + i);
    return aFechaStr(d);
  });

  // Slots de 30 min de un día, ya sin los que pasaron (hoy) y con el estado
  // de cada cancha. Las horas >= 24 son de madrugada del día siguiente, nunca pasadas.
  const calcularSlots = (f) => horarios
    .filter(hora => f !== hoyStr || aMinutos(hora) >= minutosAhora)
    .map(hora => ({
      hora,
      libres: canchasDeporte.map(c => verificarDisponibilidad(f, hora, c.id)),
    }));

  const resumenDia = (f) => {
    const slots = calcularSlots(f);
    const total = slots.length * canchasDeporte.length;
    const libres = slots.reduce((acc, s) => acc + s.libres.filter(Boolean).length, 0);
    let nivel = 'libre';
    if (libres === 0) nivel = 'lleno';
    else if (libres / total < UMBRAL_POCOS) nivel = 'pocos';
    // Para el usuario contamos horas, no medias horas
    return { nivel, horasLibres: Math.floor((libres * intervalo) / 60) };
  };

  const cargando = !disponibilidadCargada || canchasCargando;
  const resumenes = cargando ? {} : Object.fromEntries(fechas.map(f => [f, resumenDia(f)]));

  const slots = cargando ? [] : calcularSlots(fecha);
  const slotPorHora = new Map(slots.map(s => [s.hora, s]));

  // Junta XX:00 + XX:30 en una fila de 1h cuando todas las canchas tienen el
  // mismo estado en ambas mitades. Como ahora se ven todas las canchas a la vez
  // (en desktop y en móvil), el criterio coincide con lo que el usuario ve.
  const filas = [];
  for (let i = 0; i < slots.length; i++) {
    const actual = slots[i];
    const siguiente = slots[i + 1];
    const puedeJuntar = siguiente &&
      aMinutos(actual.hora) % 60 === 0 &&
      aMinutos(siguiente.hora) === aMinutos(actual.hora) + 30 &&
      actual.libres.every((libre, idx) => libre === siguiente.libres[idx]);
    filas.push({ hora: actual.hora, duracion: puedeJuntar ? 60 : 30, libres: actual.libres });
    if (puedeJuntar) i++;
  }

  const secciones = TURNOS
    .map(turno => {
      const filasTurno = filas.filter(f => aMinutos(f.hora) >= turno.desde && aMinutos(f.hora) < turno.hasta);
      const horasLibres = filasTurno.filter(f => f.libres.some(Boolean)).reduce((acc, f) => acc + f.duracion, 0) / 60;
      return { ...turno, filas: filasTurno, horasLibres };
    })
    .filter(s => s.filas.length > 0);

  const hayLibres = filas.some(f => f.libres.some(Boolean));
  const siguienteFechaConLibres = fechas.find(f => f > fecha && resumenes[f]?.nivel !== 'lleno');

  const seleccionar = (fila, idxCancha) => {
    const cancha = canchasDeporte[idxCancha];
    // Por defecto 1 hora si la media hora siguiente también está libre en esa
    // cancha; si no, 30 min. En el wizard se puede ajustar.
    const siguiente = slotPorHora.get(sumarMinutos(fila.hora, 30));
    const duracion = fila.duracion === 60 || siguiente?.libres[idxCancha] ? 60 : 30;
    onSeleccionarSlot?.({
      deporte,
      cancha,
      fecha,
      horaInicio: fila.hora,
      horaFin: sumarMinutos(fila.hora, duracion),
    });
  };

  const etiquetaHoras = (n) => `${n} ${n === 1 ? 'hora libre' : 'horas libres'}`;

  const encabezadoTurno = (seccion) => (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-bold uppercase tracking-wide text-black">{seccion.label}</span>
      <span className="text-xs text-gray-500">
        S/ {seccion.precio} la hora
        <span className="mx-1.5 text-gray-300">·</span>
        {seccion.horasLibres > 0 ? etiquetaHoras(seccion.horasLibres) : 'Completo'}
      </span>
    </div>
  );

  const COLOR_NIVEL = { libre: 'bg-emerald-500', pocos: 'bg-amber-400', lleno: 'bg-gray-300' };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-2xl sm:text-4xl font-bold text-black mb-2 sm:mb-4 tracking-tight">
            DISPONIBILIDAD
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm uppercase tracking-wide">
            Toca una cancha libre para reservarla
          </p>
        </div>

        {/* Selector de deporte */}
        <div className="flex gap-2 justify-center mb-4 sm:mb-6">
          {DEPORTES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDeporte(d.id)}
              aria-pressed={deporte === d.id}
              className={`px-5 sm:px-6 py-2 sm:py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                deporte === d.id
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Selector de fecha, con un punto que indica qué tan lleno está cada día */}
        <div className="grid grid-cols-7 gap-1.5 sm:flex sm:gap-2 sm:justify-center mb-3">
          {fechas.map((f) => {
            const d = new Date(f + 'T12:00:00');
            const esHoyChip = f === hoyStr;
            const dia = esHoyChip ? 'Hoy' : d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '');
            const resumen = resumenes[f];
            const seleccionada = fecha === f;
            const descripcion = resumen
              ? (resumen.nivel === 'lleno' ? 'sin horarios libres' : etiquetaHoras(resumen.horasLibres))
              : 'cargando';
            return (
              <button
                key={f}
                onClick={() => setFecha(f)}
                aria-pressed={seleccionada}
                aria-label={`${d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}, ${descripcion}`}
                className={`sm:min-w-[4.5rem] sm:px-4 py-2 rounded-lg transition-all flex flex-col items-center gap-1 ${
                  seleccionada
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-[11px] font-medium uppercase tracking-wide leading-none">{dia}</span>
                <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                <span
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-full ${resumen ? COLOR_NIVEL[resumen.nivel] : 'bg-transparent'}`}
                />
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-6 sm:mb-8 text-[11px] uppercase tracking-wider text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white border-2 border-black" />
            Libre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" />
            Ocupado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            Día libre / pocos / lleno
          </span>
        </div>

        {cargando ? (
          <div className="space-y-2" aria-busy="true" aria-label="Cargando horarios">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : canchasDeporte.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-gray-500 text-sm">No hay canchas disponibles para este deporte.</p>
          </div>
        ) : !hayLibres ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-gray-700 text-sm font-medium mb-1">
              {filas.length === 0 ? 'Ya no quedan horarios por hoy.' : 'Todo reservado este día.'}
            </p>
            {siguienteFechaConLibres ? (
              <button
                onClick={() => setFecha(siguienteFechaConLibres)}
                className="mt-3 px-6 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-800 transition-all"
              >
                Ver el {new Date(siguienteFechaConLibres + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric' })}
              </button>
            ) : (
              <p className="text-gray-500 text-sm">No hay horarios libres en los próximos 7 días.</p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop: tabla horas × canchas, agrupada por turno */}
            <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th scope="col" className="w-36 p-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                      Hora
                    </th>
                    {canchasDeporte.map(c => (
                      <th key={c.id} scope="col" className="p-2.5 text-xs font-bold uppercase tracking-wide text-black">
                        {nombreCorto(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                {secciones.map(seccion => (
                  <tbody key={seccion.id}>
                    <tr className="border-b border-gray-200 bg-gray-50/60">
                      <td colSpan={canchasDeporte.length + 1} className="px-4 py-2.5">
                        {encabezadoTurno(seccion)}
                      </td>
                    </tr>
                    {seccion.filas.map(fila => (
                      <tr key={fila.hora} className="border-b border-gray-100 last:border-b-0">
                        <th scope="row" className="p-2 text-xs font-mono font-normal text-gray-600 text-center whitespace-nowrap">
                          {formatearRango(fila.hora, fila.duracion)}
                        </th>
                        {fila.libres.map((libre, idx) => (
                          <td key={canchasDeporte[idx].id} className="p-1">
                            {libre ? (
                              <button
                                onClick={() => seleccionar(fila, idx)}
                                aria-label={`Reservar ${canchasDeporte[idx].nombre}, ${formatearRango(fila.hora, fila.duracion)}`}
                                className="w-full py-1.5 rounded-md border-2 border-black bg-white text-black text-xs font-bold hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 transition-colors"
                              >
                                Reservar
                              </button>
                            ) : (
                              <div className="w-full py-1.5 rounded-md bg-gray-100 text-gray-500 text-xs text-center">
                                Ocupado
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>

            {/* Mobile/Tablet: una fila por horario con un botón por cada cancha */}
            <div className="lg:hidden space-y-6">
              {secciones.map(seccion => (
                <section key={seccion.id}>
                  <div className="mb-2 pb-2 border-b border-gray-200">{encabezadoTurno(seccion)}</div>
                  <div className="space-y-1.5">
                    {seccion.filas.map(fila => {
                      const algunaLibre = fila.libres.some(Boolean);
                      return (
                        <div
                          key={fila.hora}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                            algunaLibre ? 'bg-white border border-gray-200' : 'bg-gray-50'
                          }`}
                        >
                          <span className={`font-mono text-xs whitespace-nowrap w-[6.5rem] flex-shrink-0 ${algunaLibre ? 'text-black font-medium' : 'text-gray-500'}`}>
                            {formatearRango(fila.hora, fila.duracion)}
                          </span>
                          {algunaLibre ? (
                            <div className="flex flex-wrap gap-1.5 justify-end flex-1">
                              {fila.libres.map((libre, idx) => libre ? (
                                <button
                                  key={canchasDeporte[idx].id}
                                  onClick={() => seleccionar(fila, idx)}
                                  aria-label={`Reservar ${canchasDeporte[idx].nombre}, ${formatearRango(fila.hora, fila.duracion)}`}
                                  className="px-3 py-1.5 rounded-md border-2 border-black bg-white text-black text-xs font-bold active:bg-black active:text-white active:scale-[0.97] transition-all"
                                >
                                  {nombreCorto(canchasDeporte[idx])}
                                </button>
                              ) : (
                                <span
                                  key={canchasDeporte[idx].id}
                                  className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-400 text-xs line-through"
                                >
                                  <span className="sr-only">{canchasDeporte[idx].nombre} ocupada: </span>
                                  {nombreCorto(canchasDeporte[idx])}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="flex-1 text-right text-xs uppercase tracking-wider text-gray-500">Completo</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DisponibilidadRapida;
