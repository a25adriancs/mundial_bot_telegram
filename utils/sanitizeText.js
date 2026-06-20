/**
 * Sanea texto potencialmente corrupto de la API.
 * Detecta codificación rota y devuelve null si no es confiable.
 */

const BROKEN_PATTERN = /[\ufffd]|(\(\?\))|(\?{2,})/;

/**
 * @param {string|null} text - Texto a sanear
 * @returns {string|null} Texto limpio o null si está roto
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return null;
  if (text === 'null') return null;

  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  if (BROKEN_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

module.exports = { sanitizeText };