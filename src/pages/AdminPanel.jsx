import { useState, useEffect } from 'react';
import { useReservas } from '../context/ReservasContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { obtenerNombreCancha, calcularPrecioReserva, obtenerDesglosePrecio } from '../utils/preciosCalculator';

const AdminPanel = () => {
  const { reservas, confirmarReserva, rechazarReserva, obtenerHorasEnRango, cargarReservas } = useReservas();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('todas');
  const [filtroCancha, setFiltroCancha] = useState('todas'); // 'todas', 'principal', 'anexa-1', 'anexa-2'
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

  const reservasFiltradas = reservas
    .filter(reserva => {
      const fechaReserva = parseISO(reserva.fecha);

      if (filtro === 'pendientes') {
        return reserva.estado === 'pendiente';
      } else if (filtro === 'confirmadas') {
        return reserva.estado === 'confirmada';
      } else if (filtro === 'rechazadas') {
        return reserva.estado === 'rechazada';
      } else if (filtro === 'proximas') {
        return fechaReserva >= fechaActual && reserva.estado !== 'rechazada';
      }
      return true;
    })
    .filter(reserva => {
      // Filtro por cancha
      if (filtroCancha === 'todas') return true;
      return (reserva.cancha || 'principal') === filtroCancha;
    })
    .filter(reserva => {
      if (!busqueda) return true;
      const busquedaLower = busqueda.toLowerCase();
      return (
        reserva.nombre?.toLowerCase().includes(busquedaLower) ||
        reserva.telefono?.toLowerCase().includes(busquedaLower) ||
        reserva.email?.toLowerCase().includes(busquedaLower) ||
        reserva.dni?.toLowerCase().includes(busquedaLower)
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

  const formatearFecha = (fechaStr) => {
    const fecha = parseISO(fechaStr);
    return format(fecha, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  };

  const contarPorEstado = (estado) => {
    return reservas.filter(r => r.estado === estado).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-black tracking-tight">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-12">
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h1 className="text-3xl md:text-5xl font-bold text-black tracking-tight">
              PANEL ADMIN
            </h1>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-4 w-full sm:w-auto">
              <button
                onClick={() => navigate('/admin/usuarios')}
                className="px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium tracking-wide hover:bg-gray-50 transition-colors uppercase"
              >
                Gestionar Usuarios
              </button>
              <div className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-widest">
                Administrador
              </div>
            </div>
          </div>
          <p className="text-gray-600 text-sm tracking-wide">
            Gestiona todas las reservas del complejo deportivo
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-gray-50 border-l-2 border-black p-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Total</p>
            <p className="text-3xl font-bold text-black">{reservas.length}</p>
          </div>
          <div className="bg-gray-50 border-l-2 border-gray-400 p-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Pendientes</p>
            <p className="text-3xl font-bold text-gray-700">{contarPorEstado('pendiente')}</p>
          </div>
          <div className="bg-gray-50 border-l-2 border-black p-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Confirmadas</p>
            <p className="text-3xl font-bold text-black">{contarPorEstado('confirmada')}</p>
          </div>
          <div className="bg-gray-50 border-l-2 border-gray-300 p-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Rechazadas</p>
            <p className="text-3xl font-bold text-gray-500">{contarPorEstado('rechazada')}</p>
          </div>
        </div>

        {/* Filtros */}
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
              Todas ({reservas.length})
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
              Pendientes ({contarPorEstado('pendiente')})
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
              Confirmadas ({contarPorEstado('confirmada')})
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
          </div>

          <input
            type="text"
            placeholder="BUSCAR POR NOMBRE, DNI, TELÉFONO O EMAIL"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-0 py-3 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none bg-transparent text-black placeholder-gray-400 text-sm tracking-wide transition-colors"
          />

          {/* Filtro por cancha */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 font-semibold">Filtrar por cancha</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFiltroCancha('todas')}
                className={`px-4 py-2 text-xs font-medium tracking-wide transition-colors ${
                  filtroCancha === 'todas'
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                TODAS
              </button>
              <button
                onClick={() => setFiltroCancha('principal')}
                className={`px-4 py-2 text-xs font-medium tracking-wide transition-colors ${
                  filtroCancha === 'principal'
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                PRINCIPAL
              </button>
              <button
                onClick={() => setFiltroCancha('anexa-1')}
                className={`px-4 py-2 text-xs font-medium tracking-wide transition-colors ${
                  filtroCancha === 'anexa-1'
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                ANEXA 1
              </button>
              <button
                onClick={() => setFiltroCancha('anexa-2')}
                className={`px-4 py-2 text-xs font-medium tracking-wide transition-colors ${
                  filtroCancha === 'anexa-2'
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                ANEXA 2
              </button>
            </div>
          </div>
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
                    reserva.estado === 'rechazada'
                      ? 'border-gray-300 opacity-50'
                      : reserva.estado === 'pendiente'
                      ? 'border-gray-400'
                      : 'border-black'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
                        <h3 className="text-xl md:text-2xl font-bold text-black tracking-tight">
                          {reserva.nombre}
                        </h3>
                        <span
                          className={`px-3 py-1 border text-[10px] font-semibold uppercase tracking-widest ${
                            reserva.estado === 'pendiente'
                              ? 'border-gray-400 text-gray-600'
                              : reserva.estado === 'confirmada'
                              ? 'border-black text-black'
                              : 'border-gray-300 text-gray-500'
                          }`}
                        >
                          {reserva.estado === 'pendiente' ? 'Pendiente' : reserva.estado === 'confirmada' ? 'Confirmada' : 'Rechazada'}
                        </span>
                        {!reserva.userId && (
                          <span className="px-3 py-1 border border-gray-300 text-gray-500 text-[10px] font-semibold uppercase tracking-widest">
                            Sin cuenta
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 text-sm text-gray-600">
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
                        <p>
                          <span className="font-semibold">DNI:</span> {reserva.dni}
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
                        {reserva.notas && (
                          <p className="col-span-3">
                            <span className="font-semibold">Notas:</span> {reserva.notas}
                          </p>
                        )}
                      </div>
                    </div>

                    {reserva.estado === 'pendiente' && (
                      <div className="w-full lg:w-auto lg:ml-6 flex flex-row lg:flex-col gap-2">
                        <button
                          onClick={() => confirmarReserva(reserva.id)}
                          className="flex-1 lg:flex-initial px-4 py-2 bg-black text-white text-xs font-medium tracking-widest hover:bg-gray-800 transition-colors uppercase"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => rechazarReserva(reserva.id)}
                          className="flex-1 lg:flex-initial px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium tracking-widest hover:bg-gray-50 transition-colors uppercase"
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
