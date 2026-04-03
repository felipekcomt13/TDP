import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useHeroConfig } from '../context/HeroConfigContext';
import DisponibilidadRapida from '../components/reservas/DisponibilidadRapida';
import BannerLibroReclamaciones from '../components/shared/BannerLibroReclamaciones';


const getGoogleDriveEmbedUrl = (url) => {
  if (!url) return null;
  // Formato: drive.google.com/file/d/ID/... o drive.google.com/uc?...id=ID
  const matchFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (matchFile) return `https://drive.google.com/file/d/${matchFile[1]}/preview`;
  const matchUc = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
  if (matchUc) return `https://drive.google.com/file/d/${matchUc[1]}/preview`;
  return null;
};

const esGoogleDrive = (url) => url && url.includes('drive.google.com');

const TABS_LANDING = [
  {
    id: 'disponibilidad',
    label: 'Disponibilidad',
    labelCorto: 'Horarios',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    id: 'como-reservar',
    label: 'Como Reservar',
    labelCorto: 'Reservar',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )
  },
  {
    id: 'contacto',
    label: 'Contacto',
    labelCorto: 'Contacto',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    )
  },
];

const LandingPage = () => {
  const { heroConfig } = useHeroConfig();
  const videoRef = useRef(null);
  const [muteado, setMuteado] = useState(true);
  const [tabActivo, setTabActivo] = useState('disponibilidad');

  const videoActivo = heroConfig.video_activo && heroConfig.video_url;
  const esVideoNativo = videoActivo && !esGoogleDrive(heroConfig.video_url);

  const toggleAudio = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuteado(videoRef.current.muted);
    }
  };

  const pasos = [
    {
      numero: 1,
      titulo: 'Elige tu horario',
      descripcion: 'Selecciona la fecha y hora que mejor se adapte a tus necesidades en nuestro calendario interactivo.'
    },
    {
      numero: 2,
      titulo: 'Completa el formulario',
      descripcion: 'Ingresa tus datos personales: nombre, DNI, teléfono y correo electrónico.'
    },
    {
      numero: 3,
      titulo: 'Envía tu solicitud',
      descripcion: 'Serás redirigido automáticamente a WhatsApp con tu información de reserva prellenada.'
    },
    {
      numero: 4,
      titulo: 'Realiza el pago',
      descripcion: 'Efectúa el pago correspondiente a través de los métodos disponibles.'
    },
    {
      numero: 5,
      titulo: 'Envía el comprobante',
      descripcion: 'Adjunta la foto del comprobante de pago en el chat de WhatsApp.'
    },
    {
      numero: 6,
      titulo: 'Confirmación',
      descripcion: 'Nuestro equipo revisará tu pago y confirmará tu reserva a la brevedad.'
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className={`relative overflow-hidden text-white ${videoActivo ? 'h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh]' : 'py-20 md:py-32'}`}>
        {/* Fondo: video o gradiente */}
        {videoActivo ? (
          <>
            {esGoogleDrive(heroConfig.video_url) ? (
              <iframe
                src={getGoogleDriveEmbedUrl(heroConfig.video_url)}
                className="absolute inset-0 w-full h-full scale-150 pointer-events-none"
                allow="autoplay"
                frameBorder="0"
                title="Video hero"
              />
            ) : (
              <video
                ref={videoRef}
                src={heroConfig.video_url}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />
            {esVideoNativo && (
              <button
                onClick={toggleAudio}
                className="absolute bottom-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                aria-label={muteado ? 'Activar audio' : 'Silenciar audio'}
              >
                {muteado ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </button>
            )}
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
            {/* Subtle court lines pattern */}
            <div className="absolute inset-0 opacity-[0.04]">
              <svg className="w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
                <rect x="100" y="50" width="600" height="300" fill="none" stroke="white" strokeWidth="2"/>
                <line x1="400" y1="50" x2="400" y2="350" stroke="white" strokeWidth="2"/>
                <circle cx="400" cy="200" r="60" fill="none" stroke="white" strokeWidth="2"/>
                <rect x="100" y="140" width="80" height="120" fill="none" stroke="white" strokeWidth="2"/>
                <rect x="620" y="140" width="80" height="120" fill="none" stroke="white" strokeWidth="2"/>
                <path d="M 180 140 A 60 60 0 0 1 180 260" fill="none" stroke="white" strokeWidth="2"/>
                <path d="M 620 140 A 60 60 0 0 0 620 260" fill="none" stroke="white" strokeWidth="2"/>
              </svg>
            </div>
          </>
        )}

        {/* Contenido del hero */}
        <div className={`px-4 sm:px-6 lg:px-8 text-center relative z-10 ${videoActivo ? 'absolute inset-x-0 top-0 bottom-0 flex items-center justify-center pt-24 sm:pt-28 md:pt-32' : ''}`}>
          <div>
            <p className={`text-[10px] sm:text-xs uppercase tracking-[0.3em] mb-2 sm:mb-3 animate-stagger-1 ${videoActivo ? 'text-gray-200 drop-shadow-lg' : 'text-gray-400'}`}>
              Bienvenido a
            </p>
            <h1 className={`text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6 font-display animate-stagger-2 ${videoActivo ? 'drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]' : ''}`}>
              COMPLEJO DEPORTIVO<br />TRIPLE DOBLE
            </h1>
            {heroConfig.subtitulo_activo && heroConfig.subtitulo_texto && (
              <p className={`text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed animate-stagger-3 ${videoActivo ? 'text-gray-100 drop-shadow-lg' : 'text-gray-300'}`}>
                {heroConfig.subtitulo_texto}
              </p>
            )}
            {videoActivo && (
              <a
                href="https://wa.me/51974341064?text=Quiero%20participar%20en%20el%203%20x%203"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 sm:mt-8 inline-block px-8 sm:px-12 py-3 sm:py-4 bg-white text-black text-xs sm:text-sm font-bold rounded-lg shadow-sm hover:shadow-md hover:bg-gray-200 active:scale-[0.98] transition-all animate-stagger-3"
              >
                Participar ahora
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs de contenido */}
      <div className="sticky top-16 md:top-20 z-30 bg-gray-900">
        <div className="px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto py-2.5">
          <div className="flex gap-2">
            {TABS_LANDING.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActivo(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  tabActivo === tab.id
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.labelCorto}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido del tab activo */}
      {tabActivo === 'disponibilidad' && <DisponibilidadRapida />}

      {tabActivo === 'como-reservar' && (
        <div className="px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {pasos.map((paso) => (
                <div
                  key={paso.numero}
                  className="flex gap-5 items-start p-5 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-all"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center">
                      <span className="text-lg font-bold">{paso.numero}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-black mb-1 tracking-tight uppercase">
                      {paso.titulo}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {paso.descripcion}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                to="/reservas"
                className="inline-block px-12 py-4 bg-black text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition-all"
              >
                Reservar ahora
              </Link>
            </div>
          </div>
        </div>
      )}

      {tabActivo === 'contacto' && (
        <div className="px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    WhatsApp
                  </p>
                  <a
                    href="https://wa.me/51974341064"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xl font-bold text-black hover:text-gray-600 transition-colors"
                  >
                    +51 974 341 064
                  </a>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    Tarifa
                  </p>
                  <p className="text-2xl font-bold text-black">
                    desde: S/ 50 <span className="text-sm text-gray-600 font-normal">por hora</span>
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 mb-3">
                  Importante
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Las reservas se confirman una vez verificado el pago</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Debes enviar el comprobante de pago por WhatsApp</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Puedes reservar de 1 hasta 14 horas continuas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Horario de atención: 6:00 AM - 1:00 AM (día siguiente)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="relative bg-black text-white py-12 text-center">
        <div className="px-6">
          <p className="text-sm text-gray-400 mb-4">
            ¿Listo para jugar?
          </p>
          <Link
            to="/reservas"
            className="inline-block px-12 py-4 bg-white text-black font-bold text-sm rounded-lg shadow-sm hover:shadow-md hover:bg-gray-200 active:scale-[0.98] transition-all"
          >
            Ir al calendario
          </Link>
        </div>
        <BannerLibroReclamaciones variant="dark" />
      </div>

    </div>
  );
};

export default LandingPage;
