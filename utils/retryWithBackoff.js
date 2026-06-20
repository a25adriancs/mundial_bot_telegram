/**
 * Reintenta una función con backoff exponencial.
 * Útil para rate limiting o fallos temporales de la API.
 */

const DEFAULT_RETRIES = 3;
const DEFAULT_BASE_MS = 1000;

/**
 * @param {Function} fn - Función async a ejecutar
 * @param {Object} options
 * @param {number} options.retries - Máximo de reintentos
 * @param {number} options.baseMs - Delay base en ms
 * @returns {Promise<any>}
 */
async function retryWithBackoff(fn, { retries = DEFAULT_RETRIES, baseMs = DEFAULT_BASE_MS } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isRateLimit = error.message?.includes('RATE_LIMIT');
      const isNetwork = error.message?.includes('fetch') || error.code === 'ECONNRESET';

      if (!isRateLimit && !isNetwork && attempt === retries) {
        throw error;
      }

      const delay = baseMs * Math.pow(2, attempt) * (isRateLimit ? 2 : 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

module.exports = { retryWithBackoff };