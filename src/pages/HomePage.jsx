import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BannerLibroReclamaciones from '../components/shared/BannerLibroReclamaciones';
import WizardReserva from '../components/reservas/WizardReserva';
import ReservaMasiva from '../components/reservas/ReservaMasiva';
import ListaReservas from '../components/reservas/ListaReservas';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const [mostrarWizard, setMostrarWizard] = useState(false);
  const [mostrarReservaMasiva, setMostrarReservaMasiva] = useState(false);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative bg-white min-h-full">
      <div className="px-4 md:px-6 lg:px-8 py-8 md:py-12">

        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-black tracking-tight">RESERVAS</h1>
            <p className="text-gray-500 text-sm mt-1">Complejo Deportivo Triple Doble</p>
          </div>
          {isAdmin() && (
            <button
              onClick={() => setMostrarReservaMasiva(true)}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Reserva masiva</span>
              <span className="sm:hidden">Masiva</span>
            </button>
          )}
        </div>

        <div className="max-w-sm mx-auto text-center">
          <button
            onClick={() => setMostrarWizard(true)}
            className="w-full py-5 bg-black text-white font-bold text-lg rounded-2xl shadow-lg hover:bg-gray-800 hover:shadow-xl active:scale-[0.98] transition-all"
          >
            + Nueva Reserva
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Selecciona deporte, cancha y horario en pocos pasos
          </p>
        </div>

        {/* Lista de reservas del usuario */}
        {user && (
          <div className="mt-12 pt-12 border-t border-gray-200">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black tracking-tight">MIS RESERVAS</h2>
              {isAdmin() && (
                <button
                  onClick={() => navigate('/admin')}
                  className="text-xs text-gray-400 underline hover:text-black transition-colors"
                >
                  Gestionar reservas
                </button>
              )}
            </div>
            <ListaReservas />
          </div>
        )}

        {mostrarWizard && (
          <WizardReserva
            onCerrar={() => setMostrarWizard(false)}
            onReservaCreada={() => setMostrarWizard(false)}
          />
        )}

        {mostrarReservaMasiva && (
          <ReservaMasiva onCerrar={() => setMostrarReservaMasiva(false)} />
        )}
      </div>
      <BannerLibroReclamaciones variant="light" />
    </div>
  );
};

export default HomePage;
