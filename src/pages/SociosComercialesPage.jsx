import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSociosComerciales } from '../context/SociosComercialesContext';
import { useAuth } from '../context/AuthContext';

const CATEGORIAS = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'restaurante', label: 'Restaurantes' },
  { valor: 'tienda', label: 'Tiendas' },
  { valor: 'gym', label: 'Gym' },
  { valor: 'salud', label: 'Salud' },
  { valor: 'entretenimiento', label: 'Entretenimiento' },
  { valor: 'otro', label: 'Otros' }
];

const categoriaLabel = (cat) => {
  const found = CATEGORIAS.find(c => c.valor === cat);
  return found ? found.label : cat;
};

const SociosComercialesPage = () => {
  const { sociosComerciales, loading } = useSociosComerciales();
  const { esSocio } = useAuth();
  const [categoriaActiva, setCategoriaActiva] = useState('todos');
  const [slideActual, setSlideActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [transicion, setTransicion] = useState(true);

  const sociosActivos = sociosComerciales.filter(s => s.activo);

  const sociosFiltrados = categoriaActiva === 'todos'
    ? sociosActivos
    : sociosActivos.filter(s => s.categoria === categoriaActiva);

  // Carousel infinito: duplicar items para loop seamless
  const totalSocios = sociosActivos.length;
  const sociosCarousel = totalSocios > 0
    ? [...sociosActivos, ...sociosActivos, ...sociosActivos].slice(0, totalSocios + 3)
    : [];

  // Auto-rotación
  const siguienteSlide = useCallback(() => {
    setSlideActual(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (totalSocios <= 1 || pausado) return;
    const timer = setInterval(siguienteSlide, 3000);
    return () => clearInterval(timer);
  }, [totalSocios, pausado, siguienteSlide]);

  // Snap seamless: al llegar al punto de loop, volver a 0 sin transición
  useEffect(() => {
    if (slideActual >= totalSocios && totalSocios > 1) {
      const timeout = setTimeout(() => {
        setTransicion(false);
        setSlideActual(0);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTransicion(true);
          });
        });
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [slideActual, totalSocios]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-xl font-bold text-black tracking-tight">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full">
      {/* Hero */}
      <div className="px-6 lg:px-8 pt-12 pb-8">
        <div className="max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-black tracking-tight mb-3">
            BENEFICIOS PARA SOCIOS
          </h1>
          <p className="text-gray-600 text-sm md:text-base tracking-wide max-w-2xl">
            Como socio del Complejo Deportivo Triple Doble, accedes a descuentos y beneficios exclusivos en nuestros comercios aliados.
          </p>
        </div>
      </div>

      {/* Carousel auto-rotativo */}
      {sociosActivos.length > 0 && (
        <div
          className="px-6 lg:px-8 pb-10"
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
        >
          <div className="relative overflow-hidden border border-gray-200 bg-gray-50">
            {/* Contenedor deslizante */}
            <div
              className="flex"
              style={{
                transform: `translateX(-${slideActual * (100 / 3)}%)`,
                transition: transicion ? 'transform 700ms ease-in-out' : 'none'
              }}
            >
              {sociosCarousel.map((socio, idx) => (
                <div
                  key={`${socio.id}-${idx}`}
                  className="flex-shrink-0 flex flex-col items-center justify-center p-8"
                  style={{ width: `${100 / 3}%` }}
                >
                  <div className="w-28 h-28 flex items-center justify-center mb-3">
                    {socio.logo_url ? (
                      <img
                        src={socio.logo_url}
                        alt={socio.nombre}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full items-center justify-center ${socio.logo_url ? 'hidden' : 'flex'}`}
                    >
                      <span className="text-5xl font-bold text-gray-300">
                        {socio.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-black tracking-tight text-center">
                    {socio.nombre}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center line-clamp-1">
                    {socio.beneficio}
                  </p>
                </div>
              ))}
            </div>

            {/* Dots */}
            {totalSocios > 1 && (
              <div className="flex justify-center gap-2 py-3 bg-gray-50">
                {sociosActivos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideActual(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === (slideActual % totalSocios) ? 'bg-black' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filtro por categoría */}
      <div className="px-6 lg:px-8 pb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIAS.map((cat) => {
            const count = cat.valor === 'todos'
              ? sociosActivos.length
              : sociosActivos.filter(s => s.categoria === cat.valor).length;

            if (cat.valor !== 'todos' && count === 0) return null;

            return (
              <button
                key={cat.valor}
                onClick={() => setCategoriaActiva(cat.valor)}
                className={`flex-shrink-0 px-4 py-2 text-xs font-medium tracking-wide uppercase transition-colors ${
                  categoriaActiva === cat.valor
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de socios */}
      <div className="px-6 lg:px-8 pb-12">
        {sociosFiltrados.length === 0 ? (
          <div className="text-center py-20 border border-gray-200">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">
              No hay socios comerciales
            </p>
            <p className="text-gray-400 text-xs">
              Pronto tendremos alianzas comerciales con beneficios para ti
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sociosFiltrados.map((socio) => (
              <div
                key={socio.id}
                className="border border-gray-200 hover:border-black transition-all hover:shadow-md flex flex-col"
              >
                {/* Logo / Placeholder */}
                <div className="h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {socio.logo_url ? (
                    <img
                      src={socio.logo_url}
                      alt={socio.nombre}
                      className="w-full h-full object-contain p-4"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full items-center justify-center ${socio.logo_url ? 'hidden' : 'flex'}`}
                  >
                    <span className="text-5xl font-bold text-gray-300">
                      {socio.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-black tracking-tight leading-tight mb-2">
                    {socio.nombre}
                  </h3>

                  <span className="inline-block self-start px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest bg-gray-100 text-gray-600 mb-3">
                    {categoriaLabel(socio.categoria)}
                  </span>

                  {socio.descripcion && (
                    <p className="text-sm text-gray-500 mb-3 leading-relaxed">
                      {socio.descripcion}
                    </p>
                  )}

                  {/* Beneficio destacado */}
                  <div className="mt-auto pt-3 border-t border-gray-100">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1 font-semibold">
                      Beneficio Socio
                    </p>
                    <p className="text-sm font-semibold text-black">
                      {socio.beneficio}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA para no-socios */}
      {!esSocio() && (
        <div className="px-6 lg:px-8 pb-12">
          <div className="bg-gray-50 border-l-2 border-black p-8 text-center">
            <h2 className="text-2xl font-bold text-black tracking-tight mb-2">
              HAZTE SOCIO
            </h2>
            <p className="text-gray-600 text-sm mb-6 max-w-lg mx-auto">
              Accede a todos estos beneficios y mucho mas siendo socio del Complejo Deportivo Triple Doble.
            </p>
            <Link
              to="/mi-membresia"
              className="inline-block px-8 py-3 bg-black text-white text-xs font-medium tracking-widest hover:bg-gray-800 transition-colors uppercase"
            >
              Ver Membresia
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default SociosComercialesPage;
