import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSociosComerciales } from '../../context/SociosComercialesContext';

const CATEGORIAS = [
  { valor: 'restaurante', label: 'Restaurante' },
  { valor: 'tienda', label: 'Tienda' },
  { valor: 'gym', label: 'Gym' },
  { valor: 'salud', label: 'Salud' },
  { valor: 'entretenimiento', label: 'Entretenimiento' },
  { valor: 'otro', label: 'Otro' }
];

const categoriaLabel = (cat) => {
  const found = CATEGORIAS.find(c => c.valor === cat);
  return found ? found.label : cat;
};

const formInicial = {
  nombre: '',
  descripcion: '',
  beneficio: '',
  categoria: 'restaurante',
  logo_url: ''
};

const GestionSociosComerciales = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { sociosComerciales, loading, agregarSocio, editarSocio, eliminarSocio, toggleActivo, reordenarBatch, subirLogo, eliminarLogo } = useSociosComerciales();

  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [modalTipo, setModalTipo] = useState(null); // 'agregar' | 'editar' | 'eliminar'
  const [socioSeleccionado, setSocioSeleccionado] = useState(null);
  const [formData, setFormData] = useState(formInicial);
  const [archivoLogo, setArchivoLogo] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  const abrirModalAgregar = () => {
    setFormData(formInicial);
    setSocioSeleccionado(null);
    setArchivoLogo(null);
    setPreviewLogo(null);
    setModalTipo('agregar');
  };

  const abrirModalEditar = (socio) => {
    setFormData({
      nombre: socio.nombre,
      descripcion: socio.descripcion || '',
      beneficio: socio.beneficio,
      categoria: socio.categoria,
      logo_url: socio.logo_url || ''
    });
    setSocioSeleccionado(socio);
    setArchivoLogo(null);
    setPreviewLogo(socio.logo_url || null);
    setModalTipo('editar');
  };

  const abrirModalEliminar = (socio) => {
    setSocioSeleccionado(socio);
    setModalTipo('eliminar');
  };

  const cerrarModal = () => {
    setModalTipo(null);
    setSocioSeleccionado(null);
    setFormData(formInicial);
    setArchivoLogo(null);
    setPreviewLogo(null);
  };

  const handleArchivoSeleccionado = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    // Validar tipo
    if (!archivo.type.startsWith('image/')) {
      mostrarMensaje('Solo se permiten archivos de imagen', 'error');
      return;
    }
    // Validar tamaño (max 2MB)
    if (archivo.size > 2 * 1024 * 1024) {
      mostrarMensaje('La imagen no debe superar los 2MB', 'error');
      return;
    }

    setArchivoLogo(archivo);
    setPreviewLogo(URL.createObjectURL(archivo));
  };

  const quitarLogo = () => {
    setArchivoLogo(null);
    setPreviewLogo(null);
    setFormData({ ...formData, logo_url: '' });
  };

  const handleGuardar = async () => {
    if (!formData.nombre.trim() || !formData.beneficio.trim() || !formData.categoria) {
      mostrarMensaje('Completa los campos obligatorios: nombre, beneficio y categoría', 'error');
      return;
    }

    try {
      setSubiendo(true);
      let logoUrl = formData.logo_url;

      // Si hay un archivo nuevo, subirlo
      if (archivoLogo) {
        // Si estamos editando y ya tenía logo, eliminar el anterior
        if (modalTipo === 'editar' && socioSeleccionado?.logo_url) {
          await eliminarLogo(socioSeleccionado.logo_url);
        }
        logoUrl = await subirLogo(archivoLogo);
      }
      // Si se quitó el logo (preview null y no hay archivo), eliminar el anterior
      else if (!previewLogo && modalTipo === 'editar' && socioSeleccionado?.logo_url) {
        await eliminarLogo(socioSeleccionado.logo_url);
        logoUrl = '';
      }

      const datos = { ...formData, logo_url: logoUrl };

      if (modalTipo === 'agregar') {
        await agregarSocio(datos);
        mostrarMensaje('Socio comercial agregado exitosamente', 'success');
      } else if (modalTipo === 'editar' && socioSeleccionado) {
        await editarSocio(socioSeleccionado.id, datos);
        mostrarMensaje('Socio comercial actualizado exitosamente', 'success');
      }
      cerrarModal();
    } catch (error) {
      mostrarMensaje('Error: ' + error.message, 'error');
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminar = async () => {
    if (!socioSeleccionado) return;
    try {
      await eliminarSocio(socioSeleccionado.id);
      mostrarMensaje('Socio comercial eliminado', 'success');
      cerrarModal();
    } catch (error) {
      mostrarMensaje('Error al eliminar: ' + error.message, 'error');
    }
  };

  const handleToggleActivo = async (id) => {
    try {
      await toggleActivo(id);
    } catch (error) {
      mostrarMensaje('Error al cambiar estado: ' + error.message, 'error');
    }
  };

  const dragEnabled = !busqueda;

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const items = [...sociosComerciales];
    const fromIndex = items.findIndex(s => s.id === draggedId);
    const toIndex = items.findIndex(s => s.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);

    const nuevosOrden = items.map((item, i) => ({ id: item.id, orden: i + 1 }));

    setDraggedId(null);
    setDragOverId(null);

    try {
      await reordenarBatch(nuevosOrden);
    } catch {
      mostrarMensaje('Error al reordenar', 'error');
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const sociosFiltrados = sociosComerciales.filter(socio => {
    if (!busqueda) return true;
    const busquedaLower = busqueda.toLowerCase();
    return (
      socio.nombre?.toLowerCase().includes(busquedaLower) ||
      socio.categoria?.toLowerCase().includes(busquedaLower) ||
      socio.beneficio?.toLowerCase().includes(busquedaLower)
    );
  });

  const totalActivos = sociosComerciales.filter(s => s.activo).length;
  const totalInactivos = sociosComerciales.filter(s => !s.activo).length;

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
            SOCIOS COMERCIALES
          </h1>
          <p className="text-gray-600 text-sm tracking-wide">
            Gestiona los comercios aliados y sus beneficios para socios
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

        {/* Toolbar: Agregar + Buscar */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={abrirModalAgregar}
            className="flex-shrink-0 px-5 py-2.5 bg-black text-white text-xs font-medium tracking-widest hover:bg-gray-800 transition-colors uppercase flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar
          </button>
          <div className="flex-1 relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 focus:border-black focus:outline-none bg-white text-black placeholder-gray-400 text-sm transition-colors"
            />
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
            <span>{sociosComerciales.length} total</span>
            <span className="text-green-500">{totalActivos} activos</span>
            {totalInactivos > 0 && <span>{totalInactivos} ocultos</span>}
          </div>
        </div>

        {/* Grid de socios */}
        {sociosFiltrados.length === 0 ? (
          <div className="text-center py-16 border border-gray-200">
            <p className="text-gray-400 text-sm uppercase tracking-widest">
              {busqueda ? 'No se encontraron resultados' : 'No hay socios comerciales registrados'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sociosFiltrados.map((socio) => (
              <div
                key={socio.id}
                draggable={dragEnabled}
                onDragStart={(e) => dragEnabled && handleDragStart(e, socio.id)}
                onDragOver={(e) => dragEnabled && handleDragOver(e, socio.id)}
                onDrop={(e) => dragEnabled && handleDrop(e, socio.id)}
                onDragEnd={handleDragEnd}
                className={`bg-white border p-5 transition-all ${
                  dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''
                } ${
                  socio.activo ? 'border-gray-300 hover:border-black hover:shadow-md' : 'border-gray-200 bg-gray-50 opacity-70'
                } ${
                  draggedId === socio.id ? 'opacity-40 scale-95' : ''
                } ${
                  dragOverId === socio.id && draggedId !== socio.id ? 'border-black border-2 shadow-lg' : ''
                }`}
              >
                {/* Logo / Placeholder */}
                <div className="w-full h-24 bg-gray-100 flex items-center justify-center overflow-hidden mb-4">
                  {socio.logo_url ? (
                    <img
                      src={socio.logo_url}
                      alt={socio.nombre}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span
                    className={`text-3xl font-bold text-gray-400 ${socio.logo_url ? 'hidden' : ''}`}
                    style={{ display: socio.logo_url ? 'none' : 'flex' }}
                  >
                    {socio.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-black tracking-tight truncate">
                      {socio.nombre}
                    </h3>
                  </div>
                  <span className="inline-block px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest bg-gray-100 text-gray-600 mb-2">
                    {categoriaLabel(socio.categoria)}
                  </span>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {socio.beneficio}
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActivo(socio.id)}
                    className={`px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest border transition-colors ${
                      socio.activo
                        ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                        : 'border-gray-300 text-gray-500 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {socio.activo ? 'Activo' : 'Inactivo'}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => abrirModalEditar(socio)}
                    className="w-9 h-9 flex items-center justify-center border border-gray-300 hover:bg-gray-100 transition-colors"
                    title="Editar"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => abrirModalEliminar(socio)}
                    className="w-9 h-9 flex items-center justify-center border border-red-300 hover:bg-red-50 transition-colors"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nota informativa */}
        <div className="mt-8 bg-gray-50 border-l-2 border-black p-6">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 font-semibold">
            Nota
          </p>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Los socios comerciales activos se muestran en la página pública</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Arrastra las tarjetas para reordenar la posición en el carousel</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Puedes desactivar un socio sin eliminarlo para ocultarlo temporalmente</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Modal Agregar / Editar */}
      {(modalTipo === 'agregar' || modalTipo === 'editar') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-black tracking-tight mb-2">
              {modalTipo === 'agregar' ? 'AGREGAR SOCIO' : 'EDITAR SOCIO'}
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              {modalTipo === 'agregar'
                ? 'Registra un nuevo comercio aliado'
                : `Editando: ${socioSeleccionado?.nombre}`}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre del comercio"
                  className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none text-black text-sm placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">
                  Categoría *
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none text-black text-sm"
                >
                  {CATEGORIAS.map(cat => (
                    <option key={cat.valor} value={cat.valor}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">
                  Beneficio para socios *
                </label>
                <textarea
                  value={formData.beneficio}
                  onChange={(e) => setFormData({ ...formData, beneficio: e.target.value })}
                  placeholder="Ej: 15% de descuento en todos los productos"
                  rows="2"
                  className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none text-black text-sm placeholder-gray-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Breve descripción del comercio"
                  rows="2"
                  className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none text-black text-sm placeholder-gray-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">
                  Logo (opcional)
                </label>

                {/* Preview */}
                {previewLogo ? (
                  <div className="border border-gray-200 p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400">Preview</p>
                      <button
                        type="button"
                        onClick={quitarLogo}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="h-24 bg-gray-50 flex items-center justify-center">
                      <img
                        src={previewLogo}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                ) : null}

                {/* Input archivo */}
                <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-dashed border-gray-300 hover:border-black cursor-pointer transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-500">
                    {previewLogo ? 'Cambiar imagen' : 'Seleccionar imagen'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleArchivoSeleccionado}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-gray-400 mt-1">PNG, JPG o WebP. Máximo 2MB.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={cerrarModal}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 text-xs font-medium tracking-widest hover:bg-gray-50 transition-colors uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={subiendo}
                className="flex-1 px-6 py-3 bg-black text-white text-xs font-medium tracking-widest hover:bg-gray-800 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {subiendo ? 'Guardando...' : modalTipo === 'agregar' ? 'Agregar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {modalTipo === 'eliminar' && socioSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-sm w-full p-8">
            <h3 className="text-2xl font-bold text-black tracking-tight mb-2">
              ELIMINAR SOCIO
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              ¿Estás seguro de eliminar a <span className="font-semibold">{socioSeleccionado.nombre}</span>? Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-3">
              <button
                onClick={cerrarModal}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 text-xs font-medium tracking-widest hover:bg-gray-50 transition-colors uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                className="flex-1 px-6 py-3 bg-red-600 text-white text-xs font-medium tracking-widest hover:bg-red-700 transition-colors uppercase"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionSociosComerciales;
