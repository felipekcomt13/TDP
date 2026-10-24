/**
 * Búsqueda de productos por código de barras en Open Food Facts
 * (https://world.openfoodfacts.org): base de datos abierta y gratuita, sin API key.
 *
 * Solo sirve para PRE-LLENAR el nombre y la foto al dar de alta un producto
 * que todavía no está en productos_kiosco. No trae precio ni stock, y no tiene
 * todos los productos peruanos (prefijo 775), así que nunca se usa al cobrar:
 * la venta siempre busca en nuestra propia base.
 */

const URL_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const CAMPOS = 'product_name,product_name_es,brands,quantity,image_front_small_url,image_front_url';
const TIMEOUT_MS = 5000;

/**
 * @returns {Promise<{ nombre: string, marca: string, cantidad: string, imagenUrl: string|null } | null>}
 *   null si no lo encuentra, si tarda demasiado o si la API falla.
 */
export const buscarEnOpenFoodFacts = async (codigo) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${URL_BASE}/${encodeURIComponent(codigo)}.json?fields=${CAMPOS}`, {
      signal: controller.signal
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const nombreBase = (p.product_name_es || p.product_name || '').trim();
    const marca = (p.brands || '').split(',')[0].trim();
    const cantidad = (p.quantity || '').trim();

    // Si el nombre ya incluye la marca o la cantidad, no repetirlas
    const partes = [nombreBase];
    if (marca && !nombreBase.toLowerCase().includes(marca.toLowerCase())) partes.unshift(marca);
    if (cantidad && !nombreBase.toLowerCase().includes(cantidad.toLowerCase())) partes.push(cantidad);
    const nombre = partes.filter(Boolean).join(' ');

    if (!nombre) return null;

    return {
      nombre,
      marca,
      cantidad,
      imagenUrl: p.image_front_url || p.image_front_small_url || null
    };
  } catch {
    // Sin conexión, timeout o API caída: el usuario llena los datos a mano
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
