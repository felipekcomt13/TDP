import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const { user, profile, signOut, isAdmin } = useAuth();

  const esAdmin = isAdmin();

  console.log('📍 [Navbar] Rendering:', {
    user: user?.email,
    profile: profile,
    esAdmin: esAdmin,
    currentPath: location.pathname
  });

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo / Branding */}
          <Link to="/" className="flex flex-col leading-tight hover:opacity-70 transition-opacity">
            <span className="text-[10px] tracking-[0.2em] uppercase text-gray-600 font-medium">
              Complejo Deportivo
            </span>
            <span className="text-2xl font-bold tracking-tight text-black">
              TRIPLE DOBLE
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-1">
            <Link
              to="/"
              className={`relative px-6 py-2 text-sm font-medium tracking-wide transition-colors ${
                isActive('/')
                  ? 'text-black'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              INICIO
              {isActive('/') && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></span>
              )}
            </Link>
            <Link
              to="/reservar"
              className={`relative px-6 py-2 text-sm font-medium tracking-wide transition-colors ${
                isActive('/reservar')
                  ? 'text-black'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              RESERVAR
              {isActive('/reservar') && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></span>
              )}
            </Link>

            {user && (
              <Link
                to="/reservas"
                className={`relative px-6 py-2 text-sm font-medium tracking-wide transition-colors ${
                  isActive('/reservas')
                    ? 'text-black'
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                MIS RESERVAS
                {isActive('/reservas') && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></span>
                )}
              </Link>
            )}

            {isAdmin() && (
              <>
                <Link
                  to="/admin"
                  className={`relative px-6 py-2 text-sm font-medium tracking-wide transition-colors ${
                    isActive('/admin')
                      ? 'text-black'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  ADMIN
                  {isActive('/admin') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></span>
                  )}
                </Link>
                <Link
                  to="/admin/usuarios"
                  className={`relative px-6 py-2 text-sm font-medium tracking-wide transition-colors ${
                    isActive('/admin/usuarios')
                      ? 'text-black'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  USUARIOS
                  {isActive('/admin/usuarios') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></span>
                  )}
                </Link>
              </>
            )}

            {/* Auth Section */}
            <div className="ml-4 pl-4 border-l border-gray-200">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs font-medium text-black tracking-wide">
                      {profile?.nombre || user.email}
                    </p>
                    {profile?.role === 'admin' && (
                      <p className="text-[10px] uppercase tracking-widest text-gray-500">
                        Administrador
                      </p>
                    )}
                  </div>
                  <button
                    onClick={signOut}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium tracking-wide hover:bg-gray-50 transition-colors uppercase"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-6 py-2 bg-black text-white text-xs font-medium tracking-wide hover:bg-gray-800 transition-colors uppercase"
                >
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
