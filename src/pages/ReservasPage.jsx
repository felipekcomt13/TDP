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

        {/* Banner informativo para admins */}
        {isAdmin() && (
          <div className="mb-8 bg-black text-white p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                Panel de Administrador
              </p>
              <p className="text-sm">
                Tienes permisos de administrador. Accede al Panel Admin desde el menu lateral.
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
