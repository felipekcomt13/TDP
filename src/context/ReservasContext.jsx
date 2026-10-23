import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase/client';
import { useAuth } from './AuthContext';
import { calcularPrecioReserva } from '../utils/preciosCalculator';

const ReservasContext = createContext();

export const useReservas = () => {
  const context = useContext(ReservasContext);
  if (!context) {
    throw new Error('useReservas debe usarse dentro de un ReservasProvider');
  }
  return context;
};

// Si el error es un choque de horario detectado por la base de datos
// (constraint anti-solapamiento sobre reservas confirmadas), lo convertimos
// en un mensaje legible. Cualquier otro error se relanza tal cual.
const lanzarErrorLegible = (error) => {
  if (error?.code === '23P01') {
    throw new Error('Ese horario ya quedó ocupado por otra reserva confirmada. Actualiza la página e intenta con otro horario.');
  }
  throw error;
};

export const ReservasProvider = ({ children }) => {
  const [reservas, setReservas] = useState([]);
  // Disponibilidad pública: solo fecha/hora/cancha/deporte de reservas CONFIRMADAS,
  // sin datos personales. A diferencia de `reservas` (filtrada por RLS a "las mías"
  // o "todas" si soy admin), esto viene de una función RPC abierta a cualquiera
  // (incluso sin login) porque el calendario y el wizard necesitan saber qué
  // horarios están ocupados sin tener acceso a nombre/DNI/teléfono/email de nadie.
  const [disponibilidad, setDisponibilidad] = useState([]);
  // false hasta que termina la primera carga de `disponibilidad` (con éxito o no),
  // para que la UI no muestre todo como "Libre" mientras todavía no sabe nada.
  const [disponibilidadCargada, setDisponibilidadCargada] = useState(false);
  const [configuracion, setConfiguracion] = useState({
    horaInicio: '06:00',
    horaFin: '25:00',
    intervalo: 30, // minutos
    diasSemana: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  });
  const { user } = useAuth();

  // Índice fecha -> reservas de ese día. verificarDisponibilidad se llama cientos
  // de veces por render (cada slot × cada cancha × varios días), así que en vez
  // de recorrer todas las reservas confirmadas cada vez, solo miramos las del día.
  const disponibilidadPorFecha = useMemo(() => {
    const mapa = new Map();
    disponibilidad.forEach(reserva => {
      if (!mapa.has(reserva.fecha)) mapa.set(reserva.fecha, []);
      mapa.get(reserva.fecha).push(reserva);
    });
    return mapa;
  }, [disponibilidad]);

  // Cargar reservas desde Supabase (las propias, o todas si soy admin/empleado —
  // lo decide la política RLS) y la disponibilidad pública (para todos, con login o sin él).
  useEffect(() => {
    cargarReservas();
    cargarDisponibilidad();

    // Suscribirse a cambios en tiempo real. Nota: Supabase filtra estos eventos
    // por RLS según el rol de la conexión, así que un visitante anónimo no
    // recibirá este evento (no tiene permiso de SELECT sobre `reservas`) y su
    // vista de disponibilidad no se refrescará sola hasta su próxima acción o
    // recarga de página; para usuarios logueados y admins sí funciona en vivo.
    const subscription = supabase
      .channel('reservas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => {
        cargarReservas();
        cargarDisponibilidad();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const cargarReservas = async () => {
    try {
      // Con las políticas RLS actuales esto trae: solo mis reservas si soy
      // usuario normal, o todas si soy admin/empleado.
      // Nota: Supabase limita cada respuesta a 1000 filas, así que paginamos
      // con .range() para traer la tabla completa sin cortar las reservas más recientes
      const data = [];
      const PAGE_SIZE = 1000;
      let pagina = 0;
      while (true) {
        const desde = pagina * PAGE_SIZE;
        const hasta = desde + PAGE_SIZE - 1;
        const { data: lote, error } = await supabase
          .from('reservas')
          .select('*')
          .order('fecha', { ascending: true })
          .range(desde, hasta);

        if (error) throw error;
        data.push(...lote);

        if (lote.length < PAGE_SIZE) break;
        pagina += 1;
      }

      // Convertir de snake_case a camelCase para compatibilidad
      const reservasFormateadas = data.map(r => ({
        id: r.id,
        userId: r.user_id,
        nombre: r.nombre,
        telefono: r.telefono,
        email: r.email,
        dni: r.dni,
        fecha: r.fecha,
        hora: r.hora,
        horaFin: r.hora_fin,
        diaSemana: r.dia_semana,
        estado: r.estado,
        notas: r.notas,
        cancha: r.cancha || 'principal',
        deporte: r.deporte || 'basket',
        montoTotal: r.monto_total,
        tipoPago: r.tipo_pago,
        fechaCreacion: r.created_at
      }));

      setReservas(reservasFormateadas);
    } catch {
      // Error silenciado en producción
    }
  };

  // Disponibilidad pública (sin PII), accesible con o sin sesión.
  const cargarDisponibilidad = async () => {
    try {
      const { data, error } = await supabase.rpc('obtener_disponibilidad');
      if (error) throw error;

      setDisponibilidad((data || []).map(d => ({
        fecha: d.fecha,
        hora: d.hora,
        horaFin: d.hora_fin,
        cancha: d.cancha || 'principal',
        deporte: d.deporte || 'basket'
      })));
    } catch {
      // Error silenciado: se reintenta en la siguiente carga
    } finally {
      setDisponibilidadCargada(true);
    }
  };

  const agregarReserva = async (nuevaReserva) => {
    // Convertir de camelCase a snake_case para Supabase
    const reservaParaDB = {
      user_id: user?.id || null,
      nombre: nuevaReserva.nombre,
      telefono: nuevaReserva.telefono || null,
      email: nuevaReserva.email || null,
      dni: nuevaReserva.dni,
      fecha: nuevaReserva.fecha,
      hora: nuevaReserva.hora,
      hora_fin: nuevaReserva.horaFin || null,
      dia_semana: nuevaReserva.diaSemana,
      estado: nuevaReserva.estado || 'pendiente',
      notas: nuevaReserva.notas || null,
      cancha: nuevaReserva.cancha || 'principal',
      deporte: nuevaReserva.deporte || 'basket',
      // Precio congelado al momento de la reserva: si más adelante cambia la
      // tarifa, esta reserva conserva el monto que se acordó con el cliente.
      monto_total: calcularPrecioReserva(
        nuevaReserva.cancha || 'principal',
        nuevaReserva.hora,
        nuevaReserva.horaFin || null,
        nuevaReserva.deporte || 'basket'
      )
    };

    const { data, error } = await supabase
      .from('reservas')
      .insert([reservaParaDB])
      .select()
      .single();

    if (error) lanzarErrorLegible(error);

    // Recargar reservas y disponibilidad
    await Promise.all([cargarReservas(), cargarDisponibilidad()]);

    // Devolver reserva formateada
    return {
      id: data.id,
      userId: data.user_id,
      nombre: data.nombre,
      telefono: data.telefono,
      email: data.email,
      dni: data.dni,
      fecha: data.fecha,
      hora: data.hora,
      horaFin: data.hora_fin,
      diaSemana: data.dia_semana,
      estado: data.estado,
      notas: data.notas,
      cancha: data.cancha || 'principal',
      deporte: data.deporte || 'basket',
      montoTotal: data.monto_total,
      tipoPago: data.tipo_pago,
      fechaCreacion: data.created_at
    };
  };

  const agregarReservasMasivas = async (reservas) => {
    const registros = reservas.map(r => ({
      user_id: user?.id || null,
      nombre: r.nombre,
      telefono: r.telefono || null,
      email: r.email || null,
      dni: r.dni,
      fecha: r.fecha,
      hora: r.hora,
      hora_fin: r.horaFin || null,
      dia_semana: r.diaSemana,
      estado: 'confirmada',
      notas: r.notas || null,
      cancha: r.cancha || 'principal',
      deporte: r.deporte || 'basket',
      monto_total: calcularPrecioReserva(r.cancha || 'principal', r.hora, r.horaFin || null, r.deporte || 'basket')
    }));

    const { error } = await supabase
      .from('reservas')
      .insert(registros);

    if (error) lanzarErrorLegible(error);

    await Promise.all([cargarReservas(), cargarDisponibilidad()]);
    return registros.length;
  };

  const eliminarReserva = async (id) => {
    const { error } = await supabase
      .rpc('cancelar_reserva', { reserva_id: id });

    if (error) throw error;

    await Promise.all([cargarReservas(), cargarDisponibilidad()]);
  };

  const editarReserva = async (id, datosActualizados) => {
    // Whitelist de campos editables para evitar manipulacion de estado u otros campos sensibles
    const camposPermitidos = ['nombre', 'telefono', 'email', 'dni', 'fecha', 'hora', 'hora_fin', 'dia_semana', 'notas', 'cancha', 'deporte', 'tipo_pago', 'monto_total'];
    const datosFiltrados = Object.fromEntries(
      Object.entries(datosActualizados).filter(([key]) => camposPermitidos.includes(key))
    );

    if (Object.keys(datosFiltrados).length === 0) return;

    const { error } = await supabase
      .from('reservas')
      .update(datosFiltrados)
      .eq('id', id);

    if (error) lanzarErrorLegible(error);

    await Promise.all([cargarReservas(), cargarDisponibilidad()]);
  };

  const confirmarReserva = async (id) => {
    const { error } = await supabase
      .rpc('confirmar_reserva', { reserva_id: id });

    if (error) throw error;

    await Promise.all([cargarReservas(), cargarDisponibilidad()]);
  };

  const rechazarReserva = async (id) => {
    const { error } = await supabase
      .rpc('rechazar_reserva', { reserva_id: id });

    if (error) throw error;

    await Promise.all([cargarReservas(), cargarDisponibilidad()]);
  };

  const obtenerReservasPorFecha = (fecha) => {
    return reservas.filter(reserva => reserva.fecha === fecha);
  };

  // `disponibilidad` no trae el id de la reserva (ver obtener_disponibilidad()
  // en migration-seguridad-reservas.sql: solo expone lo mínimo, sin PII), así
  // que para excluir "mi propia reserva" al editarla comparamos por la
  // combinación fecha+hora+horaFin+cancha de su estado ORIGINAL. Es seguro
  // porque el constraint anti-solapamiento (misma migración) garantiza que
  // no puede existir otra reserva confirmada con ese mismo horario y cancha.
  const coincideConExclusion = (reserva, excluir) => {
    if (!excluir) return false;
    return reserva.fecha === excluir.fecha &&
      reserva.hora === excluir.hora &&
      reserva.horaFin === excluir.horaFin &&
      reserva.cancha === excluir.cancha;
  };

  // Disponibilidad: se basa en `disponibilidad` (ya filtrada a solo confirmadas,
  // vía la función pública obtener_disponibilidad), no en `reservas`, para que
  // funcione igual con o sin sesión iniciada.
  const verificarDisponibilidad = (fecha, hora, canchaSeleccionada = null, excluir = null) => {
    return !(disponibilidadPorFecha.get(fecha) || []).some(reserva => {
      if (coincideConExclusion(reserva, excluir)) return false;

      // Verificar si la reserva está en la fecha/hora solicitada
      let estaEnHorario = false;
      if (!reserva.horaFin) {
        // Reserva de 1 hora
        estaEnHorario = reserva.fecha === fecha && reserva.hora === hora;
      } else {
        // Reserva multi-hora
        const horasReservadas = obtenerHorasEnRango(reserva.hora, reserva.horaFin);
        estaEnHorario = reserva.fecha === fecha && horasReservadas.includes(hora);
      }

      if (!estaEnHorario) return false;

      // Si no se especifica cancha, verificar todas (comportamiento original)
      if (!canchaSeleccionada) return true;

      // REGLAS DE BLOQUEO:
      // 1. Si intento reservar la misma cancha que está reservada → bloqueado
      if (reserva.cancha === canchaSeleccionada) return true;

      // 2. Si la cancha principal está reservada → anexas están bloqueadas
      if (reserva.cancha === 'principal' && (canchaSeleccionada === 'anexa-1' || canchaSeleccionada === 'anexa-2')) {
        return true;
      }

      // 3. Si alguna anexa está reservada → principal está bloqueada
      if ((reserva.cancha === 'anexa-1' || reserva.cancha === 'anexa-2') && canchaSeleccionada === 'principal') {
        return true;
      }

      // 4. Las anexas NO se bloquean entre sí
      return false;
    });
  };

  const obtenerHorasEnRango = (horaInicio, horaFin) => {
    const horarios = generarHorarios();
    const indexInicio = horarios.indexOf(horaInicio);
    const indexFin = horarios.indexOf(horaFin);

    if (indexInicio === -1 || indexFin === -1) return [];

    // La hora de fin NO debe estar incluida en el rango (es cuando termina, no parte del bloque)
    return horarios.slice(indexInicio, indexFin);
  };

  const verificarDisponibilidadRango = (fecha, horaInicio, horaFin, canchaSeleccionada = null, excluir = null) => {
    const horasDelRango = obtenerHorasEnRango(horaInicio, horaFin);

    // Verificar que todas las horas del rango estén disponibles
    return horasDelRango.every(hora => verificarDisponibilidad(fecha, hora, canchaSeleccionada, excluir));
  };

  const obtenerReservaEnSlot = (fecha, hora, cancha = null, incluirPendientes = false) => {
    return reservas.find(reserva => {
      // Filtrar por estado: solo confirmadas, o todas si incluirPendientes es true
      if (incluirPendientes) {
        // Admins ven todas excepto rechazadas
        if (reserva.estado === 'rechazada') return false;
      } else {
        // Usuarios normales solo ven confirmadas
        if (reserva.estado !== 'confirmada') return false;
      }

      // Filtrar por cancha si se especifica
      if (cancha && reserva.cancha !== cancha) return false;

      // Si es reserva de 1 hora
      if (!reserva.horaFin) {
        return reserva.fecha === fecha && reserva.hora === hora;
      }

      // Si es reserva multi-hora
      const horasReservadas = obtenerHorasEnRango(reserva.hora, reserva.horaFin);
      return reserva.fecha === fecha && horasReservadas.includes(hora);
    });
  };

  // Obtener canchas bloqueadas por reglas de bloqueo recíproco (basado en disponibilidad pública)
  const obtenerCanchasBloqueadas = (fecha, hora) => {
    const canchasBloqueadas = new Set();

    (disponibilidadPorFecha.get(fecha) || []).forEach(reserva => {
      // Verificar si la reserva está en esta fecha/hora
      let estaEnHorario = false;
      if (!reserva.horaFin) {
        estaEnHorario = reserva.fecha === fecha && reserva.hora === hora;
      } else {
        const horasReservadas = obtenerHorasEnRango(reserva.hora, reserva.horaFin);
        estaEnHorario = reserva.fecha === fecha && horasReservadas.includes(hora);
      }

      if (estaEnHorario) {
        // Marcar la cancha reservada como bloqueada
        canchasBloqueadas.add(reserva.cancha);

        // Si principal está reservada → bloquear anexas
        if (reserva.cancha === 'principal') {
          canchasBloqueadas.add('anexa-1');
          canchasBloqueadas.add('anexa-2');
        }

        // Si alguna anexa está reservada → bloquear principal
        if (reserva.cancha === 'anexa-1' || reserva.cancha === 'anexa-2') {
          canchasBloqueadas.add('principal');
        }
      }
    });

    return Array.from(canchasBloqueadas);
  };

  const generarHorarios = () => {
    const horarios = [];
    const [horaInicioH, horaInicioM] = configuracion.horaInicio.split(':').map(Number);
    const [horaFinH, horaFinM] = configuracion.horaFin.split(':').map(Number);

    let hora = horaInicioH;
    let minuto = horaInicioM;

    while (hora < horaFinH || (hora === horaFinH && minuto < horaFinM)) {
      const horaStr = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
      horarios.push(horaStr);

      minuto += configuracion.intervalo;
      if (minuto >= 60) {
        hora += Math.floor(minuto / 60);
        minuto = minuto % 60;
      }
    }

    return horarios;
  };

  const value = {
    reservas,
    disponibilidad,
    disponibilidadCargada,
    configuracion,
    setConfiguracion,
    cargarReservas,
    agregarReserva,
    agregarReservasMasivas,
    eliminarReserva,
    editarReserva,
    confirmarReserva,
    rechazarReserva,
    obtenerReservasPorFecha,
    verificarDisponibilidad,
    verificarDisponibilidadRango,
    obtenerHorasEnRango,
    obtenerReservaEnSlot,
    obtenerCanchasBloqueadas,
    generarHorarios
  };

  return (
    <ReservasContext.Provider value={value}>
      {children}
    </ReservasContext.Provider>
  );
};
