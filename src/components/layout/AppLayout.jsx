import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useReservas } from '../../context/ReservasContext';
import BadgeSocio from '../shared/BadgeSocio';
import logo from '../../assets/images/logo.png';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const { user, profile, signOut, isAdmin, esSocio } = useAuth();
  const { reservas } = useReservas();

  // Estado del sidebar desktop con persistencia
  const [sidebarAbierto, setSidebarAbierto] = useState(() => {
    const saved = localStorage.getItem('sidebarAbierto');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Estado del menú móvil
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebarAbierto', JSON.stringify(sidebarAbierto));
  }, [sidebarAbierto]);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setMenuMovilAbierto(false);
  }, [location.pathname]);

  // Bloquear scroll cuando menú móvil está abierto
  useEffect(() => {
    if (menuMovilAbierto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuMovilAbierto]);

  const esAdmin = isAdmin();
  const usuarioEsSocio = esSocio();
  const reservasPendientes = reservas.filter(r => r.estado === 'pendiente').length;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const enRutaAdmin = location.pathname.startsWith('/admin');

  const menuUsuario = [
    {
      path: '/',
      label: 'Inicio',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      publica: true
    },
    {
      path: '/reservar',
      label: 'Reservar',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      publica: true
    },
    {
      path: '/campo',
      label: 'Campo',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      publica: true
    },
    {
      path: '/reservas',
      label: 'Mis Reservas',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      requiereAuth: true
    },
    {
      path: '/mi-membresia',
      label: 'Mi Membresia',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      requiereAuth: true
    }
  ];

  const menuAdmin = [
    {
      path: '/admin',
      label: 'Reservas',
      exactMatch: true,
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      badge: reservasPendientes > 0 ? reservasPendientes : null
    },
    {
      path: '/admin/usuarios',
      label: 'Usuarios',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      path: '/admin/socios',
      label: 'Socios',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    }
  ];

  const menuActual = enRutaAdmin ? menuAdmin : menuUsuario.filter(item => {
    if (item.requiereAuth && !user) return false;
    return true;
  });

  const isItemActive = (item) => {
    if (item.exactMatch) {
      return location.pathname === item.path;
    }
    return isActive(item.path);
  };

  const toggleSidebar = () => setSidebarAbierto(!sidebarAbierto);
  const toggleMenuMovil = () => setMenuMovilAbierto(!menuMovilAbierto);

  // Componente del contenido del sidebar (reutilizado en desktop y móvil)
  const SidebarContent = ({ isMobile = false }) => (
    <>
      {/* Título del menú + Toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          {enRutaAdmin ? 'Panel de Admin' : 'Menu'}
        </h2>
        <button
          onClick={isMobile ? toggleMenuMovil : toggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navegación principal */}
      <nav className="space-y-1">
        {menuActual.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              isItemActive(item)
                ? 'bg-black text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {item.badge && (
              <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold rounded-full ${
                isItemActive(item)
                  ? 'bg-white text-black'
                  : 'bg-black text-white'
              }`}>
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Separador y link a Admin */}
      {esAdmin && !enRutaAdmin && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Administracion
          </h2>
          <Link
            to="/admin"
            className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              location.pathname.startsWith('/admin')
                ? 'bg-black text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium">Panel Admin</span>
            </div>
            {reservasPendientes > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold rounded-full bg-black text-white">
                {reservasPendientes}
              </span>
            )}
          </Link>
        </div>
      )}

      {/* Link para volver al sitio */}
      {enRutaAdmin && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            <span className="text-sm font-medium">Volver al sitio</span>
          </Link>
        </div>
      )}

      {/* Info de usuario en móvil */}
      {isMobile && user && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="px-4 py-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-black">
                {profile?.nombre || user.email}
              </p>
              {usuarioEsSocio && <BadgeSocio />}
            </div>
            {profile?.role === 'admin' && (
              <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">
                Administrador
              </p>
            )}
          </div>
          <button
            onClick={signOut}
            className="w-full mt-2 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Cerrar sesion
          </button>
        </div>
      )}

      {/* Login en móvil */}
      {isMobile && !user && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Iniciar Sesion
          </Link>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left: Hamburger (móvil) + Logo */}
            <div className="flex items-center gap-3">
              {/* Botón hamburguesa - solo móvil */}
              <button
                onClick={toggleMenuMovil}
                className="md:hidden flex items-center justify-center w-10 h-10 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                <img src={logo} alt="Triple Doble" className="h-10 md:h-12 w-auto" />
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase text-gray-600 font-medium">
                    Complejo Deportivo
                  </span>
                  <span className="text-xl md:text-2xl font-bold tracking-tight text-black">
                    TRIPLE DOBLE
                  </span>
                </div>
              </Link>
            </div>

            {/* User Section - solo desktop */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <p className="text-xs font-medium text-black tracking-wide">
                        {profile?.nombre || user.email}
                      </p>
                      {usuarioEsSocio && <BadgeSocio />}
                    </div>
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
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-6 py-2 bg-black text-white text-xs font-medium tracking-wide hover:bg-gray-800 transition-colors uppercase"
                >
                  Iniciar Sesion
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Overlay móvil */}
      {menuMovilAbierto && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={() => setMenuMovilAbierto(false)}
        />
      )}

      {/* Sidebar Móvil (Drawer) */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out ${
          menuMovilAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 h-full overflow-y-auto">
          <SidebarContent isMobile={true} />
        </div>
      </aside>

      <div className="flex">
        {/* Sidebar Desktop */}
        <aside
          className={`bg-white border-r border-gray-200 hidden md:block min-h-[calc(100vh-80px)] sticky top-20 transition-all duration-300 ${
            sidebarAbierto ? 'w-64' : 'w-16'
          }`}
        >
          <div className={`${sidebarAbierto ? 'p-6' : 'p-3'}`}>
            {sidebarAbierto ? (
              <SidebarContent />
            ) : (
              <>
                {/* Versión colapsada */}
                <div className="flex justify-center mb-4">
                  <button
                    onClick={toggleSidebar}
                    title="Mostrar menu"
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <nav className="space-y-1">
                  {menuActual.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={item.label}
                      className={`flex items-center justify-center px-3 py-3 rounded-lg transition-colors relative ${
                        isItemActive(item)
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {item.icon}
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </nav>

                {esAdmin && !enRutaAdmin && (
                  <div className="mt-4 pt-4">
                    <Link
                      to="/admin"
                      title="Panel Admin"
                      className={`flex items-center justify-center px-3 py-3 rounded-lg transition-colors relative ${
                        location.pathname.startsWith('/admin')
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {reservasPendientes > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                          {reservasPendientes}
                        </span>
                      )}
                    </Link>
                  </div>
                )}

                {enRutaAdmin && (
                  <div className="mt-4 pt-4">
                    <Link
                      to="/"
                      title="Volver al sitio"
                      className="flex items-center justify-center px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                      </svg>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
