import { useState, useRef, useEffect } from 'react';
import logo from '../assets/images/logo.png';
import { useAuth } from '../context/AuthContext';
import { PRECIOS } from '../utils/preciosCalculator';

const CampoPage = () => {
  const { isAdmin, esSocio, isAuthenticated } = useAuth();
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

  // Estados para el editor de cuadrícula
  const [mostrarCuadricula, setMostrarCuadricula] = useState(false);
  const [colorSeleccionado, setColorSeleccionado] = useState('#808080');
  const [coloresCeldas, setColoresCeldas] = useState({});
  const [mostrarMedidas, setMostrarMedidas] = useState(true);
  const [herramienta, setHerramienta] = useState('pintar'); // 'pintar' o 'borrar'
  const [pintando, setPintando] = useState(false); // Para pintar arrastrando
  const [disenoGuardado, setDisenoGuardado] = useState(null); // Diseño que reemplaza las canchas

  // Estados para líneas y arcos
  const [bordesPintados, setBordesPintados] = useState({}); // {"h-fila-col": "#color", "v-fila-col": "#color"}
  const [arcosPersonalizados, setArcosPersonalizados] = useState([]); // [{id, cx, cy, radio, anguloInicio, anguloFin, color, grosor}]
  const [modoPintado, setModoPintado] = useState('celdas'); // 'celdas' | 'lineas' | 'arcos'
  const [arcoEnEdicion, setArcoEnEdicion] = useState(null); // Arco siendo configurado

  // Dimensiones reales del campo en metros
  const ANCHO_METROS = 34;
  const ALTO_METROS = 24;

  // Configuración del SVG y escala
  const SVG_CONFIG = {
    viewBox: { x: -80, y: -40, width: 460, height: 320 },
    // Escala: unidades SVG por metro
    escalaX: 460 / ANCHO_METROS,  // ~13.53 unidades/metro
    escalaY: 320 / ALTO_METROS,   // ~13.33 unidades/metro
  };

  // Paleta de colores disponibles
  const PALETA_COLORES = [
    { color: '#808080', nombre: 'Gris' },
    { color: '#dc2626', nombre: 'Rojo' },
    { color: '#000000', nombre: 'Negro' },
    { color: '#ffffff', nombre: 'Blanco' },
  ];

  // Detectar si es móvil (solo por ancho de pantalla, no por touch)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
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
        if (config.coloresCeldas) setColoresCeldas(config.coloresCeldas);
        if (config.disenoGuardado) setDisenoGuardado(config.disenoGuardado);
        if (config.bordesPintados) setBordesPintados(config.bordesPintados);
        if (config.arcosPersonalizados) setArcosPersonalizados(config.arcosPersonalizados);
      } catch {
        // Error silenciado en producción
      }
    }
    setCargado(true);
  }, []);

  // Guardar en localStorage solo después de cargar
  useEffect(() => {
    if (cargado) {
      localStorage.setItem('campoConfig3', JSON.stringify({
        logoPos, logoSize, elementosVisibles, coloresCeldas, disenoGuardado,
        bordesPintados, arcosPersonalizados
      }));
    }
  }, [logoPos, logoSize, elementosVisibles, coloresCeldas, disenoGuardado, bordesPintados, arcosPersonalizados, cargado]);

  // Función para manejar clic/arrastre en celda de la cuadrícula
  const handleCeldaClick = (fila, columna) => {
    const key = `${fila}-${columna}`;
    if (herramienta === 'borrar') {
      setColoresCeldas(prev => {
        const nuevo = { ...prev };
        delete nuevo[key];
        return nuevo;
      });
    } else {
      setColoresCeldas(prev => ({
        ...prev,
        [key]: colorSeleccionado
      }));
    }
  };

  const handleCeldaMouseDown = (fila, columna) => {
    setPintando(true);
    handleCeldaClick(fila, columna);
  };

  const handleCeldaMouseEnter = (fila, columna) => {
    if (pintando) {
      handleCeldaClick(fila, columna);
    }
  };

  const handleMouseUpGlobal = () => {
    setPintando(false);
  };

  // Función para manejar clic en bordes
  const handleBordeClick = (tipo, fila, columna) => {
    const key = `${tipo}-${fila}-${columna}`;
    if (herramienta === 'borrar') {
      setBordesPintados(prev => {
        const nuevo = { ...prev };
        delete nuevo[key];
        return nuevo;
      });
    } else {
      setBordesPintados(prev => ({
        ...prev,
        [key]: colorSeleccionado
      }));
    }
  };

  // Función para generar path de un arco SVG
  const generarPathArco = (arco) => {
    const { cx, cy, radio, anguloInicio, anguloFin } = arco;

    // Convertir metros a coordenadas SVG
    const cxSVG = SVG_CONFIG.viewBox.x + cx * SVG_CONFIG.escalaX;
    const cySVG = SVG_CONFIG.viewBox.y + cy * SVG_CONFIG.escalaY;
    const radioSVG = radio * ((SVG_CONFIG.escalaX + SVG_CONFIG.escalaY) / 2);

    // Convertir ángulos a radianes
    const inicioRad = (anguloInicio * Math.PI) / 180;
    const finRad = (anguloFin * Math.PI) / 180;

    // Calcular puntos de inicio y fin del arco
    const x1 = cxSVG + radioSVG * Math.cos(inicioRad);
    const y1 = cySVG + radioSVG * Math.sin(inicioRad);
    const x2 = cxSVG + radioSVG * Math.cos(finRad);
    const y2 = cySVG + radioSVG * Math.sin(finRad);

    // Determinar si el arco es mayor a 180 grados
    const largeArc = Math.abs(anguloFin - anguloInicio) > 180 ? 1 : 0;

    // Dirección del arco (1 = sentido horario)
    const sweep = anguloFin > anguloInicio ? 1 : 0;

    return `M ${x1} ${y1} A ${radioSVG} ${radioSVG} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
  };

  // Función para añadir un arco
  const agregarArco = (preset = null) => {
    const nuevoArco = preset || {
      id: `arco-${Date.now()}`,
      cx: 17,
      cy: 12,
      radio: 3,
      anguloInicio: 0,
      anguloFin: 180,
      color: colorSeleccionado,
      grosor: 3
    };
    setArcosPersonalizados(prev => [...prev, nuevoArco]);
    setArcoEnEdicion(nuevoArco.id);
  };

  // Función para actualizar un arco
  const actualizarArco = (id, cambios) => {
    setArcosPersonalizados(prev =>
      prev.map(arco => arco.id === id ? { ...arco, ...cambios } : arco)
    );
  };

  // Función para eliminar un arco
  const eliminarArco = (id) => {
    setArcosPersonalizados(prev => prev.filter(arco => arco.id !== id));
    if (arcoEnEdicion === id) setArcoEnEdicion(null);
  };

  // Presets de arcos comunes
  const PRESETS_ARCOS = [
    {
      nombre: 'Semicírculo tiro libre',
      arco: { radio: 1.8, anguloInicio: -90, anguloFin: 90 }
    },
    {
      nombre: 'Línea 3 puntos',
      arco: { radio: 6.75, anguloInicio: -90, anguloFin: 90 }
    },
    {
      nombre: 'Círculo central',
      arco: { radio: 1.8, anguloInicio: 0, anguloFin: 360 }
    },
    {
      nombre: 'Arco superior',
      arco: { radio: 4, anguloInicio: 180, anguloFin: 360 }
    },
    {
      nombre: 'Arco inferior',
      arco: { radio: 4, anguloInicio: 0, anguloFin: 180 }
    }
  ];

  // Función para limpiar toda la cuadrícula
  const limpiarCuadricula = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar todo el diseño (celdas, líneas y arcos)?')) {
      setColoresCeldas({});
      setBordesPintados({});
      setArcosPersonalizados([]);
      setArcoEnEdicion(null);
    }
  };

  // Función para guardar el diseño actual como el principal
  const guardarDiseno = () => {
    const tieneCeldas = Object.keys(coloresCeldas).length > 0;
    const tieneLineas = Object.keys(bordesPintados).length > 0;
    const tieneArcos = arcosPersonalizados.length > 0;

    if (!tieneCeldas && !tieneLineas && !tieneArcos) {
      alert('No hay nada que guardar. Pinta algunas celdas, líneas o crea arcos primero.');
      return;
    }
    if (window.confirm('¿Guardar este diseño? Reemplazará las canchas actuales.')) {
      setDisenoGuardado({
        celdas: { ...coloresCeldas },
        bordes: { ...bordesPintados },
        arcos: [...arcosPersonalizados]
      });
      setMostrarCuadricula(false);
    }
  };

  // Función para restaurar las canchas originales
  const restaurarOriginal = () => {
    if (window.confirm('¿Restaurar las canchas originales? Se eliminará tu diseño guardado.')) {
      setDisenoGuardado(null);
    }
  };

  // Función para cargar el diseño predefinido (basado en image.png)
  const cargarDisenoPredefinido = () => {
    const diseno = {};

    // Primero: pintar todo el borde exterior de ROJO (zonas fuera del campo de juego)
    // Borde superior (filas 0-4)
    for (let fila = 0; fila < 5; fila++) {
      for (let col = 0; col < ANCHO_METROS; col++) {
        diseno[`${fila}-${col}`] = '#dc2626';
      }
    }
    // Borde inferior (filas 19-23)
    for (let fila = 19; fila < ALTO_METROS; fila++) {
      for (let col = 0; col < ANCHO_METROS; col++) {
        diseno[`${fila}-${col}`] = '#dc2626';
      }
    }
    // Borde izquierdo (columnas 0-2, filas 5-18)
    for (let fila = 5; fila < 19; fila++) {
      for (let col = 0; col < 3; col++) {
        diseno[`${fila}-${col}`] = '#dc2626';
      }
    }
    // Borde derecho (columnas 31-33, filas 5-18)
    for (let fila = 5; fila < 19; fila++) {
      for (let col = 31; col < ANCHO_METROS; col++) {
        diseno[`${fila}-${col}`] = '#dc2626';
      }
    }

    // Segundo: pintar el interior de NEGRO (base del campo)
    for (let fila = 5; fila < 19; fila++) {
      for (let col = 3; col < 31; col++) {
        diseno[`${fila}-${col}`] = '#000000';
      }
    }

    // Tercero: pintar las 3 CANCHAS de GRIS
    // Cancha Anexa 1 (izquierda, vertical) - columnas 3-13, filas 5-18
    for (let fila = 5; fila < 19; fila++) {
      for (let col = 3; col < 13; col++) {
        diseno[`${fila}-${col}`] = '#808080';
      }
    }

    // Cancha Anexa 2 (derecha, vertical) - columnas 21-31, filas 5-18
    for (let fila = 5; fila < 19; fila++) {
      for (let col = 21; col < 31; col++) {
        diseno[`${fila}-${col}`] = '#808080';
      }
    }

    // Cancha Principal (centro, horizontal) - columnas 6-27, filas 8-15
    for (let fila = 8; fila < 16; fila++) {
      for (let col = 6; col < 28; col++) {
        diseno[`${fila}-${col}`] = '#808080';
      }
    }

    setColoresCeldas(diseno);
  };

  // Función para editar el diseño guardado
  const editarDiseno = () => {
    if (disenoGuardado) {
      // Compatibilidad con formato antiguo (solo celdas) y nuevo (objeto con celdas, bordes, arcos)
      if (disenoGuardado.celdas) {
        setColoresCeldas({ ...disenoGuardado.celdas });
        setBordesPintados({ ...disenoGuardado.bordes } || {});
        setArcosPersonalizados([...disenoGuardado.arcos] || []);
      } else {
        // Formato antiguo: disenoGuardado es directamente las celdas
        setColoresCeldas({ ...disenoGuardado });
      }
    }
    setMostrarCuadricula(true);
  };

  // Renderizar la cuadrícula con medidas
  const renderCuadricula = () => {
    if (!mostrarCuadricula || !modoEdicion) return null;

    const celdas = [];
    const lineasMedida = [];
    const textosMedida = [];

    const anchocelda = SVG_CONFIG.escalaX; // 1 metro en unidades SVG
    const altocelda = SVG_CONFIG.escalaY;

    // Renderizar celdas
    for (let fila = 0; fila < ALTO_METROS; fila++) {
      for (let col = 0; col < ANCHO_METROS; col++) {
        const x = SVG_CONFIG.viewBox.x + col * anchocelda;
        const y = SVG_CONFIG.viewBox.y + fila * altocelda;
        const key = `${fila}-${col}`;
        const colorCelda = coloresCeldas[key];

        const esInteractiva = modoPintado === 'celdas';
        celdas.push(
          <rect
            key={key}
            x={x}
            y={y}
            width={anchocelda}
            height={altocelda}
            fill={colorCelda || 'transparent'}
            fillOpacity={colorCelda ? 0.6 : 0}
            stroke="#666"
            strokeWidth={0.5}
            strokeOpacity={0.5}
            style={{ cursor: esInteractiva ? (herramienta === 'borrar' ? 'crosshair' : 'pointer') : 'default' }}
            onMouseDown={esInteractiva ? () => handleCeldaMouseDown(fila, col) : undefined}
            onMouseEnter={esInteractiva ? () => handleCeldaMouseEnter(fila, col) : undefined}
            onMouseUp={esInteractiva ? handleMouseUpGlobal : undefined}
          />
        );
      }
    }

    // Renderizar medidas si están activas
    if (mostrarMedidas) {
      // Medidas horizontales (cada 5 metros)
      for (let m = 0; m <= ANCHO_METROS; m += 5) {
        const x = SVG_CONFIG.viewBox.x + m * anchocelda;

        // Línea vertical de referencia
        lineasMedida.push(
          <line
            key={`v-${m}`}
            x1={x}
            y1={SVG_CONFIG.viewBox.y - 15}
            x2={x}
            y2={SVG_CONFIG.viewBox.y - 5}
            stroke="#333"
            strokeWidth={1.5}
          />
        );

        // Texto de medida
        textosMedida.push(
          <text
            key={`tv-${m}`}
            x={x}
            y={SVG_CONFIG.viewBox.y - 20}
            textAnchor="middle"
            fontSize="10"
            fill="#333"
            fontWeight="bold"
          >
            {m}m
          </text>
        );
      }

      // Medidas verticales (cada 5 metros)
      for (let m = 0; m <= ALTO_METROS; m += 5) {
        const y = SVG_CONFIG.viewBox.y + m * altocelda;

        // Línea horizontal de referencia
        lineasMedida.push(
          <line
            key={`h-${m}`}
            x1={SVG_CONFIG.viewBox.x - 15}
            y1={y}
            x2={SVG_CONFIG.viewBox.x - 5}
            y2={y}
            stroke="#333"
            strokeWidth={1.5}
          />
        );

        // Texto de medida
        textosMedida.push(
          <text
            key={`th-${m}`}
            x={SVG_CONFIG.viewBox.x - 20}
            y={y + 4}
            textAnchor="end"
            fontSize="10"
            fill="#333"
            fontWeight="bold"
          >
            {m}m
          </text>
        );
      }

      // Línea de dimensión horizontal (arriba)
      lineasMedida.push(
        <line
          key="dim-h"
          x1={SVG_CONFIG.viewBox.x}
          y1={SVG_CONFIG.viewBox.y - 30}
          x2={SVG_CONFIG.viewBox.x + ANCHO_METROS * anchocelda}
          y2={SVG_CONFIG.viewBox.y - 30}
          stroke="#000"
          strokeWidth={1}
          markerStart="url(#arrow)"
          markerEnd="url(#arrow)"
        />
      );
      textosMedida.push(
        <text
          key="dim-h-text"
          x={SVG_CONFIG.viewBox.x + (ANCHO_METROS * anchocelda) / 2}
          y={SVG_CONFIG.viewBox.y - 35}
          textAnchor="middle"
          fontSize="12"
          fill="#000"
          fontWeight="bold"
        >
          {ANCHO_METROS} metros
        </text>
      );

      // Línea de dimensión vertical (izquierda)
      lineasMedida.push(
        <line
          key="dim-v"
          x1={SVG_CONFIG.viewBox.x - 35}
          y1={SVG_CONFIG.viewBox.y}
          x2={SVG_CONFIG.viewBox.x - 35}
          y2={SVG_CONFIG.viewBox.y + ALTO_METROS * altocelda}
          stroke="#000"
          strokeWidth={1}
        />
      );
      textosMedida.push(
        <text
          key="dim-v-text"
          x={SVG_CONFIG.viewBox.x - 45}
          y={SVG_CONFIG.viewBox.y + (ALTO_METROS * altocelda) / 2}
          textAnchor="middle"
          fontSize="12"
          fill="#000"
          fontWeight="bold"
          transform={`rotate(-90, ${SVG_CONFIG.viewBox.x - 45}, ${SVG_CONFIG.viewBox.y + (ALTO_METROS * altocelda) / 2})`}
        >
          {ALTO_METROS} metros
        </text>
      );
    }

    return (
      <g className="cuadricula-editor">
        {celdas}
        {lineasMedida}
        {textosMedida}
      </g>
    );
  };

  // Renderizar el diseño guardado (sin cuadrícula, solo los colores)
  const renderDisenoGuardado = () => {
    if (!disenoGuardado || mostrarCuadricula) return null;

    const elementos = [];
    const anchocelda = SVG_CONFIG.escalaX;
    const altocelda = SVG_CONFIG.escalaY;

    // Obtener celdas (compatibilidad con formato antiguo y nuevo)
    const celdasData = disenoGuardado.celdas || disenoGuardado;
    const bordesData = disenoGuardado.bordes || {};
    const arcosData = disenoGuardado.arcos || [];

    // Renderizar celdas
    Object.entries(celdasData).forEach(([key, color]) => {
      if (key === 'celdas' || key === 'bordes' || key === 'arcos') return; // Saltar propiedades del nuevo formato
      const [fila, col] = key.split('-').map(Number);
      const x = SVG_CONFIG.viewBox.x + col * anchocelda;
      const y = SVG_CONFIG.viewBox.y + fila * altocelda;

      elementos.push(
        <rect
          key={`celda-${key}`}
          x={x}
          y={y}
          width={anchocelda}
          height={altocelda}
          fill={color}
          fillOpacity={0.85}
        />
      );
    });

    // Renderizar bordes guardados
    Object.entries(bordesData).forEach(([key, color]) => {
      const partes = key.split('-');
      const tipo = partes[0]; // 'h' o 'v'
      const fila = parseInt(partes[1]);
      const col = parseInt(partes[2]);

      if (tipo === 'h') {
        // Borde horizontal (superior de la celda)
        const x1 = SVG_CONFIG.viewBox.x + col * anchocelda;
        const y1 = SVG_CONFIG.viewBox.y + fila * altocelda;
        const x2 = x1 + anchocelda;

        elementos.push(
          <line
            key={`borde-${key}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y1}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      } else if (tipo === 'v') {
        // Borde vertical (izquierdo de la celda)
        const x1 = SVG_CONFIG.viewBox.x + col * anchocelda;
        const y1 = SVG_CONFIG.viewBox.y + fila * altocelda;
        const y2 = y1 + altocelda;

        elementos.push(
          <line
            key={`borde-${key}`}
            x1={x1}
            y1={y1}
            x2={x1}
            y2={y2}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      }
    });

    // Renderizar arcos guardados
    arcosData.forEach((arco) => {
      elementos.push(
        <path
          key={`arco-${arco.id}`}
          d={generarPathArco(arco)}
          stroke={arco.color}
          strokeWidth={arco.grosor || 3}
          fill="none"
          strokeLinecap="round"
        />
      );
    });

    return <g className="diseno-guardado">{elementos}</g>;
  };

  // Renderizar bordes pintados (en modo edición)
  const renderBordesPintados = () => {
    if (!mostrarCuadricula || !modoEdicion) return null;

    const lineas = [];
    const anchocelda = SVG_CONFIG.escalaX;
    const altocelda = SVG_CONFIG.escalaY;

    Object.entries(bordesPintados).forEach(([key, color]) => {
      const partes = key.split('-');
      const tipo = partes[0]; // 'h' o 'v'
      const fila = parseInt(partes[1]);
      const col = parseInt(partes[2]);

      if (tipo === 'h') {
        // Borde horizontal (superior de la celda)
        const x1 = SVG_CONFIG.viewBox.x + col * anchocelda;
        const y1 = SVG_CONFIG.viewBox.y + fila * altocelda;
        const x2 = x1 + anchocelda;

        lineas.push(
          <line
            key={key}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y1}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      } else if (tipo === 'v') {
        // Borde vertical (izquierdo de la celda)
        const x1 = SVG_CONFIG.viewBox.x + col * anchocelda;
        const y1 = SVG_CONFIG.viewBox.y + fila * altocelda;
        const y2 = y1 + altocelda;

        lineas.push(
          <line
            key={key}
            x1={x1}
            y1={y1}
            x2={x1}
            y2={y2}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      }
    });

    return <g className="bordes-pintados">{lineas}</g>;
  };

  // Renderizar zonas de hit para bordes (invisibles, solo para capturar eventos)
  const renderZonasBordes = () => {
    if (!mostrarCuadricula || !modoEdicion || modoPintado !== 'lineas') return null;

    const zonas = [];
    const anchocelda = SVG_CONFIG.escalaX;
    const altocelda = SVG_CONFIG.escalaY;
    const grosorZona = 6; // Ancho de la zona clickeable

    // Bordes horizontales
    for (let fila = 0; fila <= ALTO_METROS; fila++) {
      for (let col = 0; col < ANCHO_METROS; col++) {
        const x = SVG_CONFIG.viewBox.x + col * anchocelda;
        const y = SVG_CONFIG.viewBox.y + fila * altocelda - grosorZona / 2;
        const key = `h-${fila}-${col}`;
        const tieneBorde = bordesPintados[key];

        zonas.push(
          <rect
            key={`zona-${key}`}
            x={x}
            y={y}
            width={anchocelda}
            height={grosorZona}
            fill={tieneBorde ? 'transparent' : 'rgba(100, 150, 255, 0.3)'}
            style={{ cursor: herramienta === 'borrar' ? 'crosshair' : 'pointer' }}
            onMouseDown={() => handleBordeClick('h', fila, col)}
            onMouseEnter={(e) => {
              if (e.buttons === 1) handleBordeClick('h', fila, col);
            }}
          />
        );
      }
    }

    // Bordes verticales
    for (let fila = 0; fila < ALTO_METROS; fila++) {
      for (let col = 0; col <= ANCHO_METROS; col++) {
        const x = SVG_CONFIG.viewBox.x + col * anchocelda - grosorZona / 2;
        const y = SVG_CONFIG.viewBox.y + fila * altocelda;
        const key = `v-${fila}-${col}`;
        const tieneBorde = bordesPintados[key];

        zonas.push(
          <rect
            key={`zona-${key}`}
            x={x}
            y={y}
            width={grosorZona}
            height={altocelda}
            fill={tieneBorde ? 'transparent' : 'rgba(100, 150, 255, 0.3)'}
            style={{ cursor: herramienta === 'borrar' ? 'crosshair' : 'pointer' }}
            onMouseDown={() => handleBordeClick('v', fila, col)}
            onMouseEnter={(e) => {
              if (e.buttons === 1) handleBordeClick('v', fila, col);
            }}
          />
        );
      }
    }

    return <g className="zonas-bordes">{zonas}</g>;
  };

  // Renderizar arcos personalizados (en modo edición)
  const renderArcosPersonalizados = () => {
    if (!mostrarCuadricula || !modoEdicion) return null;

    return (
      <g className="arcos-personalizados">
        {arcosPersonalizados.map((arco) => (
          <path
            key={arco.id}
            d={generarPathArco(arco)}
            stroke={arco.color}
            strokeWidth={arco.grosor || 3}
            fill="none"
            strokeLinecap="round"
            style={{
              cursor: modoPintado === 'arcos' ? 'pointer' : 'default',
              filter: arcoEnEdicion === arco.id ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.8))' : 'none'
            }}
            onClick={() => modoPintado === 'arcos' && setArcoEnEdicion(arco.id)}
          />
        ))}
      </g>
    );
  };

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
    <div className="bg-gray-100 min-h-full py-4 md:py-8">
      <div className="px-2 md:px-4 relative">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-3 md:mb-4">Nuestras Canchas</h1>

        {isAdmin() && (
          <div className="flex justify-center mb-3 md:mb-4">
            <button
              onClick={() => setModoEdicion(!modoEdicion)}
              className={`px-3 md:px-4 py-2 rounded font-medium text-sm md:text-base ${modoEdicion ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}
            >
              {modoEdicion ? 'Modo Edicion ON' : 'Activar Edicion'}
            </button>
          </div>
        )}

        {/* Tabla de precios - Posición absoluta en desktop */}
        {!modoEdicion && (
          <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-[12%] xl:right-[15%] bg-white rounded-lg shadow-lg p-3 z-10">
            <h3 className="text-xs font-bold text-center mb-3 tracking-tight uppercase text-gray-700">
              Tarifas/hora
            </h3>

            {isAuthenticated() && esSocio() && (
              <div className="mb-2 px-2 py-1 bg-black text-white text-center text-[10px] font-medium">
                ERES SOCIO
              </div>
            )}

            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-1 pr-3 font-semibold text-gray-600"></th>
                  <th className="text-center py-1 px-2 font-semibold text-gray-600">Regular</th>
                  <th className="text-center py-1 pl-2 font-semibold text-gray-600">Socio</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-semibold text-gray-800">Principal</td>
                  <td className={`text-center py-2 px-2 ${isAuthenticated() && !esSocio() ? 'font-bold text-black' : 'text-gray-500'}`}>
                    S/{PRECIOS.PRINCIPAL.NO_SOCIO}
                  </td>
                  <td className={`text-center py-2 pl-2 ${isAuthenticated() && esSocio() ? 'font-bold text-black' : 'text-gray-500'}`}>
                    S/{PRECIOS.PRINCIPAL.SOCIO}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-semibold text-gray-800">Anexas</td>
                  <td className={`text-center py-2 px-2 ${isAuthenticated() && !esSocio() ? 'font-bold text-black' : 'text-gray-500'}`}>
                    S/{PRECIOS.ANEXA.NO_SOCIO}
                  </td>
                  <td className={`text-center py-2 pl-2 ${isAuthenticated() && esSocio() ? 'font-bold text-black' : 'text-gray-500'}`}>
                    S/{PRECIOS.ANEXA.SOCIO}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

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

              {/* Sección de Cuadrícula y Diseño */}
              <div className="border-t border-gray-200 mt-4 pt-4">
                <h3 className="font-bold mb-3 text-sm md:text-base flex items-center gap-2">
                  Diseñador de Campo
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded">NUEVO</span>
                </h3>

                {/* Toggle cuadrícula */}
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={mostrarCuadricula}
                    onChange={(e) => setMostrarCuadricula(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-xs md:text-sm">Mostrar cuadrícula</span>
                </label>

                {mostrarCuadricula && (
                  <>
                    {/* Toggle medidas */}
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={mostrarMedidas}
                        onChange={(e) => setMostrarMedidas(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs md:text-sm">Mostrar medidas</span>
                    </label>

                    {/* Info de escala */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                      <p className="text-[10px] text-blue-800 font-semibold">ESCALA DEL CAMPO</p>
                      <p className="text-xs text-blue-700">{ANCHO_METROS}m x {ALTO_METROS}m</p>
                      <p className="text-[10px] text-blue-600">Cada cuadro = 1m x 1m</p>
                    </div>

                    {/* Selector de modo de pintado */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold mb-2">Modo de pintado:</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setModoPintado('celdas')}
                          className={`flex-1 px-2 py-1.5 text-xs rounded ${modoPintado === 'celdas' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        >
                          Celdas
                        </button>
                        <button
                          onClick={() => setModoPintado('lineas')}
                          className={`flex-1 px-2 py-1.5 text-xs rounded ${modoPintado === 'lineas' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        >
                          Lineas
                        </button>
                        <button
                          onClick={() => setModoPintado('arcos')}
                          className={`flex-1 px-2 py-1.5 text-xs rounded ${modoPintado === 'arcos' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        >
                          Arcos
                        </button>
                      </div>
                    </div>

                    {/* Herramientas (solo para celdas y lineas) */}
                    {modoPintado !== 'arcos' && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold mb-2">Herramienta:</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setHerramienta('pintar')}
                            className={`flex-1 px-2 py-1.5 text-xs rounded ${herramienta === 'pintar' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                          >
                            Pintar
                          </button>
                          <button
                            onClick={() => setHerramienta('borrar')}
                            className={`flex-1 px-2 py-1.5 text-xs rounded ${herramienta === 'borrar' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
                          >
                            Borrar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Paleta de colores (para celdas y lineas cuando se pinta) */}
                    {modoPintado !== 'arcos' && herramienta === 'pintar' && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold mb-2">Color:</p>
                        <div className="flex gap-2 justify-center">
                          {PALETA_COLORES.map(({ color, nombre }) => (
                            <button
                              key={color}
                              onClick={() => setColorSeleccionado(color)}
                              className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${
                                colorSeleccionado === color ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
                              }`}
                              style={{ backgroundColor: color }}
                              title={nombre}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                          Seleccionado: {PALETA_COLORES.find(p => p.color === colorSeleccionado)?.nombre}
                        </p>
                      </div>
                    )}

                    {/* Instrucciones contextuales */}
                    {modoPintado === 'lineas' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                        <p className="text-[10px] text-yellow-800">
                          Haz clic en los bordes entre celdas para pintar lineas. Las zonas clickeables se resaltan en azul.
                        </p>
                      </div>
                    )}

                    {/* Editor de arcos */}
                    {modoPintado === 'arcos' && (
                      <div className="mb-3 space-y-3">
                        {/* Presets de arcos */}
                        <div>
                          <p className="text-xs font-semibold mb-2">Presets rapidos:</p>
                          <div className="space-y-1">
                            {PRESETS_ARCOS.map((preset, idx) => (
                              <button
                                key={idx}
                                onClick={() => agregarArco({
                                  id: `arco-${Date.now()}`,
                                  cx: 17,
                                  cy: 12,
                                  color: colorSeleccionado,
                                  grosor: 3,
                                  ...preset.arco
                                })}
                                className="w-full px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-left"
                              >
                                + {preset.nombre}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Crear arco personalizado */}
                        <button
                          onClick={() => agregarArco()}
                          className="w-full px-2 py-1.5 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded font-semibold"
                        >
                          + Crear arco personalizado
                        </button>

                        {/* Lista de arcos creados */}
                        {arcosPersonalizados.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-2">Arcos creados ({arcosPersonalizados.length}):</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {arcosPersonalizados.map((arco) => (
                                <div
                                  key={arco.id}
                                  className={`p-2 rounded text-xs border ${arcoEnEdicion === arco.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-3 h-3 rounded-full border border-gray-300"
                                        style={{ backgroundColor: arco.color }}
                                      ></span>
                                      <span
                                        className="cursor-pointer hover:text-blue-600"
                                        onClick={() => setArcoEnEdicion(arcoEnEdicion === arco.id ? null : arco.id)}
                                      >
                                        Arco {arco.id.split('-')[1]?.slice(-4)}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => eliminarArco(arco.id)}
                                      className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                      Eliminar
                                    </button>
                                  </div>

                                  {arcoEnEdicion === arco.id && (
                                    <div className="space-y-2 pt-2 border-t border-gray-200">
                                      {/* Centro X */}
                                      <div className="flex items-center gap-2">
                                        <span className="w-14">Centro X:</span>
                                        <input
                                          type="range"
                                          min="0"
                                          max={ANCHO_METROS}
                                          step="0.5"
                                          value={arco.cx}
                                          onChange={(e) => actualizarArco(arco.id, { cx: parseFloat(e.target.value) })}
                                          className="flex-1"
                                        />
                                        <span className="w-10 text-right">{arco.cx}m</span>
                                      </div>
                                      {/* Centro Y */}
                                      <div className="flex items-center gap-2">
                                        <span className="w-14">Centro Y:</span>
                                        <input
                                          type="range"
                                          min="0"
                                          max={ALTO_METROS}
                                          step="0.5"
                                          value={arco.cy}
                                          onChange={(e) => actualizarArco(arco.id, { cy: parseFloat(e.target.value) })}
                                          className="flex-1"
                                        />
                                        <span className="w-10 text-right">{arco.cy}m</span>
                                      </div>
                                      {/* Radio */}
                                      <div className="flex items-center gap-2">
                                        <span className="w-14">Radio:</span>
                                        <input
                                          type="range"
                                          min="0.5"
                                          max="15"
                                          step="0.25"
                                          value={arco.radio}
                                          onChange={(e) => actualizarArco(arco.id, { radio: parseFloat(e.target.value) })}
                                          className="flex-1"
                                        />
                                        <span className="w-10 text-right">{arco.radio}m</span>
                                      </div>
                                      {/* Angulo inicio */}
                                      <div className="flex items-center gap-2">
                                        <span className="w-14">Inicio:</span>
                                        <input
                                          type="range"
                                          min="-180"
                                          max="360"
                                          step="5"
                                          value={arco.anguloInicio}
                                          onChange={(e) => actualizarArco(arco.id, { anguloInicio: parseInt(e.target.value) })}
                                          className="flex-1"
                                        />
                                        <span className="w-10 text-right">{arco.anguloInicio}°</span>
                                      </div>
                                      {/* Angulo fin */}
                                      <div className="flex items-center gap-2">
                                        <span className="w-14">Fin:</span>
                                        <input
                                          type="range"
                                          min="-180"
                                          max="360"
                                          step="5"
                                          value={arco.anguloFin}
                                          onChange={(e) => actualizarArco(arco.id, { anguloFin: parseInt(e.target.value) })}
                                          className="flex-1"
                                        />
                                        <span className="w-10 text-right">{arco.anguloFin}°</span>
                                      </div>
                                      {/* Grosor */}
                                      <div className="flex items-center gap-2">
                                        <span className="w-14">Grosor:</span>
                                        <input
                                          type="range"
                                          min="1"
                                          max="8"
                                          step="0.5"
                                          value={arco.grosor}
                                          onChange={(e) => actualizarArco(arco.id, { grosor: parseFloat(e.target.value) })}
                                          className="flex-1"
                                        />
                                        <span className="w-10 text-right">{arco.grosor}px</span>
                                      </div>
                                      {/* Color */}
                                      <div className="flex items-center gap-2">
                                        <span className="w-14">Color:</span>
                                        <div className="flex gap-1 flex-1">
                                          {PALETA_COLORES.map(({ color, nombre }) => (
                                            <button
                                              key={color}
                                              onClick={() => actualizarArco(arco.id, { color })}
                                              className={`w-6 h-6 rounded border ${arco.color === color ? 'border-blue-500 ring-1 ring-blue-300' : 'border-gray-300'}`}
                                              style={{ backgroundColor: color }}
                                              title={nombre}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Estadísticas y acciones */}
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-600 mb-1">
                          <span className="font-semibold">Celdas:</span> {Object.keys(coloresCeldas).length}
                        </p>
                        <p className="text-xs text-gray-600 mb-1">
                          <span className="font-semibold">Lineas:</span> {Object.keys(bordesPintados).length}
                        </p>
                        <p className="text-xs text-gray-600 mb-2">
                          <span className="font-semibold">Arcos:</span> {arcosPersonalizados.length}
                        </p>
                        <div className="space-y-1">
                          {PALETA_COLORES.map(({ color, nombre }) => {
                            const cantidadCeldas = Object.values(coloresCeldas).filter(c => c === color).length;
                            const cantidadBordes = Object.values(bordesPintados).filter(c => c === color).length;
                            const cantidadArcos = arcosPersonalizados.filter(a => a.color === color).length;
                            const total = cantidadCeldas + cantidadBordes + cantidadArcos;
                            if (total === 0) return null;
                            return (
                              <div key={color} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded border border-gray-300"
                                    style={{ backgroundColor: color }}
                                  ></span>
                                  <span className="text-gray-600">{nombre}:</span>
                                </div>
                                <span className="font-bold">{total}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Botón Guardar Diseño */}
                      <button
                        onClick={guardarDiseno}
                        className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition-colors"
                      >
                        GUARDAR DISEÑO
                      </button>

                      <button
                        onClick={limpiarCuadricula}
                        className="w-full px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                      >
                        Limpiar todo
                      </button>

                      <button
                        onClick={cargarDisenoPredefinido}
                        className="w-full px-3 py-1.5 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 transition-colors"
                      >
                        Cargar diseño base
                      </button>
                    </div>
                  </>
                )}

                {/* Opciones cuando hay un diseño guardado */}
                {disenoGuardado && !mostrarCuadricula && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Diseño personalizado activo
                    </p>
                    <button
                      onClick={editarDiseno}
                      className="w-full px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                    >
                      Editar diseño
                    </button>
                    <button
                      onClick={restaurarOriginal}
                      className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
                    >
                      Restaurar canchas originales
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg p-2 md:p-6 order-1 lg:order-2">
            <svg
              ref={svgRef}
              viewBox={mostrarCuadricula && mostrarMedidas ? "-130 -60 520 360" : "-80 -40 460 320"}
              className="w-full max-w-4xl touch-none"
              style={{ minHeight: isMobile ? '280px' : '500px' }}
              onMouseMove={handleMouseMove}
              onMouseUp={() => { handleMouseUp(); handleMouseUpGlobal(); }}
              onMouseLeave={() => { handleMouseUp(); handleMouseUpGlobal(); }}
              onTouchMove={(e) => {
                if (arrastrando && modoEdicion) {
                  e.preventDefault();
                  const touch = e.touches[0];
                  handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
                }
              }}
              onTouchEnd={handleMouseUp}
            >
              {/* Definiciones para flechas de medidas */}
              <defs>
                <marker
                  id="arrow"
                  markerWidth="10"
                  markerHeight="10"
                  refX="5"
                  refY="5"
                  orient="auto"
                >
                  <path d="M0,0 L10,5 L0,10 Z" fill="#000" />
                </marker>
              </defs>

              <rect x="-80" y="-40" width="460" height="320" fill={mostrarCuadricula ? '#f5f5f5' : '#e5e5e5'} />

              {/* Cuadrícula de diseño (se renderiza primero para quedar detrás) */}
              {renderCuadricula()}

              {/* Bordes pintados (en modo edición) */}
              {renderBordesPintados()}

              {/* Arcos personalizados (en modo edición) */}
              {renderArcosPersonalizados()}

              {/* Zonas de hit para bordes (invisibles, encima para capturar eventos) */}
              {renderZonasBordes()}

              {/* Mostrar diseño guardado O canchas originales */}
              {!mostrarCuadricula && (
                <>
                  {disenoGuardado ? (
                    // Mostrar el diseño personalizado guardado
                    renderDisenoGuardado()
                  ) : (
                    // Mostrar las canchas originales
                    <>
                      {renderCancha('cancha1', canchas.cancha1)}
                      {renderCancha('cancha2', canchas.cancha2)}
                      {renderCancha('cancha3', canchas.cancha3)}
                    </>
                  )}
                </>
              )}
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

        {/* Tabla de precios - Versión móvil (debajo del visualizador) */}
        {!modoEdicion && (
          <div className="lg:hidden mt-4 flex justify-center">
            <div className="bg-white rounded-lg shadow-lg p-3">
              <h3 className="text-xs font-bold text-center mb-3 tracking-tight uppercase text-gray-700">
                Tarifas/hora
              </h3>

              {isAuthenticated() && esSocio() && (
                <div className="mb-2 px-2 py-1 bg-black text-white text-center text-[10px] font-medium">
                  ERES SOCIO
                </div>
              )}

              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-1 pr-3 font-semibold text-gray-600"></th>
                    <th className="text-center py-1 px-2 font-semibold text-gray-600">Regular</th>
                    <th className="text-center py-1 pl-2 font-semibold text-gray-600">Socio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-semibold text-gray-800">Principal</td>
                    <td className={`text-center py-2 px-2 ${isAuthenticated() && !esSocio() ? 'font-bold text-black' : 'text-gray-500'}`}>
                      S/{PRECIOS.PRINCIPAL.NO_SOCIO}
                    </td>
                    <td className={`text-center py-2 pl-2 ${isAuthenticated() && esSocio() ? 'font-bold text-black' : 'text-gray-500'}`}>
                      S/{PRECIOS.PRINCIPAL.SOCIO}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-semibold text-gray-800">Anexas</td>
                    <td className={`text-center py-2 px-2 ${isAuthenticated() && !esSocio() ? 'font-bold text-black' : 'text-gray-500'}`}>
                      S/{PRECIOS.ANEXA.NO_SOCIO}
                    </td>
                    <td className={`text-center py-2 pl-2 ${isAuthenticated() && esSocio() ? 'font-bold text-black' : 'text-gray-500'}`}>
                      S/{PRECIOS.ANEXA.SOCIO}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampoPage;
