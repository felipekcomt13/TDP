import { useState, useEffect } from 'react';
import { useKiosco } from '../../context/KioscoContext';
import { buscarEnOpenFoodFacts } from '../../services/openFoodFacts';

const inputClase = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400';

const mensajeError = (error) =>
  error?.code === '23505'
    ? 'Ese código ya está asignado a otro producto'
    : error?.message || 'No se pudo guardar';

/**
 * Se abre cuando se escanea un código que no está en productos_kiosco.
 * Permite crear el producto (con nombre/foto sugeridos por Open Food Facts) o
 * asignar el código a un producto que ya existe. En ambos casos el código queda
 * guardado y la próxima vez se encuentra directo.
 */
const ModalCodigoNuevo = ({ codigo, onCerrar, onListo, onMensaje }) => {
  const { productos, agregarProducto, editarProducto } = useKiosco();

  const [modo, setModo] = useState('crear');
  const [buscandoApi, setBuscandoApi] = useState(true);
  const [sugerencia, setSugerencia] = useState(null);
  const [form, setForm] = useState({ nombre: '', precio: '', stock: '' });
  const [usarFoto, setUsarFoto] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    buscarEnOpenFoodFacts(codigo).then((resultado) => {
      if (cancelado) return;
      setSugerencia(resultado);
      if (resultado) setForm(f => ({ ...f, nombre: f.nombre || resultado.nombre }));
      setBuscandoApi(false);
    });
    return () => { cancelado = true; };
  }, [codigo]);

  const crear = async (e) => {
    e.preventDefault();
    setError('');
    const precio = parseFloat(form.precio);
    const stock = parseInt(form.stock, 10);
    if (!form.nombre.trim()) return setError('El nombre es obligatorio');
    if (isNaN(precio) || precio < 0) return setError('Ingresa un precio válido');
    if (isNaN(stock) || stock < 0) return setError('Ingresa el stock actual');

    setGuardando(true);
    try {
      const producto = await agregarProducto({
        nombre: form.nombre.trim(),
        precio,
        stock,
        codigoBarras: codigo,
        imagenUrl: usarFoto ? sugerencia?.imagenUrl : null
      });
      onMensaje(`Producto creado: ${producto.nombre}`, 'success');
      onListo(producto);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const asignar = async (producto) => {
    setError('');
    setGuardando(true);
    try {
      await editarProducto(producto.id, {
        nombre: producto.nombre,
        precio: producto.precio,
        stock: producto.stock,
        codigoBarras: codigo,
        imagenUrl: producto.imagen_url,
        activo: producto.activo
      });
      onMensaje(`Código asignado a ${producto.nombre}`, 'success');
      onListo({ ...producto, codigo_barras: codigo });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const b = busqueda.trim().toLowerCase();
  // Primero los que todavía no tienen código: es lo más probable que se quiera asignar
  const candidatos = productos
    .filter(p => p.activo && (!b || p.nombre.toLowerCase().includes(b)))
    .sort((a, c) => Number(!!a.codigo_barras) - Number(!!c.codigo_barras))
    .slice(0, 30);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-scaleIn">
        <div className="p-6 pb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Código no registrado</h2>
            <p className="text-sm font-mono text-gray-500 mt-0.5">{codigo}</p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-gray-400 hover:text-black text-3xl leading-none">
            ×
          </button>
        </div>

        <div className="px-6">
          <div className="flex gap-1 bg-gray-100 rounded-full p-1">
            {[
              { id: 'crear', label: 'Crear producto' },
              { id: 'asignar', label: 'Asignar a existente' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => { setModo(t.id); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                  modo === t.id ? 'bg-black text-white shadow-sm' : 'text-gray-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {modo === 'crear' ? (
          <form onSubmit={crear} className="p-6 space-y-4">
            <div className="text-xs text-gray-500">
              {buscandoApi
                ? 'Buscando el producto en Open Food Facts…'
                : sugerencia
                  ? 'Datos sugeridos por Open Food Facts. Revísalos antes de guardar.'
                  : 'No se encontró en Open Food Facts. Llena los datos a mano.'}
            </div>

            {sugerencia?.imagenUrl && (
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200">
                <img src={sugerencia.imagenUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                <input type="checkbox" checked={usarFoto} onChange={(e) => setUsarFoto(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Usar esta foto</span>
              </label>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={inputClase}
                placeholder="Ej. Inca Kola 500ml"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Precio (S/)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.10"
                  min="0"
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: e.target.value })}
                  className={inputClase}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Stock actual</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className={inputClase}
                  placeholder="0"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="w-full py-3.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 disabled:bg-gray-300 transition-all"
            >
              {guardando ? 'Guardando…' : 'Crear y agregar al carrito'}
            </button>
          </form>
        ) : (
          <div className="p-6 space-y-3">
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className={inputClase}
            />
            <div className="space-y-2">
              {candidatos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin resultados</p>
              ) : candidatos.map(p => (
                <button
                  key={p.id}
                  onClick={() => asignar(p)}
                  disabled={guardando}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-black active:scale-[0.99] transition-all text-left disabled:opacity-50"
                >
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-500">
                      S/ {Number(p.precio).toFixed(2)}
                      {p.codigo_barras
                        ? <span className="text-amber-700"> · reemplaza {p.codigo_barras}</span>
                        : ' · sin código'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalCodigoNuevo;
