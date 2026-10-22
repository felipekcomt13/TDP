import { useState, useEffect } from 'react';
import { useReservas } from '../../context/ReservasContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { obtenerNombreCancha, calcularPrecioReserva, obtenerDesglosePrecio } from '../../utils/preciosCalculator';

const AdminPanel = () => {
  const { reservas, confirmarReserva, rechazarReserva, eliminarReserva, editarReserva, cargarReservas, generarHorarios, verificarDisponibilidad } = useReservas();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('pendientes');
  const [filtroCancha, setFiltroCancha] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [reservaAEliminar, setReservaAEliminar] = useState(null);
  const [reservaAEditar, setReservaAEditar] = useState(null);
  const [formEdicion, setFormEdicion] = useState(null);
  const [errorEdicion, setErrorEdicion] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
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

  const canchasEdicion = canchas.filter(c => c.valor !== 'todas');
  const horariosEdicion = generarHorarios();

  const abrirEdicion = (reserva) => {
    setErrorEdicion('');
    setReservaAEditar(reserva);
    setFormEdicion({
      nombre: reserva.nombre || '',
      dni: reserva.dni || '',
      telefono: reserva.telefono || '',
      email: reserva.email || '',
      fecha: reserva.fecha,
      cancha: reserva.cancha || 'principal',
      deporte: reserva.deporte || 'basket',
      hora: reserva.hora,
      horaFin: reserva.horaFin || '',
      notas: reserva.notas || ''
    });
  };

  const cerrarEdicion = () => {
    setReservaAEditar(null);
    setFormEdicion(null);
    setErrorEdicion('');
  };

  // Al editar, la propia reserva (si está confirmada) aparece como "ocupando"
  // su horario actual en la disponibilidad pública — hay que excluirla para
  // no bloquearse a sí misma en los selects de abajo.
  const excluirDeDisponibilidad = reservaAEditar
    ? { fecha: reservaAEditar.fecha, hora: reservaAEditar.hora, horaFin: reservaAEditar.horaFin, cancha: reservaAEditar.cancha }
    : null;

  // Horas de inicio disponibles para la fecha/cancha elegidas en el formulario.
  // Siempre se incluye la hora ya seleccionada, aunque ya no esté disponible,
  // para que el <select> nunca quede en un valor que no aparece en sus opciones.
  const horasInicioEdicion = formEdicion
    ? horariosEdicion.filter(h =>
        h === formEdicion.hora || verificarDisponibilidad(formEdicion.fecha, h, formEdicion.cancha, excluirDeDisponibilidad)
      )
    : [];

  // Horas de fin válidas: consecutivas y disponibles desde la hora de inicio
  // (misma regla que el wizard de reserva). También conserva el valor actual
  // si ya no es una opción contigua válida, por la misma razón de arriba.
  const horasFinEdicion = (() => {
    if (!formEdicion) return [];
    const idxInicio = horariosEdicion.indexOf(formEdicion.hora);
    if (idxInicio === -1) return formEdicion.horaFin ? [formEdicion.horaFin] : [];

    const opciones = [];
    for (let i = idxInicio + 1; i < horariosEdicion.length; i++) {
      const slot = horariosEdicion[i];
      if (!verificarDisponibilidad(formEdicion.fecha, slot, formEdicion.cancha, excluirDeDisponibilidad)) break;
      opciones.push(slot);
    }
    if (formEdicion.horaFin && !opciones.includes(formEdicion.horaFin)) {
      opciones.push(formEdicion.horaFin);
    }
    return opciones;
  })();

  const handleGuardarEdicion = async () => {
    if (!formEdicion.nombre.trim()) { setErrorEdicion('El nombre es obligatorio'); return; }
    if (!formEdicion.dni.trim() || formEdicion.dni.trim().length !== 8 || !/^\d+$/.test(formEdicion.dni.trim())) {
      setErrorEdicion('El DNI debe tener 8 dígitos numéricos'); return;
    }
    if (formEdicion.horaFin && formEdicion.horaFin <= formEdicion.hora) {
      setErrorEdicion('La hora de fin debe ser posterior a la hora de inicio'); return;
    }

    setErrorEdicion('');
    setGuardandoEdicion(true);
    try {
      const diaSemana = new Date(formEdicion.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' });
      await editarReserva(reservaAEditar.id, {
        nombre: formEdicion.nombre.trim(),
        dni: formEdicion.dni.trim(),
        telefono: formEdicion.telefono.trim() || null,
        email: formEdicion.email.trim() || null,
        fecha: formEdicion.fecha,
        hora: formEdicion.hora,
        hora_fin: formEdicion.horaFin || null,
        dia_semana: diaSemana,
        cancha: formEdicion.cancha,
        deporte: formEdicion.deporte,
        notas: formEdicion.notas.trim() || null,
        // Recalculado porque el admin puede estar cambiando el horario/duración;
        // monto_total normalmente queda congelado al crear la reserva, pero si
        // cambia lo que efectivamente se reservó, el monto debe reflejarlo.
        monto_total: calcularPrecioReserva(formEdicion.cancha, formEdicion.hora, formEdicion.horaFin || null)
      });
      cerrarEdicion();
    } catch (error) {
      // La causa más probable es el choque de horario detectado por la base
      // de datos (ver migration-seguridad-reservas.sql)
      setErrorEdicion(error.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

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
              // El monto se congela al crear la reserva (montoTotal). Si es una
              // reserva anterior a esa migración, se calcula al vuelo como antes.
              const precio = reserva.montoTotal ?? calcularPrecioReserva(cancha, reserva.hora, reserva.horaFin, reserva.deporte);
              const desglose = reserva.horaFin ? obtenerDesglosePrecio(cancha, reserva.hora, reserva.horaFin, reserva.deporte) : null;

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
                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                      {esPendiente && (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                await confirmarReserva(reserva.id);
                              } catch (error) {
                                // La causa más probable aquí es el choque de horario
                                // detectado por la base de datos (ver migration-seguridad-reservas.sql)
                                alert(error.message);
                              }
                            }}
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
                        </>
                      )}

                      {reserva.estado === 'confirmada' && (
                        <select
                          value={reserva.tipoPago || ''}
                          onChange={(e) => editarReserva(reserva.id, { tipo_pago: e.target.value || null })}
                          className="px-2.5 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10"
                          title="Medio de pago (para la caja)"
                        >
                          {/* Opción vacía oculta: evita que el select muestre "Efectivo"
                              seleccionado por defecto cuando en realidad no se eligió nada */}
                          <option value="" disabled hidden></option>
                          <option value="efectivo">Efectivo</option>
                          <option value="yape">Yape</option>
                          <option value="plin">Plin</option>
                          <option value="transferencia">Transferencia</option>
                        </select>
                      )}

                      <button
                        onClick={() => abrirEdicion(reserva)}
                        className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
                      >
                        Editar
                      </button>

                      {reserva.estado === 'confirmada' && (
                        <button
                          onClick={() => setReservaAEliminar(reserva)}
                          className="px-4 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 active:scale-[0.98] transition-all"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmacion para eliminar reserva */}
      {reservaAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-black mb-4 uppercase tracking-wide">
              Eliminar reserva
            </h3>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><span className="font-medium text-black">{reservaAEliminar.nombre}</span></p>
              <p>{format(parseISO(reservaAEliminar.fecha), "EEEE d 'de' MMMM", { locale: es })} - {reservaAEliminar.hora}{reservaAEliminar.horaFin ? ` a ${reservaAEliminar.horaFin}` : ''}</p>
              <p>{obtenerNombreCancha(reservaAEliminar.cancha || 'principal')}</p>
            </div>
            <p className="text-xs text-red-600 mb-6">Esta accion no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setReservaAEliminar(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Volver
              </button>
              <button
                onClick={async () => {
                  await eliminarReserva(reservaAEliminar.id);
                  setReservaAEliminar(null);
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 active:scale-[0.98] transition-all"
              >
                Eliminar reserva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edicion de reserva */}
      {reservaAEditar && formEdicion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-black mb-4 uppercase tracking-wide">
              Editar reserva
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formEdicion.nombre}
                  onChange={(e) => setFormEdicion(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">DNI</label>
                  <input
                    type="text"
                    value={formEdicion.dni}
                    onChange={(e) => setFormEdicion(p => ({ ...p, dni: e.target.value }))}
                    maxLength={8}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formEdicion.telefono}
                    onChange={(e) => setFormEdicion(p => ({ ...p, telefono: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={formEdicion.email}
                  onChange={(e) => setFormEdicion(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formEdicion.fecha}
                    onChange={(e) => setFormEdicion(p => ({ ...p, fecha: e.target.value, horaFin: '' }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cancha</label>
                  <select
                    value={formEdicion.cancha}
                    onChange={(e) => setFormEdicion(p => ({ ...p, cancha: e.target.value, horaFin: '' }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    {canchasEdicion.map(c => (
                      <option key={c.valor} value={c.valor}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Deporte</label>
                  <select
                    value={formEdicion.deporte}
                    onChange={(e) => setFormEdicion(p => ({ ...p, deporte: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    <option value="basket">Básquet</option>
                    <option value="voley">Vóley</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hora inicio</label>
                  <select
                    value={formEdicion.hora}
                    onChange={(e) => setFormEdicion(p => ({ ...p, hora: e.target.value, horaFin: '' }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    {horasInicioEdicion.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hora fin</label>
                  <select
                    value={formEdicion.horaFin}
                    onChange={(e) => setFormEdicion(p => ({ ...p, horaFin: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    <option value="">+1h (defecto)</option>
                    {horasFinEdicion.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
                <textarea
                  value={formEdicion.notas}
                  onChange={(e) => setFormEdicion(p => ({ ...p, notas: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
                />
              </div>

              <p className="text-xs text-gray-500">
                Nuevo precio: <span className="font-semibold text-black">S/ {calcularPrecioReserva(formEdicion.cancha, formEdicion.hora, formEdicion.horaFin || null)}</span>
              </p>

              {errorEdicion && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorEdicion}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={cerrarEdicion}
                disabled={guardandoEdicion}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarEdicion}
                disabled={guardandoEdicion}
                className="flex-1 px-4 py-2.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
