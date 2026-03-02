import { useState, useEffect } from 'react';
import { useReservas } from '../../context/ReservasContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { obtenerNombreCancha, calcularPrecioReserva, obtenerDesglosePrecio } from '../../utils/preciosCalculator';

const AdminPanel = () => {
  const { reservas, confirmarReserva, rechazarReserva, cargarReservas } = useReservas();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('pendientes');
  const [filtroCancha, setFiltroCancha] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }

    const cargarDatos = async () => {
      setLoading(true);
      await cargarReservas();
      setLoading(false);
    };

    cargarDatos();
  }, [isAdmin, navigate]);

  const fechaActual = new Date();
  fechaActual.setHours(0, 0, 0, 0);

  const contarPorEstado = (estado) => reservas.filter(r => r.estado === estado).length;

  const reservasFiltradas = reservas
    .filter(reserva => {
      const fechaReserva = parseISO(reserva.fecha);
      if (filtro === 'pendientes') return reserva.estado === 'pendiente';
      if (filtro === 'confirmadas') return reserva.estado === 'confirmada';
      if (filtro === 'rechazadas') return reserva.estado === 'rechazada';
      if (filtro === 'proximas') return fechaReserva >= fechaActual && reserva.estado !== 'rechazada';
      return true;
    })
    .filter(reserva => {
      if (filtroCancha === 'todas') return true;
      return (reserva.cancha || 'principal') === filtroCancha;
    })
    .filter(reserva => {
      if (!busqueda) return true;
      const b = busqueda.toLowerCase();
      return (
        reserva.nombre?.toLowerCase().includes(b) ||
        reserva.telefono?.toLowerCase().includes(b) ||
        reserva.email?.toLowerCase().includes(b) ||
        reserva.dni?.toLowerCase().includes(b)
      );
    })
    .sort((a, b) => {
      const fechaA = parseISO(a.fecha);
      const fechaB = parseISO(b.fecha);
      if (fechaA.getTime() !== fechaB.getTime()) return fechaA - fechaB;
      return a.hora.localeCompare(b.hora);
    });

  const formatearFechaCorta = (fechaStr) => {
    const fecha = parseISO(fechaStr);
    return format(fecha, "EEE d MMM", { locale: es });
  };

  const canchas = [
    { valor: 'todas', label: 'Todas' },
    { valor: 'principal', label: 'Principal' },
    { valor: 'anexa-1', label: 'Anexa 1' },
    { valor: 'anexa-2', label: 'Anexa 2' }
  ];

  const tabs = [
    { valor: 'pendientes', label: 'Pendientes', count: contarPorEstado('pendiente') },
    { valor: 'confirmadas', label: 'Confirmadas', count: contarPorEstado('confirmada') },
    { valor: 'proximas', label: 'Próximas', count: null },
    { valor: 'rechazadas', label: 'Rechazadas', count: contarPorEstado('rechazada') },
    { valor: 'todas', label: 'Todas', count: reservas.length }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-black" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 md:px-6 lg:px-8 py-6 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-black tracking-tight mb-2">
            RESERVAS
          </h1>
          <p className="text-gray-600 text-sm tracking-wide">
            Confirma o rechaza las reservas del complejo
          </p>
        </div>

        {/* Tabs de estado */}
        <div className="flex gap-1 overflow-x-auto mb-6 scrollbar-hide">
          <div className="bg-gray-100 rounded-full p-1 flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.valor}
                onClick={() => setFiltro(tab.valor)}
                className={`flex-shrink-0 px-4 py-2 text-xs font-medium rounded-full transition-all ${
                  filtro === tab.valor ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className="ml-1.5 text-[10px]">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar: Búsqueda + Filtro cancha */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, DNI, teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white text-black placeholder-gray-400 text-sm transition-all"
            />
          </div>
          <div className="flex gap-1">
            {canchas.map((c) => (
              <button
                key={c.valor}
                onClick={() => setFiltroCancha(c.valor)}
                className={`px-3 py-2 text-[11px] font-medium rounded-full transition-all ${
                  filtroCancha === c.valor
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de reservas */}
        {reservasFiltradas.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-400 text-sm">
              {reservas.length === 0 ? 'Aún no hay reservas' : 'Sin resultados para estos filtros'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {reservasFiltradas.map((reserva) => {
              const esPendiente = reserva.estado === 'pendiente';
              const esRechazada = reserva.estado === 'rechazada';
              const cancha = reserva.cancha || 'principal';
              const precio = calcularPrecioReserva(cancha, reserva.hora, reserva.horaFin, false);
              const desglose = reserva.horaFin ? obtenerDesglosePrecio(cancha, reserva.hora, reserva.horaFin, false) : null;

              return (
                <div
                  key={reserva.id}
                  className={`rounded-xl border p-4 md:p-5 transition-all ${
                    esRechazada
                      ? 'border-gray-100 opacity-50'
                      : esPendiente
                      ? 'border-yellow-200 bg-yellow-50/30 shadow-sm'
                      : 'border-gray-100 bg-white shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                    {/* Fecha compacta */}
                    <div className="hidden md:flex flex-col items-center justify-center w-16 flex-shrink-0">
                      <span className="text-2xl font-bold text-black leading-none">
                        {format(parseISO(reserva.fecha), 'd')}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-gray-500">
                        {format(parseISO(reserva.fecha), 'MMM', { locale: es })}
                      </span>
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="text-base font-bold text-black tracking-tight">
                          {reserva.nombre}
                        </h3>
                        <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${
                          esPendiente
                            ? 'bg-yellow-100 text-yellow-700'
                            : reserva.estado === 'confirmada'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {reserva.estado}
                        </span>
                        {!reserva.userId && (
                          <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-400">
                            Sin cuenta
                          </span>
                        )}
                      </div>

                      {/* Detalles en una línea */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                        {/* Fecha solo en mobile */}
                        <span className="md:hidden">
                          {formatearFechaCorta(reserva.fecha)}
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

                      {/* Datos de contacto */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1.5 text-xs text-gray-400">
                        {reserva.dni && <span>DNI: {reserva.dni}</span>}
                        {reserva.telefono && <span>Tel: {reserva.telefono}</span>}
                        {reserva.email && <span>{reserva.email}</span>}
                        {reserva.notas && (
                          <span className="text-gray-500 italic">"{reserva.notas}"</span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    {esPendiente && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => confirmarReserva(reserva.id)}
                          className="px-4 py-2 bg-black text-white text-xs font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => rechazarReserva(reserva.id)}
                          className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
