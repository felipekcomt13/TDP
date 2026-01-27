import { useState, useRef, useEffect } from 'react';
import logo from '../assets/logo-nuevo.png';

const CampoPage = () => {
  const [canchaHover, setCanchaHover] = useState(null);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(null); // Para móvil
  const [modoEdicion, setModoEdicion] = useState(false);
  const [canchaEditando, setCanchaEditando] = useState('cancha3');
  const [logoPos, setLogoPos] = useState({ x: 0, y: -10 });
  const [logoSize, setLogoSize] = useState(80);
  const [arrastrando, setArrastrando] = useState(null);
  const [puntoInicio, setPuntoInicio] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const svgRef = useRef(null);
  const [cargado, setCargado] = useState(false);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Estado inicial de visibilidad
  const elementosVisiblesDefault = {
    cancha3_circulo: true,
    cancha1_llaveSup: true,
    cancha1_llaveInf: true,
    cancha1_semiSup: true,
    cancha1_semiInf: true,
    cancha1_arcoSup: true,
    cancha1_arcoInf: true,
    cancha2_llaveSup: true,
    cancha2_llaveInf: true,
    cancha2_semiSup: true,
    cancha2_semiInf: true,
    cancha2_arcoSup: true,
    cancha2_arcoInf: true,
    cancha3_llaveIzq: true,
    cancha3_llaveDer: true,
    cancha3_semiIzq: true,
    cancha3_semiDer: true,
    cancha3_arcoIzq: true,
    cancha3_arcoDer: true,
  };

  const [elementosVisibles, setElementosVisibles] = useState(elementosVisiblesDefault);

  // Cargar desde localStorage al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('campoConfig3');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.logoPos) setLogoPos(config.logoPos);
        if (config.logoSize) setLogoSize(config.logoSize);
        if (config.elementosVisibles) setElementosVisibles({ ...elementosVisiblesDefault, ...config.elementosVisibles });
      } catch (e) {
        console.error('Error cargando config:', e);
      }
    }
    setCargado(true);
  }, []);

  // Guardar en localStorage solo después de cargar
  useEffect(() => {
    if (cargado) {
      localStorage.setItem('campoConfig3', JSON.stringify({ logoPos, logoSize, elementosVisibles }));
    }
  }, [logoPos, logoSize, elementosVisibles, cargado]);

  const getSVGPoint = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  const handleMouseDown = (e, tipo) => {
    if (!modoEdicion) return;
    e.stopPropagation();
    setArrastrando(tipo);
    const punto = getSVGPoint(e);
    setPuntoInicio({ x: punto.x, y: punto.y });
  };

  const handleMouseMove = (e) => {
    if (!arrastrando || !modoEdicion) return;
    const punto = getSVGPoint(e);
    const dx = punto.x - puntoInicio.x;
    const dy = punto.y - puntoInicio.y;

    if (arrastrando === 'logo') {
      setLogoPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }

    setPuntoInicio({ x: punto.x, y: punto.y });
  };

  const handleMouseUp = () => {
    setArrastrando(null);
  };

  const toggleElemento = (key) => {
    setElementosVisibles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Definición de las 3 canchas
  const canchas = {
    cancha1: {
      nombre: "Anexa 1",
      hitArea: { x: -17.58, y: -23.16, width: 157.29, height: 299.30 },
      lineaCentral: { x1: -17.58, y1: 126.49, x2: 139.71, y2: 126.49 }, // Línea horizontal que divide a la mitad
      elementos: [
        { tipo: 'rect', x: -17.58, y: -23.16, width: 157.29, height: 299.30, esBorde: true },
        { tipo: 'rect', x: 24.42, y: -22.73, width: 72, height: 58, esLlave: true, key: 'cancha1_llaveSup' },
        { tipo: 'rect', x: 24.42, y: 219.86, width: 71.57, height: 55.86, esLlave: true, key: 'cancha1_llaveInf' },
        { tipo: 'path', d: 'M 39 58 A 36 36 0 0 0 111 58', tx: -14.58, ty: -25.30, key: 'cancha1_semiSup' },
        { tipo: 'path', d: 'M 39 222 A 36 36 0 0 1 111 222', tx: -15.01, ty: -1.72, key: 'cancha1_semiInf' },
        { tipo: 'path', d: 'M 6 0 L 6 30 Q 6 90 75 95 Q 144 90 144 30 L 144 0', tx: -14.58, ty: -21.87, key: 'cancha1_arcoSup' },
        { tipo: 'path', d: 'M 6 280 L 6 250 Q 6 190 75 185 Q 144 190 144 250 L 144 280', tx: -14.15, ty: -4.72, key: 'cancha1_arcoInf' },
      ]
    },
    cancha2: {
      nombre: "Anexa 2",
      hitArea: { x: 153, y: -23.16, width: 163.29, height: 299.30 },
      lineaCentral: { x1: 153, y1: 126.49, x2: 316.29, y2: 126.49 }, // Línea horizontal que divide a la mitad
      elementos: [
        { tipo: 'rect', x: 153, y: -23.16, width: 163.29, height: 299.30, esBorde: true },
        { tipo: 'rect', x: 196.72, y: -23.16, width: 72, height: 58.43, esLlave: true, key: 'cancha2_llaveSup' },
        { tipo: 'rect', x: 197.58, y: 219.86, width: 72, height: 55.86, esLlave: true, key: 'cancha2_llaveInf' },
        { tipo: 'path', d: 'M 189 58 A 36 36 0 0 0 261 58', tx: 7.72, ty: -26.16, key: 'cancha2_semiSup' },
        { tipo: 'path', d: 'M 189 222 A 36 36 0 0 1 261 222', tx: 8.58, ty: -1.29, key: 'cancha2_semiInf' },
        { tipo: 'path', d: 'M 156 0 L 156 30 Q 156 90 225 95 Q 294 90 294 30 L 294 0', tx: 7.72, ty: -22.30, key: 'cancha2_arcoSup' },
        { tipo: 'path', d: 'M 156 280 L 156 250 Q 156 190 225 185 Q 294 190 294 250 L 294 280', tx: 8.58, ty: -4.72, key: 'cancha2_arcoInf' },
      ]
    },
    cancha3: {
      nombre: "Campo Principal",
      hitArea: { x: -61.89, y: 34.98, width: 425.49, height: 184.73 },
      lineaCentral: { x1: 150.36, y1: 34.98, x2: 150.36, y2: 219.71 }, // Línea vertical que divide a la mitad
      elementos: [
        { tipo: 'rect', x: -61.89, y: 34.98, width: 425.49, height: 184.73, esBorde: true },
        { tipo: 'circle', cx: 145.71, cy: 138.71, r: 18, key: 'cancha3_circulo' },
        { tipo: 'rect', x: -61.89, y: 91.99, width: 58, height: 72, esLlave: true, key: 'cancha3_llaveIzq' },
        { tipo: 'rect', x: 307.88, y: 91.56, width: 55, height: 71.57, esLlave: true, key: 'cancha3_llaveDer' },
        { tipo: 'path', d: 'M 48 104 A 36 36 0 0 1 48 176', tx: -54.46, ty: -12.01, key: 'cancha3_semiIzq' },
        { tipo: 'path', d: 'M 262 104 A 36 36 0 0 0 262 176', tx: 46.74, ty: -12.44, key: 'cancha3_semiDer' },
        { tipo: 'path', d: 'M -10 71 L 20 71 Q 80 71 85 140 Q 80 209 20 209 L -10 209', tx: -51.03, ty: -11.58, key: 'cancha3_arcoIzq' },
        { tipo: 'path', d: 'M 320 71 L 290 71 Q 230 71 225 140 Q 230 209 290 209 L 320 209', tx: 43.31, ty: -11.15, key: 'cancha3_arcoDer' },
      ]
    }
  };

  const renderElemento = (elem, index, isHovered, canchaId) => {
    if (elem.key && !elementosVisibles[elem.key]) return null;

    const strokeColor = isHovered ? '#ffffff' : '#333333';
    const strokeWidth = 2.5;

    const baseProps = {
      key: `${canchaId}-${index}`,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      fill: 'none',
      style: { transition: 'all 0.3s ease' }
    };

    if (elem.tipo === 'rect') {
      let fillColor = 'none';
      if (isHovered) {
        if (elem.esBorde) fillColor = '#1a1a1a';
        else if (elem.esLlave) fillColor = '#dc2626';
      }
      return (
        <rect {...baseProps} x={elem.x} y={elem.y} width={elem.width} height={elem.height} fill={fillColor} />
      );
    } else if (elem.tipo === 'circle') {
      return (
        <circle {...baseProps} cx={elem.cx} cy={elem.cy} r={elem.r} />
      );
    } else if (elem.tipo === 'path') {
      return (
        <path {...baseProps} d={elem.d} transform={`translate(${elem.tx || 0}, ${elem.ty || 0})`} />
      );
    }
    return null;
  };

  const handleCanchaClick = (canchaId) => {
    if (modoEdicion) {
      setCanchaEditando(canchaId);
    } else if (isMobile) {
      setCanchaSeleccionada(canchaSeleccionada === canchaId ? null : canchaId);
    }
  };

  const renderCancha = (canchaId, cancha) => {
    // En móvil usar canchaSeleccionada, en desktop usar canchaHover
    const isActive = modoEdicion
      ? (canchaEditando === canchaId)
      : isMobile
        ? (canchaSeleccionada === canchaId)
        : (canchaHover === canchaId);

    const hayOtraActiva = modoEdicion
      ? (canchaEditando !== canchaId)
      : isMobile
        ? (canchaSeleccionada !== null && canchaSeleccionada !== canchaId)
        : (canchaHover !== null && canchaHover !== canchaId);

    const logoX = cancha.hitArea.x + cancha.hitArea.width / 2 - logoSize / 2 + logoPos.x;
    const logoY = cancha.hitArea.y + cancha.hitArea.height / 2 - logoSize / 2 + logoPos.y;

    return (
      <g
        key={canchaId}
        onMouseEnter={() => !modoEdicion && !isMobile && setCanchaHover(canchaId)}
        onMouseLeave={() => !modoEdicion && !isMobile && setCanchaHover(null)}
        onClick={() => handleCanchaClick(canchaId)}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleCanchaClick(canchaId);
        }}
        style={{
          opacity: hayOtraActiva ? 0.2 : 1,
          transition: 'opacity 0.3s ease',
          cursor: 'pointer',
        }}
      >
        <rect
          x={cancha.hitArea.x}
          y={cancha.hitArea.y}
          width={cancha.hitArea.width}
          height={cancha.hitArea.height}
          fill="transparent"
        />

        {cancha.elementos.map((elem, index) => renderElemento(elem, index, isActive, canchaId))}

        {/* Línea central - se renderiza antes del logo para que el logo quede encima */}
        {isActive && cancha.lineaCentral && (
          <line
            x1={cancha.lineaCentral.x1}
            y1={cancha.lineaCentral.y1}
            x2={cancha.lineaCentral.x2}
            y2={cancha.lineaCentral.y2}
            stroke="#ffffff"
            strokeWidth={2.5}
            style={{ transition: 'all 0.3s ease' }}
          />
        )}

        {/* Logo y texto - se renderizan después para quedar encima de la línea */}
        {isActive && (
          <>
            <image
              href={logo}
              x={logoX}
              y={logoY}
              width={logoSize}
              height={logoSize}
              style={{
                cursor: modoEdicion ? 'move' : 'default',
                pointerEvents: modoEdicion ? 'auto' : 'none'
              }}
              onMouseDown={(e) => modoEdicion && handleMouseDown(e, 'logo')}
            />
            <text
              x={cancha.hitArea.x + cancha.hitArea.width / 2}
              y={cancha.hitArea.y + cancha.hitArea.height / 2 + logoSize / 2 + 20}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize="20"
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              {cancha.nombre}
            </text>
          </>
        )}
      </g>
    );
  };

  const elementosPorCancha = {
    cancha1: [
      { key: 'cancha1_llaveSup', label: 'Llave superior' },
      { key: 'cancha1_llaveInf', label: 'Llave inferior' },
      { key: 'cancha1_semiSup', label: 'Semicírculo superior' },
      { key: 'cancha1_semiInf', label: 'Semicírculo inferior' },
      { key: 'cancha1_arcoSup', label: 'Arco 3pts superior' },
      { key: 'cancha1_arcoInf', label: 'Arco 3pts inferior' },
    ],
    cancha2: [
      { key: 'cancha2_llaveSup', label: 'Llave superior' },
      { key: 'cancha2_llaveInf', label: 'Llave inferior' },
      { key: 'cancha2_semiSup', label: 'Semicírculo superior' },
      { key: 'cancha2_semiInf', label: 'Semicírculo inferior' },
      { key: 'cancha2_arcoSup', label: 'Arco 3pts superior' },
      { key: 'cancha2_arcoInf', label: 'Arco 3pts inferior' },
    ],
    cancha3: [
      { key: 'cancha3_circulo', label: 'Círculo central' },
      { key: 'cancha3_llaveIzq', label: 'Llave izquierda' },
      { key: 'cancha3_llaveDer', label: 'Llave derecha' },
      { key: 'cancha3_semiIzq', label: 'Semicírculo izquierdo' },
      { key: 'cancha3_semiDer', label: 'Semicírculo derecho' },
      { key: 'cancha3_arcoIzq', label: 'Arco 3pts izquierdo' },
      { key: 'cancha3_arcoDer', label: 'Arco 3pts derecho' },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-100 py-4 md:py-8">
      <div className="container mx-auto px-2 md:px-4">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-3 md:mb-4">Nuestras Canchas</h1>

        <div className="flex justify-center mb-3 md:mb-4">
          <button
            onClick={() => setModoEdicion(!modoEdicion)}
            className={`px-3 md:px-4 py-2 rounded font-medium text-sm md:text-base ${modoEdicion ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}
          >
            {modoEdicion ? 'Modo Edicion ON' : 'Activar Edicion'}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 md:gap-4 justify-center">
          {modoEdicion && (
            <div className="bg-white rounded-lg shadow-lg p-3 md:p-4 lg:w-72 max-h-[400px] md:max-h-[600px] overflow-y-auto order-2 lg:order-1">
              <h3 className="font-bold mb-2 md:mb-3 text-sm md:text-base">Cancha a editar</h3>
              <div className="flex gap-1 md:gap-2 mb-3 md:mb-4 flex-wrap">
                {['cancha1', 'cancha2', 'cancha3'].map(c => (
                  <button
                    key={c}
                    onClick={() => setCanchaEditando(c)}
                    className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm ${canchaEditando === c ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    {c === 'cancha1' ? 'Anexa 1' : c === 'cancha2' ? 'Anexa 2' : 'Principal'}
                  </button>
                ))}
              </div>

              <h3 className="font-bold mb-2 text-sm md:text-base">Elementos de {canchaEditando === 'cancha1' ? 'Anexa 1' : canchaEditando === 'cancha2' ? 'Anexa 2' : 'Campo Principal'}</h3>
              <div className="space-y-1 mb-3 md:mb-4">
                {elementosPorCancha[canchaEditando]?.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-xs md:text-sm">
                    <input
                      type="checkbox"
                      checked={elementosVisibles[key]}
                      onChange={() => toggleElemento(key)}
                      className="w-4 h-4"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <h3 className="font-bold mb-2 text-sm md:text-base">Logo</h3>
              <p className="text-xs text-gray-500 mb-2">Arrastra el logo en la cancha seleccionada</p>

              <div className="space-y-2 text-xs md:text-sm">
                <div className="flex items-center gap-2">
                  <span>Tamano:</span>
                  <input
                    type="range"
                    min="40"
                    max="150"
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span>{logoSize}px</span>
                </div>
                <div className="text-xs text-gray-500">
                  <p>X: {logoPos.x.toFixed(1)} | Y: {logoPos.y.toFixed(1)}</p>
                </div>
                <button
                  onClick={() => { setLogoPos({ x: 0, y: -10 }); setLogoSize(80); }}
                  className="px-3 py-1 bg-gray-200 rounded text-xs md:text-sm"
                >
                  Resetear logo
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg p-2 md:p-6 order-1 lg:order-2">
            <svg
              ref={svgRef}
              viewBox="-80 -40 460 320"
              className="w-full max-w-4xl touch-none"
              style={{ minHeight: isMobile ? '280px' : '500px' }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={(e) => {
                if (arrastrando && modoEdicion) {
                  e.preventDefault();
                  const touch = e.touches[0];
                  handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
                }
              }}
              onTouchEnd={handleMouseUp}
            >
              <rect x="-80" y="-40" width="460" height="320" fill="#e5e5e5" />
              {renderCancha('cancha1', canchas.cancha1)}
              {renderCancha('cancha2', canchas.cancha2)}
              {renderCancha('cancha3', canchas.cancha3)}
            </svg>

            {!modoEdicion && (
              <p className="text-center text-gray-500 mt-2 md:mt-4 text-xs md:text-sm px-2">
                {isMobile
                  ? 'Toca una cancha para ver detalles'
                  : 'Pasa el mouse sobre una cancha para ver mas detalles'
                }
              </p>
            )}

            {/* Botones de seleccion rapida en movil */}
            {isMobile && !modoEdicion && (
              <div className="flex justify-center gap-2 mt-3 flex-wrap">
                {['cancha1', 'cancha2', 'cancha3'].map(c => (
                  <button
                    key={c}
                    onClick={() => setCanchaSeleccionada(canchaSeleccionada === c ? null : c)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      canchaSeleccionada === c
                        ? 'bg-black text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {c === 'cancha1' ? 'Anexa 1' : c === 'cancha2' ? 'Anexa 2' : 'Principal'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampoPage;
