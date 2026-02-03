import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase/client';
import BadgeSocio from '../../components/shared/BadgeSocio';

const GestionUsuarios = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [modalSocio, setModalSocio] = useState(null);
  const [formSocio, setFormSocio] = useState({
    duracion: '30',
    precio: '',
    metodoPago: 'efectivo',
    notas: ''
  });

  useEffect(() => {
    const admin = isAdmin();
    if (!admin) {
      navigate('/');
      return;
    }
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
    } catch {
      mostrarMensaje('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cambiarRol = async (userId, nuevoRol) => {
    try {
      const { data, error } = await supabase.rpc('cambiar_rol_usuario', {
        user_id: userId,
        nuevo_rol: nuevoRol
      });

      if (error) throw error;

      mostrarMensaje(
        `Usuario ${nuevoRol === 'admin' ? 'promovido a administrador' : 'cambiado a usuario normal'}`,
        'success'
      );
      await cargarUsuarios();
    } catch (error) {
      const mensajeError = error.message || 'No se pudo cambiar el rol del usuario';
      mostrarMensaje(`Error: ${mensajeError}`, 'error');
    }
  };

  const activarSocio = async (userId) => {
    try {
      const { data, error } = await supabase.rpc('activar_membresia', {
        p_user_id: userId,
        p_duracion_dias: parseInt(formSocio.duracion),
        p_precio: formSocio.precio ? parseFloat(formSocio.precio) : null,
        p_metodo_pago: formSocio.metodoPago || null,
        p_notas: formSocio.notas || null
      });

      if (error) throw error;

      if (data.success) {
        mostrarMensaje('Usuario activado como socio exitosamente', 'success');
        setModalSocio(null);
        resetFormSocio();
        await cargarUsuarios();
      } else {
        mostrarMensaje(data.error || 'Error al activar socio', 'error');
      }
    } catch (error) {
      mostrarMensaje('Error al activar socio: ' + error.message, 'error');
    }
  };

  const quitarSocio = async (userId) => {
    if (!confirm('¿Estás seguro de quitar el estado de socio a este usuario?')) return;

    try {
      const { data, error } = await supabase.rpc('desactivar_membresia', {
        p_user_id: userId
      });

      if (error) throw error;

      if (data.success) {
        mostrarMensaje('Socio desactivado exitosamente', 'success');
        await cargarUsuarios();
      } else {
        mostrarMensaje(data.error || 'Error al quitar socio', 'error');
      }
    } catch (error) {
      mostrarMensaje('Error al quitar socio: ' + error.message, 'error');
    }
  };

  const resetFormSocio = () => {
    setFormSocio({
      duracion: '30',
      precio: '',
      metodoPago: 'efectivo',
      notas: ''
    });
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

  const contarSocios = () => {
    return usuarios.filter(u => u.es_socio === true).length;
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
    <div className="bg-white min-h-full">
      <div className="px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-black tracking-tight mb-2">
            GESTION DE USUARIOS
          </h1>
          <p className="text-gray-600 text-sm tracking-wide">
            Administra los roles y membresías de los usuarios
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 border-l-2 border-black p-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Total Usuarios</p>
            <p className="text-3xl font-bold text-black">{usuarios.length}</p>
          </div>
          <div className="bg-gray-50 border-l-2 border-black p-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Administradores</p>
            <p className="text-3xl font-bold text-black">{contarPorRol('admin')}</p>
          </div>
          <div className="bg-gray-50 border-l-2 border-green-600 p-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Socios Activos</p>
            <p className="text-3xl font-bold text-green-600">{contarSocios()}</p>
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
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
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
                        {usuario.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                      {usuario.es_socio && <BadgeSocio />}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                      <p>
                        <span className="font-semibold">Email:</span> {usuario.email}
                      </p>
                      <p>
                        <span className="font-semibold">Registrado:</span>{' '}
                        {new Date(usuario.created_at).toLocaleDateString('es-ES')}
                      </p>
                      {usuario.celular && (
                        <p>
                          <span className="font-semibold">Celular:</span> {usuario.celular}
                        </p>
                      )}
                      {usuario.dni && (
                        <p>
                          <span className="font-semibold">DNI:</span> {usuario.dni}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
                    {/* Botones de Rol */}
                    {usuario.role === 'user' ? (
                      <button
                        onClick={() => cambiarRol(usuario.id, 'admin')}
                        className="px-4 py-2 bg-black text-white text-xs font-medium tracking-widest hover:bg-gray-800 transition-colors uppercase"
                      >
                        Hacer Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => cambiarRol(usuario.id, 'user')}
                        className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium tracking-widest hover:bg-gray-50 transition-colors uppercase"
                      >
                        Quitar Admin
                      </button>
                    )}

                    {/* Botones de Socio */}
                    {usuario.es_socio ? (
                      <button
                        onClick={() => quitarSocio(usuario.id)}
                        className="px-4 py-2 border border-red-300 text-red-700 text-xs font-medium tracking-widest hover:bg-red-50 transition-colors uppercase"
                      >
                        Quitar Socio
                      </button>
                    ) : (
                      <button
                        onClick={() => setModalSocio(usuario)}
                        className="px-4 py-2 bg-green-600 text-white text-xs font-medium tracking-widest hover:bg-green-700 transition-colors uppercase"
                      >
                        Hacer Socio
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
              <span>Los cambios de rol y membresía se aplican inmediatamente</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Los usuarios deben cerrar sesión y volver a entrar para ver los cambios</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Para ver detalle de membresías (fechas, pagos), ir a la sección Socios</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Modal para activar membresía */}
      {modalSocio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full p-8">
            <h3 className="text-2xl font-bold text-black tracking-tight mb-2">
              ACTIVAR MEMBRESIA
            </h3>
            <p className="text-gray-600 mb-6">
              Para: <span className="font-semibold">{modalSocio.nombre || modalSocio.email}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">
                  Duración
                </label>
                <select
                  value={formSocio.duracion}
                  onChange={(e) => setFormSocio({ ...formSocio, duracion: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none text-black text-sm"
                >
                  <option value="30">30 días (1 mes)</option>
                  <option value="90">90 días (3 meses)</option>
                  <option value="180">180 días (6 meses)</option>
                  <option value="365">365 días (1 año)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">
                  Precio Pagado (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formSocio.precio}
                  onChange={(e) => setFormSocio({ ...formSocio, precio: e.target.value })}
                  placeholder="Ej: 50.00"
                  className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none text-black text-sm placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">
                  Método de Pago
                </label>
                <select
                  value={formSocio.metodoPago}
                  onChange={(e) => setFormSocio({ ...formSocio, metodoPago: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none text-black text-sm"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">
                  Notas (opcional)
                </label>
                <textarea
                  value={formSocio.notas}
                  onChange={(e) => setFormSocio({ ...formSocio, notas: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows="2"
                  className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none text-black text-sm placeholder-gray-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setModalSocio(null);
                  resetFormSocio();
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 text-xs font-medium tracking-widest hover:bg-gray-50 transition-colors uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={() => activarSocio(modalSocio.id)}
                className="flex-1 px-6 py-3 bg-green-600 text-white text-xs font-medium tracking-widest hover:bg-green-700 transition-colors uppercase"
              >
                Activar Socio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionUsuarios;
