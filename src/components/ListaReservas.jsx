import { useState } from 'react';
import { useReservas } from '../context/ReservasContext';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { obtenerNombreCancha, calcularPrecioReserva, obtenerDesglosePrecio } from '../utils/preciosCalculator';

const ListaReservas = () => {
  const { reservas, eliminarReserva, obtenerHorasEnRango, rechazarReserva } = useReservas();
  const { user } = useAuth();
  const [filtro, setFiltro] = useState('todas'); // 'todas', 'proximas', 'pasadas', 'pendientes', 'confirmadas'
  const [busqueda, setBusqueda] = useState('');
  const [reservaAEliminar, setReservaAEliminar] = useState(null);

  const fechaActual = new Date();
  fechaActual.setHours(0, 0, 0, 0);

  // Filtrar solo las reservas del usuario autenticado
  const reservasDelUsuario = reservas.filter(reserva => reserva.userId === user?.id);

  const reservasFiltradas = reservasDelUsuario
    .filter(reserva => {
      const fechaReserva = parseISO(reserva.fecha);

      if (filtro === 'proximas') {
        return fechaReserva >= fechaActual;
      } else if (filtro === 'pasadas') {
        return fechaReserva < fechaActual;
      } else if (filtro === 'pendientes') {
        return reserva.estado === 'pendiente';
      } else if (filtro === 'confirmadas') {
        return reserva.estado === 'confirmada';
      }
      return true;
    })
    .filter(reserva => {
      if (!busqueda) return true;
      const busquedaLower = busqueda.toLowerCase();
      return (
        reserva.nombre.toLowerCase().includes(busquedaLower) ||
        reserva.telefono?.toLowerCase().includes(busquedaLower) ||
        reserva.email?.toLowerCase().includes(busquedaLower)
      );
    })
    .sort((a, b) => {
      const fechaA = parseISO(a.fecha);
      const fechaB = parseISO(b.fecha);
      if (fechaA.getTime() !== fechaB.getTime()) {
        return fechaA - fechaB;
      }
      return a.hora.localeCompare(b.hora);
    });

  const confirmarEliminacion = (reserva) => {
    setReservaAEliminar(reserva);
  };

  const handleEliminar = () => {
    if (reservaAEliminar) {
      eliminarReserva(reservaAEliminar.id);
      setReservaAEliminar(null);
    }
  };

  const formatearFecha = (fechaStr) => {
    const fecha = parseISO(fechaStr);
    return format(fecha, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  };

  return (
    <div className="w-full">
      {/* Filtros y búsqueda */}
      <div className="mb-8 space-y-6">
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setFiltro('todas')}
            className={`relative px-6 py-3 text-xs font-medium tracking-widest uppercase transition-colors ${
              filtro === 'todas'
                ? 'text-black'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Todas ({reservasDelUsuario.length})
            {filtro === 'todas' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></span>
            )}
          </button>
          <button
            onClick={() => setFiltro('pendientes')}
            className={`relative px-6 py-3 text-xs font-medium tracking-widest uppercase transition-colors ${
              filtro === 'pendientes'
                ? 'text-black'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Pendientes
            {filtro === 'pendientes' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></span>
            )}
          </button>
          <button
            onClick={() => setFiltro('confirmadas')}
            className={`relative px-6 py-3 text-xs font-medium tracking-widest uppercase transition-colors ${
              filtro === 'confirmadas'
                ? 'text-black'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Confirmadas
            {filtro === 'confirmadas' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></span>
            )}
          </button>
          <button
            onClick={() => setFiltro('proximas')}
            className={`relative px-6 py-3 text-xs font-medium tracking-widest uppercase transition-colors ${
              filtro === 'proximas'
                ? 'text-black'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Próximas
            {filtro === 'proximas' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></span>
            )}
          </button>
          <button
            onClick={() => setFiltro('pasadas')}
            className={`relative px-6 py-3 text-xs font-medium tracking-widest uppercase transition-colors ${
              filtro === 'pasadas'
                ? 'text-black'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Pasadas
            {filtro === 'pasadas' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></span>
            )}
          </button>
        </div>

        <input
          type="text"
          placeholder="BUSCAR POR NOMBRE, TELÉFONO O EMAIL"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-0 py-3 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none bg-transparent text-black placeholder-gray-400 text-sm tracking-wide transition-colors"
        />
      </div>

      {/* Lista de reservas */}
      {reservasFiltradas.length === 0 ? (
        <div className="text-center py-16 border border-gray-200">
          <p className="text-gray-400 text-sm uppercase tracking-widest">No se encontraron reservas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservasFiltradas.map((reserva) => {
            const fechaReserva = parseISO(reserva.fecha);
            const esPasada = fechaReserva < fechaActual;

            return (
              <div
                key={reserva.id}
                className={`bg-white border p-4 md:p-6 transition-all hover:shadow-md ${
                  esPasada
                    ? 'border-gray-200 opacity-60'
                    : reserva.estado === 'pendiente'
                    ? 'border-gray-300'
                    : 'border-black'
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
                      <h3 className="text-xl md:text-2xl font-bold text-black tracking-tight">
                        {reserva.nombre}
                      </h3>
                      <span
                        className={`px-3 py-1 border text-[10px] font-semibold uppercase tracking-widest ${
                          reserva.estado === 'pendiente'
                            ? 'border-gray-400 text-gray-600'
                            : 'border-black text-black'
                        }`}
                      >
                        {reserva.estado === 'pendiente' ? 'Pendiente' : 'Confirmada'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <p>
                        <span className="font-semibold">Cancha:</span>{' '}
                        <span className="text-black font-bold">{obtenerNombreCancha(reserva.cancha || 'principal')}</span>
                      </p>
                      <p>
                        <span className="font-semibold">Deporte:</span>{' '}
                        <span className="text-black font-bold">{reserva.deporte === 'basket' ? 'Básquet' : 'Vóley'}</span>
                      </p>
                      <p>
                        <span className="font-semibold">Precio:</span>{' '}
                        <span className="text-black font-bold">
                          S/ {calcularPrecioReserva(reserva.cancha || 'principal', reserva.hora, reserva.horaFin)}
                          {reserva.horaFin && (() => {
                            const desglose = obtenerDesglosePrecio(reserva.cancha || 'principal', reserva.hora, reserva.horaFin);
                            return <span className="text-xs text-gray-600 font-normal ml-1">({desglose.numHoras}h)</span>;
                          })()}
                        </span>
                      </p>
                      <p>
                        <span className="font-semibold">Fecha:</span>{' '}
                        {formatearFecha(reserva.fecha)}
                      </p>
                      <p>
                        <span className="font-semibold">Horario:</span>{' '}
                        {reserva.horaFin ? (
                          <>
                            {reserva.hora} - {reserva.horaFin}
                          </>
                        ) : (
                          <>{reserva.hora}</>
                        )}
                      </p>
                      {reserva.telefono && (
                        <p>
                          <span className="font-semibold">Teléfono:</span> {reserva.telefono}
                        </p>
                      )}
                      {reserva.email && (
                        <p>
                          <span className="font-semibold">Email:</span> {reserva.email}
                        </p>
                      )}
                      {reserva.dni && (
                        <p>
                          <span className="font-semibold">DNI:</span> {reserva.dni}
                        </p>
                      )}
                      {reserva.notas && (
                        <p>
                          <span className="font-semibold">Notas:</span> {reserva.notas}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Solo mostrar botón cancelar para reservas pendientes - las confirmadas solo pueden ser eliminadas por admins */}
                  {reserva.estado === 'pendiente' && (
                    <div className="w-full md:w-auto md:ml-6 flex flex-row md:flex-col gap-2">
                      <button
                        onClick={() => confirmarEliminacion(reserva)}
                        className="flex-1 md:flex-initial px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium tracking-widest hover:bg-gray-50 transition-colors uppercase"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {reservaAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-md w-full p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-black mb-6 tracking-tight uppercase">
              Confirmar cancelación
            </h2>
            <div className="mb-6 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Nombre</p>
                <p className="font-semibold text-black">{reservaAEliminar.nombre}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Cancha</p>
                  <p className="text-sm text-gray-700">{obtenerNombreCancha(reservaAEliminar.cancha || 'principal')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Deporte</p>
                  <p className="text-sm text-gray-700">{reservaAEliminar.deporte === 'basket' ? 'Básquet' : 'Vóley'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Fecha</p>
                  <p className="text-sm text-gray-700">
                    {format(parseISO(reservaAEliminar.fecha), 'd MMM yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Horario</p>
                  <p className="text-sm text-gray-700">
                    {reservaAEliminar.horaFin ? (
                      <>
                        {reservaAEliminar.hora} - {reservaAEliminar.horaFin}
                      </>
                    ) : (
                      <>{reservaAEliminar.hora}</>
                    )}
                  </p>
                </div>
              </div>
              {reservaAEliminar.dni && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">DNI</p>
                  <p className="text-sm text-gray-700">{reservaAEliminar.dni}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-6 uppercase tracking-wide">Esta acción no se puede deshacer</p>

            <div className="flex gap-3">
              <button
                onClick={() => setReservaAEliminar(null)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium tracking-wide hover:bg-gray-50 transition-colors uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                className="flex-1 px-6 py-3 bg-black text-white text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors uppercase"
              >
                Cancelar reserva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaReservas;
