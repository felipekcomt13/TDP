import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCanchas } from '../../context/CanchasContext';

const ESTADOS = {
  disponible: { label: 'Disponible', color: 'bg-green-100 text-green-700' },
  mantenimiento: { label: 'Mantenimiento', color: 'bg-amber-100 text-amber-700' },
  no_disponible: { label: 'No disponible', color: 'bg-red-100 text-red-700' }
};

const DEPORTES_OPTIONS = [
  { id: 'basket', label: 'Básquet 🏀' },
  { id: 'voley', label: 'Vóley 🏐' }
];

const slugify = (str) =>
  str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const FormCancha = ({ canchaEditar, onGuardar, onCancelar }) => {
  const esNueva = !canchaEditar;
  const [form, setForm] = useState({
    nombre: canchaEditar?.nombre || '',
    foto_url: canchaEditar?.foto_url || '',
    costo_regular: canchaEditar?.costo_regular ?? 50,
    costo_socio: canchaEditar?.costo_socio ?? '',
    estado: canchaEditar?.estado || 'disponible',
    deportes: canchaEditar?.deportes || ['basket', 'voley']
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleDeporte = (dep) => {
    setForm(prev => ({
      ...prev,
      deportes: prev.deportes.includes(dep)
        ? prev.deportes.filter(d => d !== dep)
        : [...prev.deportes, dep]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.costo_regular || form.costo_regular <= 0) { setError('El costo regular debe ser mayor a 0'); return; }
    if (form.deportes.length === 0) { setError('Selecciona al menos un deporte'); return; }

    setLoading(true);
    try {
      const datos = {
        nombre: form.nombre.trim(),
        foto_url: form.foto_url.trim() || null,
        costo_regular: parseInt(form.costo_regular),
        costo_socio: form.costo_socio ? parseInt(form.costo_socio) : null,
        estado: form.estado,
        deportes: form.deportes
      };

      if (esNueva) {
        datos.id = slugify(form.nombre.trim());
      }

      await onGuardar(datos, esNueva);
    } catch (err) {
      setError(err.message || 'Error al guardar la cancha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold">{esNueva ? 'Nueva Cancha' : 'Editar Cancha'}</h3>
          <button onClick={onCancelar} className="text-gray-400 hover:text-black text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {esNueva && form.nombre && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500">
                ID que se generará: <span className="font-mono font-semibold text-black">{slugify(form.nombre)}</span>
              </p>
            </div>
          )}

          {!esNueva && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500">
                ID: <span className="font-mono font-semibold text-black">{canchaEditar.id}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 text-sm"
              placeholder="Cancha Principal"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">URL de foto</label>
            <input
              type="url"
              value={form.foto_url}
              onChange={e => setForm(p => ({ ...p, foto_url: e.target.value }))}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 text-sm"
              placeholder="https://..."
            />
            {form.foto_url && (
              <img src={form.foto_url} alt="Preview" className="mt-2 h-24 w-full object-cover rounded-lg" onError={e => e.target.style.display = 'none'} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Costo regular/hora (S/) *</label>
              <input
                type="number"
                value={form.costo_regular}
                onChange={e => setForm(p => ({ ...p, costo_regular: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 text-sm"
                min="1"
                placeholder="50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Costo socio/hora (S/)</label>
              <input
                type="number"
                value={form.costo_socio}
                onChange={e => setForm(p => ({ ...p, costo_socio: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 text-sm"
                min="1"
                placeholder="40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Estado</label>
            <div className="flex gap-2">
              {Object.entries(ESTADOS).map(([val, info]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, estado: val }))}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    form.estado === val
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {info.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Deportes permitidos</label>
            <div className="flex gap-2">
              {DEPORTES_OPTIONS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDeporte(d.id)}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    form.deportes.includes(d.id)
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancelar}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all disabled:bg-gray-400"
            >
              {loading ? 'Guardando...' : 'Guardar cancha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GestionCanchas = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { canchas, loading, agregarCancha, editarCancha } = useCanchas();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [canchaEditar, setCanchaEditar] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!isAdmin()) navigate('/');
  }, [isAdmin, navigate]);

  const handleGuardar = async (datos, esNueva) => {
    if (esNueva) {
      await agregarCancha(datos);
    } else {
      const { id, ...resto } = datos;
      await editarCancha(canchaEditar.id, resto);
    }
    setMostrarForm(false);
    setCanchaEditar(null);
    setFeedback(esNueva ? 'Cancha agregada correctamente' : 'Cancha actualizada correctamente');
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleCambiarEstado = async (cancha, nuevoEstado) => {
    await editarCancha(cancha.id, { estado: nuevoEstado });
    setFeedback('Estado actualizado');
    setTimeout(() => setFeedback(''), 2000);
  };

  const abrirEditar = (cancha) => {
    setCanchaEditar(cancha);
    setMostrarForm(true);
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
      <div className="px-4 md:px-6 lg:px-8 py-6 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-black tracking-tight">CANCHAS</h1>
            <p className="text-gray-600 text-sm tracking-wide mt-1">
              Gestiona las canchas del complejo
            </p>
          </div>
          <button
            onClick={() => { setCanchaEditar(null); setMostrarForm(true); }}
            className="px-4 py-2.5 bg-black text-white text-xs font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva cancha
          </button>
        </div>

        {feedback && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm">
            {feedback}
          </div>
        )}

        {/* Nota de migración BD */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-800 font-medium mb-1">Configuración de base de datos requerida</p>
          <p className="text-xs text-amber-700">
            Para que los cambios persistan, ejecuta el SQL de migración en Supabase (ver SUPABASE_MIGRATION.md).
            Sin la tabla <code className="bg-amber-100 px-1 rounded">canchas</code>, los cambios solo aplican en esta sesión.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {canchas.map(cancha => {
            const estadoInfo = ESTADOS[cancha.estado] || ESTADOS.disponible;
            return (
              <div key={cancha.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Foto */}
                {cancha.foto_url ? (
                  <img src={cancha.foto_url} alt={cancha.nombre} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-black">{cancha.nombre}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${estadoInfo.color}`}>
                      {estadoInfo.label}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 mb-1 font-mono">{cancha.id}</p>

                  <div className="text-sm text-gray-600 space-y-0.5 mb-3">
                    <p>Regular: <span className="font-semibold text-black">S/ {cancha.costo_regular}/h</span></p>
                    {cancha.costo_socio && (
                      <p>Socio: <span className="font-semibold text-black">S/ {cancha.costo_socio}/h</span></p>
                    )}
                    <div className="flex gap-1 mt-1.5">
                      {(cancha.deportes || []).map(dep => (
                        <span key={dep} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full font-medium">
                          {dep === 'basket' ? 'Básquet' : 'Vóley'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Cambio rápido de estado */}
                  <div className="flex gap-1 mb-3">
                    {Object.entries(ESTADOS).map(([val, info]) => (
                      <button
                        key={val}
                        onClick={() => handleCambiarEstado(cancha, val)}
                        disabled={cancha.estado === val}
                        className={`flex-1 px-2 py-1.5 text-[10px] font-medium rounded-lg transition-all ${
                          cancha.estado === val
                            ? 'bg-black text-white cursor-default'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {info.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => abrirEditar(cancha)}
                    className="w-full px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-all"
                  >
                    Editar cancha
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {mostrarForm && (
        <FormCancha
          canchaEditar={canchaEditar}
          onGuardar={handleGuardar}
          onCancelar={() => { setMostrarForm(false); setCanchaEditar(null); }}
        />
      )}
    </div>
  );
};

export default GestionCanchas;
