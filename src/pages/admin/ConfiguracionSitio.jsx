import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useHeroConfig } from '../../context/HeroConfigContext';

const getGoogleDriveEmbedUrl = (url) => {
  if (!url) return null;
  const matchFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (matchFile) return `https://drive.google.com/file/d/${matchFile[1]}/preview`;
  const matchUc = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
  if (matchUc) return `https://drive.google.com/file/d/${matchUc[1]}/preview`;
  return null;
};

const esGoogleDrive = (url) => url && url.includes('drive.google.com');

const ConfiguracionSitio = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { heroConfig, loading, actualizarHeroConfig, subirVideo, eliminarVideo } = useHeroConfig();

  const [mensaje, setMensaje] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [metodo, setMetodo] = useState('url'); // 'url' | 'archivo'
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  const handleToggleVideo = async () => {
    try {
      setGuardando(true);
      await actualizarHeroConfig(heroConfig.video_url, !heroConfig.video_activo);
      mostrarMensaje(
        !heroConfig.video_activo ? 'Video activado en el hero' : 'Video desactivado, mostrando diseño por defecto',
        'success'
      );
    } catch (error) {
      mostrarMensaje('Error al cambiar estado: ' + error.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarUrl = async () => {
    const url = inputUrl.trim();
    if (!url) {
      mostrarMensaje('Ingresa una URL valida', 'error');
      return;
    }

    try {
      setGuardando(true);
      // Si habia un video en storage, eliminarlo
      if (heroConfig.video_url && heroConfig.video_url.includes('/storage/v1/object/public/images/')) {
        await eliminarVideo(heroConfig.video_url);
      }
      await actualizarHeroConfig(url, heroConfig.video_activo);
      setInputUrl('');
      mostrarMensaje('URL del video guardada exitosamente', 'success');
    } catch (error) {
      mostrarMensaje('Error al guardar URL: ' + error.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleSubirVideo = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    if (!archivo.type.startsWith('video/')) {
      mostrarMensaje('Solo se permiten archivos de video (MP4, WebM)', 'error');
      return;
    }
    if (archivo.size > 50 * 1024 * 1024) {
      mostrarMensaje('El video no debe superar los 50MB. Para archivos mas grandes usa la opcion de URL', 'error');
      return;
    }

    try {
      setSubiendo(true);

      if (heroConfig.video_url && heroConfig.video_url.includes('/storage/v1/object/public/images/')) {
        await eliminarVideo(heroConfig.video_url);
      }

      const url = await subirVideo(archivo);
      await actualizarHeroConfig(url, heroConfig.video_activo);
      mostrarMensaje('Video subido exitosamente', 'success');
    } catch (error) {
      mostrarMensaje('Error al subir video: ' + error.message, 'error');
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEliminarVideo = async () => {
    try {
      setGuardando(true);
      if (heroConfig.video_url && heroConfig.video_url.includes('/storage/v1/object/public/images/')) {
        await eliminarVideo(heroConfig.video_url);
      }
      await actualizarHeroConfig(null, false);
      mostrarMensaje('Video eliminado', 'success');
    } catch (error) {
      mostrarMensaje('Error al eliminar video: ' + error.message, 'error');
    } finally {
      setGuardando(false);
    }
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
            CONFIGURACION DEL SITIO
          </h1>
          <p className="text-gray-600 text-sm tracking-wide">
            Gestiona la apariencia y contenido del sitio web
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

        {/* Sección Hero / Video Promocional */}
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-black tracking-tight mb-1">
            HERO / VIDEO PROMOCIONAL
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            Configura el video de fondo de la seccion principal de la landing page
          </p>

          {/* Estado actual */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Estado actual
                </p>
                <p className="text-sm font-medium text-black">
                  {heroConfig.video_activo && heroConfig.video_url
                    ? 'Video activo'
                    : 'Mostrando diseño por defecto'}
                </p>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${
                  heroConfig.video_activo && heroConfig.video_url
                    ? 'bg-green-500'
                    : 'bg-gray-400'
                }`}
              />
            </div>
          </div>

          {/* Toggle activar/desactivar */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200 mb-6">
            <div>
              <p className="text-sm font-semibold text-black">Activar video en hero</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {heroConfig.video_url
                  ? 'Muestra el video como fondo del hero'
                  : 'Agrega un video primero para poder activarlo'}
              </p>
            </div>
            <button
              onClick={handleToggleVideo}
              disabled={!heroConfig.video_url || guardando}
              className={`relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                heroConfig.video_activo ? 'bg-black' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                  heroConfig.video_activo ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Preview del video */}
          {heroConfig.video_url && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-600 mb-3">
                Preview
              </p>
              <div className="relative bg-black aspect-video overflow-hidden">
                {esGoogleDrive(heroConfig.video_url) ? (
                  <iframe
                    src={getGoogleDriveEmbedUrl(heroConfig.video_url)}
                    className="w-full h-full"
                    allow="autoplay"
                    frameBorder="0"
                    title="Preview video"
                  />
                ) : (
                  <>
                    <video
                      src={heroConfig.video_url}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white text-xs font-medium">
                        Preview del hero
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Selector de metodo */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600 mb-3">
              Agregar video
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setMetodo('url')}
                className={`px-4 py-2 text-xs font-medium rounded-full transition-all ${
                  metodo === 'url'
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Pegar URL
              </button>
              <button
                onClick={() => setMetodo('archivo')}
                className={`px-4 py-2 text-xs font-medium rounded-full transition-all ${
                  metodo === 'archivo'
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Subir archivo
              </button>
            </div>
          </div>

          {/* Metodo: URL */}
          {metodo === 'url' && (
            <div className="mb-6">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://drive.google.com/... o URL directa al video"
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 focus:bg-white text-black text-sm placeholder-gray-400 transition-all"
                />
                <button
                  onClick={handleGuardarUrl}
                  disabled={guardando || !inputUrl.trim()}
                  className="px-5 py-2.5 bg-black text-white text-xs font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Pega la URL directa del video (Google Drive, Dropbox, hosting propio, etc.)
              </p>
            </div>
          )}

          {/* Metodo: Archivo */}
          {metodo === 'archivo' && (
            <div className="mb-6">
              <label
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  subiendo
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {subiendo ? 'Subiendo...' : heroConfig.video_url ? 'Cambiar video' : 'Subir video'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={handleSubirVideo}
                  disabled={subiendo}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-gray-400 mt-2">
                MP4, WebM. Maximo 50MB. Para archivos mas grandes usa la opcion de URL.
              </p>
            </div>
          )}

          {/* Eliminar video */}
          {heroConfig.video_url && (
            <div className="mb-6">
              <button
                onClick={handleEliminarVideo}
                disabled={guardando}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar video
              </button>
            </div>
          )}

          {/* Nota informativa */}
          <div className="mt-10 bg-gray-50 rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-600 mb-3">
              Nota
            </p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>El video se reproduce en loop, sin sonido, como fondo del hero de la landing</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Se aplica un overlay oscuro semitransparente para mantener legible el texto</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Al desactivar el video, se muestra el diseño por defecto con gradiente</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Para videos grandes, subelos a Google Drive u otro hosting y pega la URL directa</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionSitio;
