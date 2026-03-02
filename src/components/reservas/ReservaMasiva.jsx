import { useState, useMemo } from 'react';
import { format, addDays, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useReservas } from '../../context/ReservasContext';

const DIAS_SEMANA = [
  { valor: 1, label: 'Lun' },
  { valor: 2, label: 'Mar' },
  { valor: 3, label: 'Mie' },
  { valor: 4, label: 'Jue' },
  { valor: 5, label: 'Vie' },
  { valor: 6, label: 'Sab' },
  { valor: 0, label: 'Dom' },
];

const CANCHAS = [
  { valor: 'principal', label: 'Cancha Principal' },
  { valor: 'anexa-1', label: 'Anexa 1' },
  { valor: 'anexa-2', label: 'Anexa 2' },
];

const ReservaMasiva = ({ onCerrar }) => {
  const { verificarDisponibilidad, generarHorarios, agregarReservasMasivas } = useReservas();

  // Datos del cliente
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');

  // Config de horarios
  const [cancha, setCancha] = useState('principal');
  const [deporte, setDeporte] = useState('basket');
  const [diasSeleccionados, setDiasSeleccionados] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');

  // Estado UI
  const [creando, setCreando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  const horarios = generarHorarios();

  const toggleDia = (dia) => {
    setDiasSeleccionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  // Generar preview de reservas
  const preview = useMemo(() => {
    if (!fechaInicio || !fechaFin || !horaInicio || !horaFin || diasSeleccionados.length === 0) {
      return [];
    }

    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');
    if (inicio > fin) return [];

    const idxHoraInicio = horarios.indexOf(horaInicio);
    const idxHoraFin = horarios.indexOf(horaFin);
    if (idxHoraInicio === -1 || idxHoraFin === -1 || idxHoraInicio >= idxHoraFin) return [];

    const horasRango = horarios.slice(idxHoraInicio, idxHoraFin);
    const reservas = [];
    let fecha = inicio;

    while (fecha <= fin) {
      const diaSemana = getDay(fecha);
      if (diasSeleccionados.includes(diaSemana)) {
        const fechaStr = format(fecha, 'yyyy-MM-dd');
        const diaLabel = format(fecha, 'EEEE', { locale: es });

        // Verificar cada hora del rango
        const horasConflicto = [];
        const horasDisponibles = [];

        for (const hora of horasRango) {
          const disponible = verificarDisponibilidad(fechaStr, hora, cancha);
          if (disponible) {
            horasDisponibles.push(hora);
          } else {
            horasConflicto.push(hora);
          }
        }

        const tieneConflicto = horasConflicto.length > 0;
        const disponibleCompleto = horasConflicto.length === 0;

        reservas.push({
          fecha: fechaStr,
          diaLabel,
          horaInicio,
          horaFin,
          horasDisponibles,
          horasConflicto,
          tieneConflicto,
          disponibleCompleto,
        });
      }
      fecha = addDays(fecha, 1);
    }

    return reservas;
  }, [fechaInicio, fechaFin, horaInicio, horaFin, diasSeleccionados, cancha, verificarDisponibilidad, horarios]);

  const reservasValidas = preview.filter(r => r.disponibleCompleto);
  const reservasConConflicto = preview.filter(r => r.tieneConflicto);

  const validarFormulario = () => {
    if (!nombre.trim()) return 'El nombre es obligatorio';
    if (!dni.trim() || !/^\d{8}$/.test(dni)) return 'El DNI debe tener 8 digitos';
    if (diasSeleccionados.length === 0) return 'Selecciona al menos un dia';
    if (!fechaInicio || !fechaFin) return 'Selecciona el rango de fechas';
    if (!horaInicio || !horaFin) return 'Selecciona el rango horario';
    if (reservasValidas.length === 0) return 'No hay reservas validas para crear';
    return null;
  };

  const handleCrear = async () => {
    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setCreando(true);
    setError('');

    try {
      const reservasParaCrear = reservasValidas.map(r => ({
        nombre: nombre.trim(),
        dni: dni.trim(),
        telefono: telefono.trim() || null,
        notas: notas.trim() || null,
        fecha: r.fecha,
        hora: r.horaInicio,
        horaFin: r.horaFin,
        diaSemana: r.diaLabel,
        cancha,
        deporte,
      }));

      const cantidad = await agregarReservasMasivas(reservasParaCrear);
      setResultado(cantidad);
    } catch (err) {
      setError(err.message || 'Error al crear reservas');
    } finally {
      setCreando(false);
    }
  };

  // Horarios para el select de hora fin (posteriores a horaInicio)
  const horariosFinDisponibles = horaInicio
    ? horarios.filter(h => h > horaInicio)
    : horarios.slice(1);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold tracking-tight uppercase">Reserva Masiva</h2>
            <p className="text-xs text-gray-500 mt-1">Crear reservas recurrentes para academias o contratos</p>
          </div>
          <button
            onClick={onCerrar}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {resultado !== null ? (
          /* Resultado exitoso */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">{resultado} reservas creadas</h3>
            <p className="text-sm text-gray-500 mb-6">Todas confirmadas y visibles en el calendario</p>
            <button
              onClick={onCerrar}
              className="px-8 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 active:scale-[0.98] transition-all"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Seccion 1: Datos del cliente */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Datos del cliente</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nombre *"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="col-span-2 sm:col-span-1 px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
                />
                <input
                  type="text"
                  placeholder="DNI (8 digitos) *"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="col-span-2 sm:col-span-1 px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
                />
                <input
                  type="text"
                  placeholder="Telefono (opcional)"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="col-span-2 sm:col-span-1 px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
                />
                <input
                  type="text"
                  placeholder="Notas (ej: Academia Pro)"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="col-span-2 sm:col-span-1 px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Seccion 2: Cancha y Deporte */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Cancha y deporte</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex gap-1.5 flex-wrap">
                    {CANCHAS.map(c => (
                      <button
                        key={c.valor}
                        onClick={() => setCancha(c.valor)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                          cancha === c.valor
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex gap-1.5">
                    {['basket', 'voley'].map(d => (
                      <button
                        key={d}
                        onClick={() => setDeporte(d)}
                        className={`px-4 py-2 text-xs font-medium rounded-lg transition-all capitalize ${
                          deporte === d
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Seccion 3: Dias de la semana */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Dias de la semana</h3>
              <div className="flex gap-2 flex-wrap">
                {DIAS_SEMANA.map(dia => (
                  <button
                    key={dia.valor}
                    onClick={() => toggleDia(dia.valor)}
                    className={`w-12 h-12 text-xs font-bold rounded-xl transition-all ${
                      diasSeleccionados.includes(dia.valor)
                        ? 'bg-black text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {dia.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Seccion 4: Rango de fechas y horas */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Periodo y horario</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Fecha inicio</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Fecha fin</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Hora inicio</label>
                  <select
                    value={horaInicio}
                    onChange={(e) => {
                      setHoraInicio(e.target.value);
                      if (horaFin && e.target.value >= horaFin) setHoraFin('');
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
                  >
                    <option value="">Seleccionar</option>
                    {horarios.slice(0, -1).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Hora fin</label>
                  <select
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white transition-all"
                  >
                    <option value="">Seleccionar</option>
                    {horariosFinDisponibles.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
                  Preview ({reservasValidas.length} reservas)
                  {reservasConConflicto.length > 0 && (
                    <span className="text-red-500 ml-2">
                      {reservasConConflicto.length} con conflicto
                    </span>
                  )}
                </h3>
                <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="text-left p-2.5 font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                        <th className="text-left p-2.5 font-semibold text-gray-500 uppercase tracking-wide">Dia</th>
                        <th className="text-left p-2.5 font-semibold text-gray-500 uppercase tracking-wide">Horario</th>
                        <th className="text-center p-2.5 font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr
                          key={i}
                          className={`border-t border-gray-50 ${r.tieneConflicto ? 'bg-red-50 text-red-400 line-through' : ''}`}
                        >
                          <td className="p-2.5">{format(new Date(r.fecha + 'T00:00:00'), 'd MMM', { locale: es })}</td>
                          <td className="p-2.5 capitalize">{r.diaLabel}</td>
                          <td className="p-2.5">{r.horaInicio} - {r.horaFin}</td>
                          <td className="p-2.5 text-center">
                            {r.tieneConflicto ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-semibold">Conflicto</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-semibold">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onCerrar}
                className="flex-1 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrear}
                disabled={creando || reservasValidas.length === 0}
                className="flex-1 py-3 bg-black text-white text-sm font-medium rounded-xl shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {creando ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creando...
                  </span>
                ) : (
                  `Crear ${reservasValidas.length} reserva${reservasValidas.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReservaMasiva;
