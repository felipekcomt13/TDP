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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => {
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
        fechaCreacion: r.created_at
      }));

      setReservas(reservasFormateadas);
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
        notas: nuevaReserva.notas || null
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

  const verificarDisponibilidad = (fecha, hora) => {
    return !reservas.some(reserva => {
      // Solo considerar reservas confirmadas o pendientes (no rechazadas)
      if (reserva.estado === 'rechazada') return false;

      // Verificar si es una reserva de 1 hora
      if (!reserva.horaFin) {
        return reserva.fecha === fecha && reserva.hora === hora;
      }

      // Verificar si es una reserva multi-hora
      const horasReservadas = obtenerHorasEnRango(reserva.hora, reserva.horaFin);
      return reserva.fecha === fecha && horasReservadas.includes(hora);
    });
  };

  const obtenerHorasEnRango = (horaInicio, horaFin) => {
    const horarios = generarHorarios();
    const indexInicio = horarios.indexOf(horaInicio);
    const indexFin = horarios.indexOf(horaFin);

    if (indexInicio === -1 || indexFin === -1) return [];

    return horarios.slice(indexInicio, indexFin + 1);
  };

  const verificarDisponibilidadRango = (fecha, horaInicio, horaFin) => {
    const horasDelRango = obtenerHorasEnRango(horaInicio, horaFin);

    // Verificar que todas las horas del rango estén disponibles
    return horasDelRango.every(hora => verificarDisponibilidad(fecha, hora));
  };

  const obtenerReservaEnSlot = (fecha, hora) => {
    return reservas.find(reserva => {
      // Ignorar reservas rechazadas
      if (reserva.estado === 'rechazada') return false;

      // Si es reserva de 1 hora
      if (!reserva.horaFin) {
        return reserva.fecha === fecha && reserva.hora === hora;
      }

      // Si es reserva multi-hora
      const horasReservadas = obtenerHorasEnRango(reserva.hora, reserva.horaFin);
      return reserva.fecha === fecha && horasReservadas.includes(hora);
    });
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
    generarHorarios
  };

  return (
    <ReservasContext.Provider value={value}>
      {children}
    </ReservasContext.Provider>
  );
};
