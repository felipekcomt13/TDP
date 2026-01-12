import { useState } from 'react';
import CalendarioSemanal from '../components/CalendarioSemanal';
import FormularioReserva from '../components/FormularioReserva';

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
    console.log('Reserva creada exitosamente');
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-black mb-3 tracking-tight">
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
