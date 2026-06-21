/**
 * Parsea el campo de goleadores de la API (home_scorers / away_scorers).
 * Devuelve array limpio o null si está corrupto.
 *
 * Formato real observado en la API: string con sintaxis de array de
 * Postgres, ej: {"J. Quiñones 9'","R. Jiménez 67'"} — con llaves
 * exteriores y cada goleador entre comillas dobles.
 */

const { sanitizeText } = require('./sanitizeText');

/**
 * @param {string|null} raw - Valor crudo de la API
 * @returns {Array<string>|null} Lista de goleadores saneados
 */
function parseScorers(raw) {
  if (!raw || raw === 'null') return null;

  let sanitized = sanitizeText(String(raw).trim());
  if (!sanitized) return null;

  // Quitar llaves exteriores tipo array de Postgres: {"a","b"} -> "a","b"
  if (sanitized.startsWith('{') && sanitized.endsWith('}')) {
    sanitized = sanitized.slice(1, -1);
  }

  const scorers = sanitized
    .split(',')
    .map(s => s.trim())
    .map(s => s.replace(/^"(.*)"$/, '$1')) // quita comillas envolventes de cada goleador
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^\(?\?\)?$/) && s.toLowerCase() !== 'null');

  return scorers.length > 0 ? scorers : null;
}

module.exports = { parseScorers };
