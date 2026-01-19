import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReservas } from '../context/ReservasContext';

const Navbar = () => {
  const location = useLocation();
  const { user, profile, signOut, isAdmin } = useAuth();
  const { reservas } = useReservas();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const esAdmin = isAdmin();

  // Calcular número de reservas pendientes
  const reservasPendientes = reservas.filter(r => r.estado === 'pendiente').length;

  console.log('📍 [Navbar] Rendering:', {
    user: user?.email,
    profile: profile,
    esAdmin: esAdmin,
    currentPath: location.pathname
  });

  const isActive = (path) => {
    return location.pathname === path;
  };

  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo / Branding */}
          <Link to="/" onClick={cerrarMenu} className="flex flex-col leading-tight hover:opacity-70 transition-opacity">
            <span className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase text-gray-600 font-medium">
              Complejo Deportivo
            </span>
            <span className="text-xl md:text-2xl font-bold tracking-tight text-black">
              TRIPLE DOBLE
            </span>
          </Link>

          {/* Botón hamburguesa (móvil) */}
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="lg:hidden p-2 text-gray-700 hover:text-black focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuAbierto ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Navigation Desktop */}
          <div className="hidden lg:flex items-center space-x-1">
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
                  className={`relative px-6 py-2 text-sm font-medium tracking-wide transition-colors flex items-center gap-2 ${
                    isActive('/admin')
                      ? 'text-black'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  <span>ADMIN</span>
                  <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 bg-black text-white text-xs font-bold">
                    {reservasPendientes}
                  </span>
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

      {/* Menú móvil */}
      {menuAbierto && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="container mx-auto px-4 py-4 space-y-1">
            <Link
              to="/"
              onClick={cerrarMenu}
              className={`block px-4 py-3 text-sm font-medium tracking-wide transition-colors ${
                isActive('/') ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              INICIO
            </Link>
            <Link
              to="/reservar"
              onClick={cerrarMenu}
              className={`block px-4 py-3 text-sm font-medium tracking-wide transition-colors ${
                isActive('/reservar') ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              RESERVAR
            </Link>

            {user && (
              <Link
                to="/reservas"
                onClick={cerrarMenu}
                className={`block px-4 py-3 text-sm font-medium tracking-wide transition-colors ${
                  isActive('/reservas') ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                MIS RESERVAS
              </Link>
            )}

            {isAdmin() && (
              <>
                <Link
                  to="/admin"
                  onClick={cerrarMenu}
                  className={`block px-4 py-3 text-sm font-medium tracking-wide transition-colors ${
                    isActive('/admin') ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>ADMIN</span>
                    <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 bg-black text-white text-xs font-bold">
                      {reservasPendientes}
                    </span>
                  </div>
                </Link>
                <Link
                  to="/admin/usuarios"
                  onClick={cerrarMenu}
                  className={`block px-4 py-3 text-sm font-medium tracking-wide transition-colors ${
                    isActive('/admin/usuarios') ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  USUARIOS
                </Link>
              </>
            )}

            {/* Auth Section Móvil */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              {user ? (
                <>
                  <div className="px-4 py-2 mb-2">
                    <p className="text-sm font-medium text-black">
                      {profile?.nombre || user.email}
                    </p>
                    {profile?.role === 'admin' && (
                      <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">
                        Administrador
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      cerrarMenu();
                    }}
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 text-sm font-medium tracking-wide hover:bg-gray-50 transition-colors uppercase"
                  >
                    Salir
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={cerrarMenu}
                  className="block text-center px-4 py-3 bg-black text-white text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors uppercase"
                >
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
