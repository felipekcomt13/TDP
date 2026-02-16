import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ListaReservas from '../components/reservas/ListaReservas';

const ReservasPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  return (
    <div className="bg-white min-h-full">
      <div className="px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-black tracking-tight mb-2">
            MIS RESERVAS
          </h1>
          <p className="text-gray-600 text-sm tracking-wide">
            Gestiona y consulta tus reservas del complejo deportivo
          </p>
        </div>

        {/* Link rápido al panel admin */}
        {isAdmin() && (
          <div className="mb-6 flex items-center gap-3 text-xs text-gray-400">
            <span>Admin:</span>
            <button
              onClick={() => navigate('/admin')}
              className="underline hover:text-black transition-colors"
            >
              Gestionar reservas
            </button>
          </div>
        )}

        <ListaReservas />
      </div>
    </div>
  );
};

export default ReservasPage;
