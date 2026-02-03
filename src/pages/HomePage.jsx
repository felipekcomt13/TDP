import { useState } from 'react';
import CalendarioSemanal from '../components/reservas/CalendarioSemanal';
import FormularioReserva from '../components/reservas/FormularioReserva';

const HomePage = () => {
  const [horarioSeleccionado, setHorarioSeleccionado] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

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

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-black mb-2 tracking-tight">
            RESERVAS
          </h1>
          <p className="text-gray-600 text-sm tracking-wide">
            Selecciona un horario disponible para reservar tu cancha
          </p>
        </div>

        <CalendarioSemanal onSeleccionarHorario={handleSeleccionarHorario} />

        {mostrarFormulario && (
          <FormularioReserva
            horarioSeleccionado={horarioSeleccionado}
            onCerrar={handleCerrarFormulario}
            onReservaCreada={handleReservaCreada}
          />
        )}
      </div>
    </div>
  );
};

export default HomePage;
