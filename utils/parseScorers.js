/**
 * Parsea el campo de goleadores de la API (home_scorers / away_scorers).
 * Devuelve array limpio o null si está corrupto.
 */

const { sanitizeText } = require('./sanitizeText');

/**
 * El formato de la API parece ser string con goleadores separados.
 * Ejemplo hipotético: "Messi (23'), Di Maria (45+2')"
 * @param {string|null} raw - Valor crudo de la API
 * @returns {Array<string>|null} Lista de goleadores saneados
 */
function parseScorers(raw) {
  if (!raw || raw === 'null') return null;

  const sanitized = sanitizeText(raw);
  if (!sanitized) return null;

  // La API a veces devuelve goleadores como string separado por comas o saltos de línea
  const scorers = sanitized
    .split(/,|\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^\(?\?\)?$/));

  return scorers.length > 0 ? scorers : null;
}

module.exports = { parseScorers };