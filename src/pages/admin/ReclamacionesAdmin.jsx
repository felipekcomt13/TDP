import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase/client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADOS = ['pendiente', 'en_proceso', 'respondido', 'cerrado'];

const ESTADO_STYLES = {
  pendiente:   'bg-yellow-100 text-yellow-700',
  en_proceso:  'bg-blue-100 text-blue-700',
  respondido:  'bg-green-100 text-green-700',
  cerrado:     'bg-gray-100 text-gray-500',
};

const ReclamacionesAdmin = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [reclamaciones, setReclamaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [expandido, setExpandido] = useState(null);
  const [modalRespuesta, setModalRespuesta] = useState(null);
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
    cargar();
  }, [isAdmin, navigate]);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('libro_reclamaciones')
      .select('*')
      .order('fecha_registro', { ascending: false });

    if (!error) setReclamaciones(data || []);
    setLoading(false);
  };

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 3000);
  };

  const abrirModalRespuesta = (rec) => {
    setModalRespuesta(rec);
    setRespuestaTexto(rec.respuesta_proveedor || '');
    setNuevoEstado(rec.estado);
  };

  const guardarRespuesta = async () => {
    if (!modalRespuesta) return;
    setGuardando(true);

    const updates = {
      estado: nuevoEstado,
      respuesta_proveedor: respuestaTexto || null,
      fecha_respuesta: respuestaTexto ? new Date().toISOString() : modalRespuesta.fecha_respuesta,
    };

    const { error } = await supabase
      .from('libro_reclamaciones')
      .update(updates)
      .eq('id', modalRespuesta.id);

    setGuardando(false);

    if (error) {
      mostrarMensaje('Error al guardar', 'error');
    } else {
      mostrarMensaje('Guardado correctamente');
      setModalRespuesta(null);
      cargar();
    }
  };

  const filtradas = reclamaciones.filter((r) => {
    if (filtroEstado !== 'todos' && r.estado !== filtroEstado) return false;
    if (filtroTipo !== 'todos' && r.tipo_reclamacion !== filtroTipo) return false;
    if (busqueda) {
      const b = busqueda.toLowerCase();
      if (
        !r.consumidor_nombre?.toLowerCase().includes(b) &&
        !r.consumidor_dni?.toLowerCase().includes(b) &&
        !r.correlativo?.toLowerCase().includes(b)
      ) return false;
    }
    return true;
  });

  const contarEstado = (estado) => reclamaciones.filter((r) => r.estado === estado).length;

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
      <div className="px-4 md:px-6 lg:px-8 py-6 md:py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-black tracking-tight mb-2">
            RECLAMACIONES
          </h1>
          <p className="text-gray-600 text-sm tracking-wide">
            Libro de Reclamaciones — INDECOPI Ley 29571
          </p>
        </div>

        {/* Contadores rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {ESTADOS.map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(filtroEstado === estado ? 'todos' : estado)}
              className={`p-3 rounded-xl border text-left transition-all ${
                filtroEstado === estado
                  ? 'border-black bg-black text-white'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
            >
              <p className={`text-2xl font-bold ${filtroEstado === estado ? 'text-white' : 'text-black'}`}>
                {contarEstado(estado)}
              </p>
              <p className={`text-[11px] capitalize mt-0.5 ${filtroEstado === estado ? 'text-gray-300' : 'text-gray-500'}`}>
                {estado.replace('_', ' ')}
              </p>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, DNI, correlativo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white text-black placeholder-gray-400 text-sm transition-all"
            />
          </div>
          <div className="flex gap-1">
            {['todos', 'reclamo', 'queja'].map((tipo) => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`px-3 py-2 text-[11px] font-medium rounded-full transition-all capitalize ${
                  filtroTipo === tipo
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tipo === 'todos' ? 'Todos' : tipo}
              </button>
            ))}
          </div>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            mensaje.tipo === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Lista */}
        {filtradas.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 text-sm">
              {reclamaciones.length === 0 ? 'Sin reclamaciones registradas' : 'Sin resultados para estos filtros'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtradas.map((rec) => (
              <div key={rec.id} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {/* Fila principal */}
                <div
                  className="flex flex-col md:flex-row md:items-center gap-3 p-4 md:p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandido(expandido === rec.id ? null : rec.id)}
                >
                  {/* Fecha */}
                  <div className="hidden md:flex flex-col items-center justify-center w-14 flex-shrink-0">
                    <span className="text-2xl font-bold text-black leading-none">
                      {format(parseISO(rec.fecha_registro), 'd')}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500">
                      {format(parseISO(rec.fecha_registro), 'MMM', { locale: es })}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400 font-mono">{rec.correlativo}</span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full capitalize ${ESTADO_STYLES[rec.estado]}`}>
                        {rec.estado.replace('_', ' ')}
                      </span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${
                        rec.tipo_reclamacion === 'reclamo' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {rec.tipo_reclamacion}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-black tracking-tight">
                      {rec.consumidor_nombre}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-400">
                      <span>DNI: {rec.consumidor_dni}</span>
                      <span>{rec.consumidor_telefono}</span>
                      <span className="md:hidden">
                        {format(parseISO(rec.fecha_registro), "d MMM yyyy", { locale: es })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{rec.detalle}</p>
                  </div>

                  {/* Acción + chevron */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); abrirModalRespuesta(rec); }}
                      className="px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 active:scale-[0.98] transition-all"
                    >
                      Responder
                    </button>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${expandido === rec.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Detalle expandido */}
                {expandido === rec.id && (
                  <div className="border-t border-gray-100 px-4 md:px-5 py-4 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    {/* Sección A: Consumidor */}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Datos del consumidor</p>
                      <div className="space-y-1 text-gray-700">
                        <p><span className="text-gray-400">Nombre:</span> {rec.consumidor_nombre}</p>
                        <p><span className="text-gray-400">DNI:</span> {rec.consumidor_dni}</p>
                        <p><span className="text-gray-400">Teléfono:</span> {rec.consumidor_telefono}</p>
                        <p><span className="text-gray-400">Email:</span> {rec.consumidor_email}</p>
                        {rec.es_menor_edad && (
                          <>
                            <p className="text-orange-600 text-xs font-medium mt-1">Menor de edad — representante:</p>
                            <p><span className="text-gray-400">Nombre:</span> {rec.representante_nombre}</p>
                            <p><span className="text-gray-400">DNI:</span> {rec.representante_dni}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Sección B + C */}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Bien / Servicio</p>
                      <div className="space-y-1 text-gray-700 mb-4">
                        <p><span className="text-gray-400">Tipo:</span> {rec.tipo_bien_servicio}</p>
                        <p><span className="text-gray-400">Descripción:</span> {rec.descripcion_bien_servicio}</p>
                        {rec.monto && <p><span className="text-gray-400">Monto:</span> S/ {rec.monto}</p>}
                      </div>

                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Detalle de la reclamación</p>
                      <div className="space-y-1 text-gray-700">
                        <p><span className="text-gray-400">Tipo:</span> {rec.tipo_reclamacion}</p>
                        <p><span className="text-gray-400">Detalle:</span> {rec.detalle}</p>
                        <p><span className="text-gray-400">Pedido:</span> {rec.pedido}</p>
                      </div>
                    </div>

                    {/* Respuesta del proveedor */}
                    {rec.respuesta_proveedor && (
                      <div className="md:col-span-2 border-t border-gray-200 pt-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Respuesta del proveedor</p>
                        <p className="text-gray-700">{rec.respuesta_proveedor}</p>
                        {rec.fecha_respuesta && (
                          <p className="text-xs text-gray-400 mt-1">
                            {format(parseISO(rec.fecha_respuesta), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal respuesta */}
      {modalRespuesta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold text-black mb-1 uppercase tracking-wide">
              Responder reclamación
            </h3>
            <p className="text-xs text-gray-400 mb-5">{modalRespuesta.correlativo} — {modalRespuesta.consumidor_nombre}</p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Estado
              </label>
              <div className="flex flex-wrap gap-2">
                {ESTADOS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setNuevoEstado(e)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-all ${
                      nuevoEstado === e
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {e.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Respuesta al consumidor
              </label>
              <textarea
                rows={4}
                value={respuestaTexto}
                onChange={(e) => setRespuestaTexto(e.target.value)}
                placeholder="Escribe la respuesta para el consumidor..."
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:bg-white text-black placeholder-gray-400 text-sm resize-none transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalRespuesta(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={guardarRespuesta}
                disabled={guardando}
                className="flex-1 px-4 py-2.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReclamacionesAdmin;
