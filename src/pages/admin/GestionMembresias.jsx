import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase/client';
import BadgeSocio from '../../components/shared/BadgeSocio';

const GestionMembresias = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [modalActivo, setModalActivo] = useState(null);
  const [formData, setFormData] = useState({
    duracion: '30',
    precio: '',
    metodoPago: 'efectivo',
    notas: ''
  });

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
    cargarDatos();
  }, [isAdmin, navigate]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar todos los usuarios
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('profiles')
        .select('*')
        .order('nombre', { ascending: true });

      if (usuariosError) throw usuariosError;
      setUsuarios(usuariosData);

      // Cargar socios (usuarios con es_socio = true)
      const sociosData = usuariosData.filter(u => u.es_socio === true);

      // Para cada socio, obtener su membresía activa
      const sociosConMembresia = await Promise.all(
        sociosData.map(async (socio) => {
          const { data: membresia } = await supabase
            .from('membresias')
            .select('*')
            .eq('user_id', socio.id)
            .eq('estado', 'activa')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...membresia,
            user_id: socio.id,
            profiles: {
              id: socio.id,
              nombre: socio.nombre,
              email: socio.email
            }
          };
        })
      );

      // Ordenar por fecha_fin
      sociosConMembresia.sort((a, b) => {
        if (!a.fecha_fin) return 1;
        if (!b.fecha_fin) return -1;
        return new Date(a.fecha_fin) - new Date(b.fecha_fin);
      });

      setSocios(sociosConMembresia);
    } catch {
      mostrarMensaje('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const activarMembresia = async (userId) => {
    try {
      const { data, error } = await supabase.rpc('activar_membresia', {
        p_user_id: userId,
        p_duracion_dias: parseInt(formData.duracion),
        p_precio: formData.precio ? parseFloat(formData.precio) : null,
        p_metodo_pago: formData.metodoPago || null,
        p_notas: formData.notas || null
      });

      if (error) throw error;

      if (data.success) {
        mostrarMensaje('Membresía activada exitosamente', 'success');
        setModalActivo(null);
        resetFormData();
        await cargarDatos();
      } else {
        mostrarMensaje(data.error || 'Error al activar membresía', 'error');
      }
    } catch (error) {
      mostrarMensaje('Error al activar membresía: ' + error.message, 'error');
    }
  };

  const desactivarMembresia = async (userId) => {
    if (!confirm('¿Estás seguro de desactivar esta membresía?')) return;

    try {
      const { data, error } = await supabase.rpc('desactivar_membresia', {
        p_user_id: userId
      });

      if (error) throw error;

      if (data.success) {
        mostrarMensaje('Membresía desactivada', 'success');
        await cargarDatos();
      } else {
        mostrarMensaje(data.error || 'Error al desactivar membresía', 'error');
      }
    } catch (error) {
      mostrarMensaje('Error al desactivar membresía: ' + error.message, 'error');
    }
  };

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  const resetFormData = () => {
    setFormData({
      duracion: '30',
      precio: '',
      metodoPago: 'efectivo',
      notas: ''
    });
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    if (!busqueda) return true;
    const busquedaLower = busqueda.toLowerCase();
    return (
      usuario.email?.toLowerCase().includes(busquedaLower) ||
      usuario.nombre?.toLowerCase().includes(busquedaLower)
    );
  });

  const calcularDiasRestantes = (fechaFin) => {
    if (!fechaFin) return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    // Parsear fecha como local agregando T12:00:00 para evitar problemas de zona horaria
    const fin = new Date(fechaFin + 'T12:00:00');
    fin.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24)));
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    // Agregar T12:00:00 para evitar problemas de zona horaria
    const fechaLocal = new Date(fecha + 'T12:00:00');
    return fechaLocal.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-black" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full">
      <div className="px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-black tracking-tight mb-2">
            GESTIÓN DE SOCIOS
          </h1>
          <p className="text-gray-600 text-sm tracking-wide">
            Administra las membresías de los usuarios
          </p>
        </div>

        {/* Mensaje de feedback */}
        {mensaje && (
          <div
            className={`mb-6 px-6 py-4 rounded-xl border ${
              mensaje.tipo === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Socios Activos */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-black tracking-tight">
              SOCIOS ACTIVOS
            </h2>
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
              <span>{socios.length} socios</span>
              {socios.filter(s => calcularDiasRestantes(s.fecha_fin) <= 7).length > 0 && (
                <span className="text-yellow-500">
                  {socios.filter(s => calcularDiasRestantes(s.fecha_fin) <= 7).length} por vencer
                </span>
              )}
            </div>
          </div>

          {socios.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <p className="text-gray-400 text-sm">No hay socios activos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {socios.map((socio) => {
                const diasRestantes = calcularDiasRestantes(socio.fecha_fin);
                const colorDias = diasRestantes <= 7 ? 'text-red-600' : diasRestantes <= 15 ? 'text-yellow-600' : 'text-green-600';

                return (
                  <div
                    key={socio.id}
                    className={`rounded-xl border p-4 md:p-5 transition-all ${
                      diasRestantes <= 7 ? 'border-red-200 bg-red-50/30 shadow-sm' : 'border-gray-100 bg-white shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                      {/* Días restantes visual */}
                      <div className="hidden md:flex flex-col items-center justify-center w-16 flex-shrink-0">
                        <span className={`text-2xl font-bold leading-none ${colorDias}`}>
                          {diasRestantes}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          días
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <h3 className="text-base font-bold text-black tracking-tight">
                            {socio.profiles?.nombre || 'Sin nombre'}
                          </h3>
                          <BadgeSocio />
                          <span className={`md:hidden text-xs font-bold ${colorDias}`}>
                            {diasRestantes} días
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span>{socio.profiles?.email}</span>
                          <span>{formatearFecha(socio.fecha_inicio)} - {formatearFecha(socio.fecha_fin)}</span>
                        </div>
                        {socio.precio_pagado && (
                          <div className="flex items-center gap-x-4 mt-1 text-xs text-gray-400">
                            <span>S/ {socio.precio_pagado} ({socio.metodo_pago || 'N/A'})</span>
                          </div>
                        )}
                      </div>

                      {/* Acción */}
                      <button
                        onClick={() => desactivarMembresia(socio.user_id)}
                        className="flex-shrink-0 px-4 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 active:scale-[0.98] transition-all"
                      >
                        Desactivar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activar nueva membresía */}
        <div>
          <h2 className="text-2xl font-bold text-black tracking-tight mb-6">
            ACTIVAR MEMBRESÍA
          </h2>

          {/* Búsqueda */}
          <div className="mb-6 relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar usuario por nombre o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white text-black placeholder-gray-400 text-sm transition-all"
            />
          </div>

          {/* Lista de usuarios para activar */}
          {busqueda && (
            <div className="space-y-2">
              {usuariosFiltrados.slice(0, 10).map((usuario) => {
                const esSocio = usuario.es_socio === true;

                return (
                  <div
                    key={usuario.id}
                    className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${
                      esSocio ? 'border-gray-100 bg-gray-50' : 'border-gray-100 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-black">
                            {usuario.nombre || 'Sin nombre'}
                          </p>
                          {esSocio && <BadgeSocio />}
                        </div>
                        <p className="text-sm text-gray-600">{usuario.email}</p>
                      </div>

                      {!esSocio && (
                        <button
                          onClick={() => setModalActivo(usuario)}
                          className="px-6 py-2 bg-black text-white text-xs font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all"
                        >
                          Activar
                        </button>
                      )}
                      {esSocio && (
                        <span className="text-sm text-gray-500 italic">Ya es socio</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {usuariosFiltrados.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">
                  No se encontraron usuarios
                </p>
              )}

              {usuariosFiltrados.length > 10 && (
                <p className="text-center text-gray-400 py-2 text-sm">
                  Mostrando 10 de {usuariosFiltrados.length} resultados. Refina tu búsqueda.
                </p>
              )}
            </div>
          )}

          {!busqueda && (
            <p className="text-center text-gray-400 py-8 text-sm">
              Escribe para buscar usuarios
            </p>
          )}
        </div>

        {/* Nota informativa */}
        <div className="mt-8 bg-gray-50 rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600 mb-3">
            Nota Importante
          </p>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Las membresías se activan inmediatamente</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>El usuario verá su badge de socio al iniciar sesión nuevamente</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Las membresías expiradas se desactivan automáticamente</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Modal para activar membresía */}
      {modalActivo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-2xl">
            <h3 className="text-2xl font-bold text-black tracking-tight mb-2">
              ACTIVAR MEMBRESÍA
            </h3>
            <p className="text-gray-600 mb-6">
              Para: <span className="font-semibold">{modalActivo.nombre || modalActivo.email}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Duración
                </label>
                <select
                  value={formData.duracion}
                  onChange={(e) => setFormData({ ...formData, duracion: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black text-sm transition-all"
                >
                  <option value="30">30 días (1 mes)</option>
                  <option value="90">90 días (3 meses)</option>
                  <option value="180">180 días (6 meses)</option>
                  <option value="365">365 días (1 año)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Precio Pagado (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  placeholder="Ej: 50.00"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black text-sm placeholder-gray-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Método de Pago
                </label>
                <select
                  value={formData.metodoPago}
                  onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black text-sm transition-all"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows="2"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black text-sm placeholder-gray-400 resize-none transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setModalActivo(null);
                  resetFormData();
                }}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => activarMembresia(modalActivo.id)}
                className="flex-1 px-6 py-3 bg-black text-white text-xs font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all"
              >
                Activar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionMembresias;
