import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const GestionUsuarios = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState(null);

  console.log('👥 [GestionUsuarios] Component mounted');

  useEffect(() => {
    const admin = isAdmin();
    console.log('👥 [GestionUsuarios] useEffect check:', {
      isAdmin: admin,
      willNavigate: !admin
    });

    if (!admin) {
      console.log('❌ [GestionUsuarios] No es admin, redirigiendo a /');
      navigate('/');
      return;
    }

    console.log('✅ [GestionUsuarios] Es admin, cargando usuarios...');
    cargarUsuarios();
  }, [isAdmin, navigate]);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      mostrarMensaje('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cambiarRol = async (userId, nuevoRol) => {
    console.log('🔄 [GestionUsuarios] Iniciando cambio de rol:', {
      userId,
      nuevoRol,
      timestamp: new Date().toISOString(),
      metodo: 'RPC (cambiar_rol_usuario)'
    });

    try {
      // Usar RPC en lugar de UPDATE para evitar problemas de CORS
      const { data, error } = await supabase.rpc('cambiar_rol_usuario', {
        user_id: userId,
        nuevo_rol: nuevoRol
      });

      console.log('📡 [GestionUsuarios] Respuesta de RPC:', {
        data,
        error,
        hasError: !!error,
        hasData: !!data
      });

      if (error) {
        console.error('❌ [GestionUsuarios] Error de Supabase RPC:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          error: error
        });
        throw error;
      }

      console.log('✅ [GestionUsuarios] Rol cambiado exitosamente:', data);

      mostrarMensaje(
        `Usuario ${nuevoRol === 'admin' ? 'promovido a administrador' : 'cambiado a usuario normal'}`,
        'success'
      );
      await cargarUsuarios();
    } catch (error) {
      console.error('❌ [GestionUsuarios] Error al cambiar rol:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        stack: error.stack,
        fullError: error
      });

      // Mostrar mensaje de error más específico
      const mensajeError = error.message || 'No se pudo cambiar el rol del usuario';
      mostrarMensaje(`Error: ${mensajeError}`, 'error');
    }
  };

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 3000);
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    if (!busqueda) return true;
    const busquedaLower = busqueda.toLowerCase();
    return (
      usuario.email?.toLowerCase().includes(busquedaLower) ||
      usuario.nombre?.toLowerCase().includes(busquedaLower)
    );
  });

  const contarPorRol = (rol) => {
    return usuarios.filter(u => u.role === rol).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-black tracking-tight">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-5xl font-bold text-black tracking-tight">
              GESTIÓN DE USUARIOS
            </h1>
            <button
              onClick={() => navigate('/admin')}
              className="px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium tracking-wide hover:bg-gray-50 transition-colors uppercase"
            >
              ← Volver al Panel
            </button>
          </div>
          <p className="text-gray-600 text-sm tracking-wide">
            Administra los roles de los usuarios del sistema
          </p>
        </div>

        {/* Mensaje de feedback */}
        {mensaje && (
          <div
            className={`mb-6 px-6 py-4 border-l-2 ${
              mensaje.tipo === 'success'
                ? 'bg-green-50 border-green-600 text-green-800'
                : 'bg-red-50 border-red-600 text-red-800'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-50 border-l-2 border-black p-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Total Usuarios</p>
            <p className="text-3xl font-bold text-black">{usuarios.length}</p>
          </div>
          <div className="bg-gray-50 border-l-2 border-black p-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Administradores</p>
            <p className="text-3xl font-bold text-black">{contarPorRol('admin')}</p>
          </div>
          <div className="bg-gray-50 border-l-2 border-gray-400 p-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Usuarios</p>
            <p className="text-3xl font-bold text-gray-700">{contarPorRol('user')}</p>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="BUSCAR POR NOMBRE O EMAIL"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-0 py-3 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none bg-transparent text-black placeholder-gray-400 text-sm tracking-wide transition-colors"
          />
        </div>

        {/* Lista de usuarios */}
        {usuariosFiltrados.length === 0 ? (
          <div className="text-center py-16 border border-gray-200">
            <p className="text-gray-400 text-sm uppercase tracking-widest">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="space-y-3">
            {usuariosFiltrados.map((usuario) => (
              <div
                key={usuario.id}
                className={`bg-white border p-6 transition-all hover:shadow-md ${
                  usuario.role === 'admin' ? 'border-black' : 'border-gray-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-black tracking-tight">
                        {usuario.nombre || 'Sin nombre'}
                      </h3>
                      <span
                        className={`px-3 py-1 border text-[10px] font-semibold uppercase tracking-widest ${
                          usuario.role === 'admin'
                            ? 'border-black text-black bg-black bg-opacity-5'
                            : 'border-gray-400 text-gray-600'
                        }`}
                      >
                        {usuario.role === 'admin' ? 'Administrador' : 'Usuario'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <p>
                        <span className="font-semibold">Email:</span> {usuario.email}
                      </p>
                      <p>
                        <span className="font-semibold">Registrado:</span>{' '}
                        {new Date(usuario.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>

                  <div className="ml-6 flex gap-2">
                    {usuario.role === 'user' ? (
                      <button
                        onClick={() => cambiarRol(usuario.id, 'admin')}
                        className="px-6 py-3 bg-black text-white text-xs font-medium tracking-widest hover:bg-gray-800 transition-colors uppercase"
                      >
                        Hacer Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => cambiarRol(usuario.id, 'user')}
                        className="px-6 py-3 border border-gray-300 text-gray-700 text-xs font-medium tracking-widest hover:bg-gray-50 transition-colors uppercase"
                      >
                        Quitar Admin
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nota informativa */}
        <div className="mt-8 bg-gray-50 border-l-2 border-black p-6">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 font-semibold">
            Nota Importante
          </p>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Los cambios de rol se aplican inmediatamente</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Los usuarios deben cerrar sesión y volver a entrar para ver los cambios</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Los administradores pueden gestionar todas las reservas del sistema</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Ten cuidado al quitar permisos de administrador a otros usuarios</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GestionUsuarios;
