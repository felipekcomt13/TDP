import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ListaReservas from '../components/ListaReservas';

const ReservasPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-5xl font-bold text-black tracking-tight">
              MIS RESERVAS
            </h1>

            {isAdmin() && (
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/admin')}
                  className="px-6 py-3 bg-black text-white text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors uppercase"
                >
                  Panel Admin
                </button>
                <button
                  onClick={() => navigate('/admin/usuarios')}
                  className="px-6 py-3 border-2 border-black text-black text-sm font-medium tracking-wide hover:bg-black hover:text-white transition-colors uppercase"
                >
                  Gestionar Usuarios
                </button>
              </div>
            )}
          </div>
          <p className="text-gray-600 text-sm tracking-wide">
            Gestiona y consulta tus reservas del complejo deportivo
          </p>
        </div>

        {/* Banner informativo para admins */}
        {isAdmin() && (
          <div className="mb-8 bg-black text-white p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                Panel de Administrador
              </p>
              <p className="text-sm">
                Tienes permisos de administrador. Puedes gestionar todas las reservas y usuarios del sistema.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 bg-white text-black text-xs font-medium tracking-wide hover:bg-gray-200 transition-colors uppercase"
              >
                Ver Reservas
              </button>
              <button
                onClick={() => navigate('/admin/usuarios')}
                className="px-4 py-2 border border-white text-white text-xs font-medium tracking-wide hover:bg-white hover:text-black transition-colors uppercase"
              >
                Ver Usuarios
              </button>
            </div>
          </div>
        )}

        <ListaReservas />
      </div>
    </div>
  );
};

export default ReservasPage;
