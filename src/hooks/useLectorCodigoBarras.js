import { useEffect, useRef } from 'react';

// Una pistola de códigos (USB o Bluetooth en modo teclado/HID) "teclea" el
// código muy rápido y termina con Enter (o Tab, según cómo esté configurada).
// Distinguimos el escaneo de una persona tecleando por la velocidad: si entre
// una tecla y la siguiente pasan más de MAX_MS_ENTRE_TECLAS, se empieza de cero.
const MAX_MS_ENTRE_TECLAS = 100; // las Bluetooth son algo más lentas que las USB
const LARGO_MINIMO = 4;

const esCampoEditable = (el) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/**
 * Escucha escaneos a nivel de toda la página, sin necesidad de tener un input
 * enfocado (en tablet, enfocar un input abre el teclado en pantalla).
 * Mientras el usuario escribe en un campo de texto, se ignora: ese campo
 * recibe el código normalmente.
 *
 * @param {(codigo: string) => void} onEscaneo
 * @param {{ activo?: boolean }} opciones  activo=false lo pausa (p. ej. con un modal abierto)
 */
export const useLectorCodigoBarras = (onEscaneo, { activo = true } = {}) => {
  // Ref para no re-suscribir el listener cada vez que cambia el callback
  const onEscaneoRef = useRef(onEscaneo);
  useEffect(() => {
    onEscaneoRef.current = onEscaneo;
  }, [onEscaneo]);

  useEffect(() => {
    if (!activo) return;

    let buffer = '';
    let ultimaTecla = 0;

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (esCampoEditable(e.target)) return;

      const ahora = performance.now();
      const rapido = ahora - ultimaTecla <= MAX_MS_ENTRE_TECLAS;
      ultimaTecla = ahora;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (rapido && buffer.length >= LARGO_MINIMO) {
          // Evita que el Enter "presione" el botón que tenga el foco (p. ej. Cobrar)
          e.preventDefault();
          e.stopPropagation();
          const codigo = buffer;
          buffer = '';
          onEscaneoRef.current(codigo);
        } else {
          buffer = '';
        }
        return;
      }

      if (e.key.length !== 1) return; // Shift, flechas, etc.

      buffer = rapido ? buffer + e.key : e.key;
    };

    // Fase de captura: llegamos antes que los botones con foco
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activo]);
};
