/**
 * HTTP client base para la API de worldcup26.ir.
 * Maneja headers, errores HTTP y rate limiting básico.
 */

const BASE_URL = 'https://worldcup26.ir';

/**
 * @param {string} path - Ruta relativa (ej: '/get/games')
 * @param {Object} options - Opciones adicionales de fetch
 * @returns {Promise<Object>} JSON parseado
 */
async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 429) {
    throw new Error(`RATE_LIMIT: ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

module.exports = { apiFetch };