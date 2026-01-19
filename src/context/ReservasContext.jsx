import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const ReservasContext = createContext();

export const useReservas = () => {
  const context = useContext(ReservasContext);
  if (!context) {
    throw new Error('useReservas debe usarse dentro de un ReservasProvider');
  }
  return context;
};

export const ReservasProvider = ({ children }) => {
  const [reservas, setReservas] = useState([]);
  const [configuracion, setConfiguracion] = useState({
    horaInicio: '08:00',
    horaFin: '22:00',
    intervalo: 60, // minutos
    diasSemana: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  });
  const { user, profile } = useAuth();

  // Cargar reservas desde Supabase (todas para calendario, solo del usuario para "Mis Reservas")
  useEffect(() => {
    cargarReservas();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('reservas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, (payload) => {
        console.log('🔔 [ReservasContext] Actualización en tiempo real recibida:', payload);
        cargarReservas();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const cargarReservas = async () => {
    try {
      // Cargar TODAS las reservas para mostrar en el calendario
      // Las políticas RLS de Supabase manejarán los permisos
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .order('fecha', { ascending: true });

      if (error) throw error;

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
        cancha: r.cancha || 'principal', // Default a principal para compatibilidad
        deporte: r.deporte || 'basket', // Default a basket para compatibilidad
        fechaCreacion: r.created_at
      }));

      setReservas(reservasFormateadas);

      // Log de debug para verificar actualizaciones
      const pendientes = reservasFormateadas.filter(r => r.estado === 'pendiente').length;
      console.log(`📊 [ReservasContext] Reservas cargadas: ${reservasFormateadas.length} total, ${pendientes} pendientes`);
    } catch (error) {
      console.error('Error al cargar reservas:', error);
    }
  };

  const agregarReserva = async (nuevaReserva) => {
    try {
      // Convertir de camelCase a snake_case para Supabase
      const reservaParaDB = {
        user_id: user?.id || null, // null para usuarios anónimos
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
        cancha: nuevaReserva.cancha || 'principal', // Default a principal
        deporte: nuevaReserva.deporte || 'basket' // Default a basket
      };

      const { data, error } = await supabase
        .from('reservas')
        .insert([reservaParaDB])
        .select()
        .single();

      if (error) throw error;

      // Recargar reservas
      await cargarReservas();

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
        fechaCreacion: data.created_at
      };
    } catch (error) {
      console.error('Error al agregar reserva:', error);
      throw error;
    }
  };

  const eliminarReserva = async (id) => {
    try {
      const { error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await cargarReservas();
    } catch (error) {
      console.error('Error al eliminar reserva:', error);
      throw error;
    }
  };

  const editarReserva = async (id, datosActualizados) => {
    try {
      const { error } = await supabase
        .from('reservas')
        .update(datosActualizados)
        .eq('id', id);

      if (error) throw error;

      await cargarReservas();
    } catch (error) {
      console.error('Error al editar reserva:', error);
      throw error;
    }
  };

  const confirmarReserva = async (id) => {
    try {
      console.log('🔄 [ReservasContext] Intentando confirmar reserva con RPC:', {
        reservaId: id,
        userId: user?.id,
        userEmail: user?.email,
        profileRole: profile?.role,
        isAdmin: profile?.role === 'admin',
        metodo: 'RPC (confirmar_reserva)'
      });

      // Usar RPC en lugar de UPDATE para evitar error de CORS
      const { data, error } = await supabase
        .rpc('confirmar_reserva', { reserva_id: id });

      if (error) {
        console.error('❌ [ReservasContext] Error de Supabase RPC:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          error: error
        });
        throw error;
      }

      console.log('✅ [ReservasContext] Reserva confirmada exitosamente (RPC):', data);
      await cargarReservas();
    } catch (error) {
      console.error('❌ [ReservasContext] Error al confirmar reserva:', error);
      throw error;
    }
  };

  const rechazarReserva = async (id) => {
    try {
      console.log('🔄 [ReservasContext] Intentando rechazar reserva con RPC:', {
        reservaId: id,
        userId: user?.id,
        userEmail: user?.email,
        profileRole: profile?.role,
        isAdmin: profile?.role === 'admin',
        metodo: 'RPC (rechazar_reserva)'
      });

      // Usar RPC en lugar de UPDATE para evitar error de CORS
      const { data, error } = await supabase
        .rpc('rechazar_reserva', { reserva_id: id });

      if (error) {
        console.error('❌ [ReservasContext] Error de Supabase RPC:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          error: error
        });
        throw error;
      }

      console.log('✅ [ReservasContext] Reserva rechazada exitosamente (RPC):', data);
      await cargarReservas();
    } catch (error) {
      console.error('❌ [ReservasContext] Error al rechazar reserva:', error);
      throw error;
    }
  };

  const obtenerReservasPorFecha = (fecha) => {
    return reservas.filter(reserva => reserva.fecha === fecha);
  };

  const verificarDisponibilidad = (fecha, hora, canchaSeleccionada = null) => {
    return !reservas.some(reserva => {
      // Solo considerar reservas confirmadas o pendientes (no rechazadas)
      if (reserva.estado === 'rechazada') return false;

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

  const verificarDisponibilidadRango = (fecha, horaInicio, horaFin, canchaSeleccionada = null) => {
    const horasDelRango = obtenerHorasEnRango(horaInicio, horaFin);

    // Verificar que todas las horas del rango estén disponibles
    return horasDelRango.every(hora => verificarDisponibilidad(fecha, hora, canchaSeleccionada));
  };

  const obtenerReservaEnSlot = (fecha, hora, cancha = null) => {
    return reservas.find(reserva => {
      // Ignorar reservas rechazadas
      if (reserva.estado === 'rechazada') return false;

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

  // Obtener canchas bloqueadas por reglas de bloqueo recíproco
  const obtenerCanchasBloqueadas = (fecha, hora) => {
    const canchasBloqueadas = new Set();

    reservas.forEach(reserva => {
      // Solo considerar reservas confirmadas o pendientes
      if (reserva.estado === 'rechazada') return;

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
    configuracion,
    setConfiguracion,
    cargarReservas,
    agregarReserva,
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
