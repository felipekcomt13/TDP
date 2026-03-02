import { useState } from 'react';
import CalendarioSemanal from '../components/reservas/CalendarioSemanal';
import FormularioReserva from '../components/reservas/FormularioReserva';
import ReservaMasiva from '../components/reservas/ReservaMasiva';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const [horarioSeleccionado, setHorarioSeleccionado] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarReservaMasiva, setMostrarReservaMasiva] = useState(false);
  const { isAdmin } = useAuth();

  const handleSeleccionarHorario = (horario) => {
    setHorarioSeleccionado(horario);
    setMostrarFormulario(true);
  };

  const handleCerrarFormulario = () => {
    setMostrarFormulario(false);
    setHorarioSeleccionado(null);
  };

  const handleReservaCreada = () => {
    // Callback para cuando se crea una reserva exitosamente
  };

  // Fecha de apertura de reservas
  const FECHA_APERTURA = new Date(2026, 2, 4); // 4 de marzo de 2026 (miércoles de apertura)
  const reservasBloqueadas = new Date() < FECHA_APERTURA;

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8 md:mb-12">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-black tracking-tight">
              RESERVAS
            </h1>
            {isAdmin() && (
              <button
                onClick={() => setMostrarReservaMasiva(true)}
                className="px-4 py-2.5 bg-black text-white text-xs font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Reserva masiva</span>
                <span className="sm:hidden">Masiva</span>
              </button>
            )}
          </div>
          {reservasBloqueadas ? (
            <div className="mt-4 bg-gray-900 text-white px-6 py-4 text-center rounded-xl">
              <p className="text-sm font-bold">
                Las reservas abren el 4 de marzo
              </p>
            </div>
          ) : (
            <p className="text-gray-600 text-sm tracking-wide mt-2">
              Selecciona un horario disponible para reservar tu cancha
            </p>
          )}
        </div>

        <CalendarioSemanal onSeleccionarHorario={handleSeleccionarHorario} />

        {mostrarFormulario && (
          <FormularioReserva
            horarioSeleccionado={horarioSeleccionado}
            onCerrar={handleCerrarFormulario}
            onReservaCreada={handleReservaCreada}
          />
        )}

        {mostrarReservaMasiva && (
          <ReservaMasiva onCerrar={() => setMostrarReservaMasiva(false)} />
        )}
      </div>
    </div>
  );
};

export default HomePage;
