import { useState } from 'react';
import { useReservas } from '../../context/ReservasContext';
import { useAuth } from '../../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { obtenerNombreCancha, calcularPrecioReserva, obtenerDesglosePrecio } from '../../utils/preciosCalculator';

const ListaReservas = () => {
  const { reservas, eliminarReserva } = useReservas();
  const { user, esSocio } = useAuth();
  const [filtro, setFiltro] = useState('proximas');
  const [busqueda, setBusqueda] = useState('');
  const [reservaAEliminar, setReservaAEliminar] = useState(null);

  const fechaActual = new Date();
  fechaActual.setHours(0, 0, 0, 0);

  const reservasDelUsuario = reservas.filter(reserva => reserva.userId === user?.id);

  const contarPorEstado = (estado) => reservasDelUsuario.filter(r => r.estado === estado).length;

  const reservasFiltradas = reservasDelUsuario
    .filter(reserva => {
      const fechaReserva = parseISO(reserva.fecha);
      if (filtro === 'proximas') return fechaReserva >= fechaActual;
      if (filtro === 'pasadas') return fechaReserva < fechaActual;
      if (filtro === 'pendientes') return reserva.estado === 'pendiente';
      if (filtro === 'confirmadas') return reserva.estado === 'confirmada';
      return true;
    })
    .filter(reserva => {
      if (!busqueda) return true;
      const b = busqueda.toLowerCase();
      return (
        reserva.nombre.toLowerCase().includes(b) ||
        reserva.telefono?.toLowerCase().includes(b) ||
        reserva.email?.toLowerCase().includes(b)
      );
    })
    .sort((a, b) => {
      const fechaA = parseISO(a.fecha);
      const fechaB = parseISO(b.fecha);
      if (fechaA.getTime() !== fechaB.getTime()) return fechaA - fechaB;
      return a.hora.localeCompare(b.hora);
    });

  const handleEliminar = () => {
    if (reservaAEliminar) {
      eliminarReserva(reservaAEliminar.id);
      setReservaAEliminar(null);
    }
  };

  const tabs = [
    { valor: 'proximas', label: 'Próximas' },
    { valor: 'pendientes', label: 'Pendientes', count: contarPorEstado('pendiente') },
    { valor: 'confirmadas', label: 'Confirmadas', count: contarPorEstado('confirmada') },
    { valor: 'pasadas', label: 'Pasadas' },
    { valor: 'todas', label: 'Todas', count: reservasDelUsuario.length }
  ];

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-px mb-6 border-b border-gray-200 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.valor}
            onClick={() => setFiltro(tab.valor)}
            className={`relative flex-shrink-0 px-4 py-2.5 text-xs font-medium tracking-wide uppercase transition-colors ${
              filtro === tab.valor ? 'text-black' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1.5 text-[10px] ${filtro === tab.valor ? 'text-black' : 'text-gray-400'}`}>
                {tab.count}
              </span>
            )}
            {filtro === tab.valor && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
            )}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="mb-6 relative">
        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 focus:border-black focus:outline-none bg-white text-black placeholder-gray-400 text-sm transition-colors"
        />
      </div>

      {/* Lista */}
      {reservasFiltradas.length === 0 ? (
        <div className="text-center py-16 border border-gray-200">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-400 text-sm mb-6">
            {reservasDelUsuario.length === 0 ? 'Aún no tienes reservas' : 'Sin resultados para estos filtros'}
          </p>
          {reservasDelUsuario.length === 0 && (
            <a
              href="/reservar"
              className="inline-block px-6 py-2.5 bg-black text-white text-xs font-medium tracking-widest hover:bg-gray-800 transition-colors uppercase"
            >
              Haz tu primera reserva
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {reservasFiltradas.map((reserva) => {
            const fechaReserva = parseISO(reserva.fecha);
            const esPasada = fechaReserva < fechaActual;
            const esPendiente = reserva.estado === 'pendiente';
            const cancha = reserva.cancha || 'principal';
            const precio = calcularPrecioReserva(cancha, reserva.hora, reserva.horaFin, esSocio());
            const desglose = reserva.horaFin ? obtenerDesglosePrecio(cancha, reserva.hora, reserva.horaFin, esSocio()) : null;

            return (
              <div
                key={reserva.id}
                className={`border p-4 md:p-5 transition-all ${
                  esPasada
                    ? 'border-gray-200 opacity-50'
                    : esPendiente
                    ? 'border-yellow-300 bg-yellow-50/30'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                  {/* Fecha visual */}
                  <div className="hidden md:flex flex-col items-center justify-center w-16 flex-shrink-0">
                    <span className="text-2xl font-bold text-black leading-none">
                      {format(fechaReserva, 'd')}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500">
                      {format(fechaReserva, 'MMM', { locale: es })}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                        esPendiente
                          ? 'bg-yellow-100 text-yellow-700'
                          : reserva.estado === 'confirmada'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {reserva.estado}
                      </span>
                      {esSocio() && (
                        <span className="text-[10px] text-gray-400">Tarifa socio</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span className="md:hidden">
                        {format(fechaReserva, "EEE d MMM", { locale: es })}
                      </span>
                      <span>
                        {reserva.horaFin ? `${reserva.hora} - ${reserva.horaFin}` : reserva.hora}
                      </span>
                      <span className="font-medium text-black">
                        {obtenerNombreCancha(cancha)}
                      </span>
                      <span className="capitalize">
                        {reserva.deporte === 'basket' ? 'Básquet' : 'Vóley'}
                      </span>
                      <span className="font-medium">
                        S/ {precio}
                        {desglose && <span className="text-xs text-gray-400 ml-1">({desglose.numHoras}h)</span>}
                      </span>
                    </div>
                    {reserva.notas && (
                      <p className="mt-1 text-xs text-gray-400 italic">"{reserva.notas}"</p>
                    )}
                  </div>

                  {/* Cancelar */}
                  {esPendiente && !esPasada && (
                    <button
                      onClick={() => setReservaAEliminar(reserva)}
                      className="flex-shrink-0 px-4 py-2 border border-gray-300 text-gray-500 text-xs font-medium tracking-widest hover:bg-gray-50 transition-colors uppercase"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal cancelar */}
      {reservaAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-sm w-full p-8">
            <h2 className="text-2xl font-bold text-black mb-4 tracking-tight uppercase">
              Cancelar reserva
            </h2>
            <div className="mb-6 text-sm text-gray-600 space-y-1">
              <p className="font-semibold text-black text-base">{reservaAEliminar.nombre}</p>
              <p>
                {format(parseISO(reservaAEliminar.fecha), "EEEE d 'de' MMMM", { locale: es })} - {reservaAEliminar.horaFin ? `${reservaAEliminar.hora} a ${reservaAEliminar.horaFin}` : reservaAEliminar.hora}
              </p>
              <p>{obtenerNombreCancha(reservaAEliminar.cancha || 'principal')}</p>
            </div>
            <p className="text-xs text-gray-400 mb-6">Esta acción no se puede deshacer</p>
            <div className="flex gap-3">
              <button
                onClick={() => setReservaAEliminar(null)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 text-xs font-medium tracking-widest hover:bg-gray-50 transition-colors uppercase"
              >
                Volver
              </button>
              <button
                onClick={handleEliminar}
                className="flex-1 px-6 py-3 bg-black text-white text-xs font-medium tracking-widest hover:bg-gray-800 transition-colors uppercase"
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
