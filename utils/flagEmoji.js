/**
 * Utilidad compartida para convertir banderas (URL de flagcdn.com o
 * código de país) a emoji de bandera, para mostrar en Telegram.
 */

/**
 * Convierte un código de país ISO 3166-1 alpha-2 (ej: "mx") a su
 * emoji de bandera correspondiente (ej: 🇲🇽).
 * @param {string} code
 * @returns {string}
 */
function countryCodeToEmoji(code) {
  if (!code || code.length !== 2) return '🏳️';
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '🏳️';
  const codePoints = [...upper].map(c => 0x1F1E6 + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
}

/**
 * Extrae el código de país de una URL de flagcdn.com (ej:
 * "https://flagcdn.com/w80/mx.png" -> "mx", también soporta
 * variantes regionales como "gb-eng" -> "gb").
 * @param {string} url
 * @returns {string|null}
 */
function extractCountryCode(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/([a-z]{2})(?:-[a-z]+)?\.png$/i);
  return match ? match[1] : null;
}

/**
 * Obtiene el emoji de bandera de un equipo, intentando primero un
 * código de país explícito y si no, derivándolo de la URL de flag.
 * @param {Object} team - Objeto equipo (puede tener .flag como URL,
 *   o .country_code / .fifa_code)
 * @returns {string}
 */
function getTeamFlagEmoji(team) {
  if (!team) return '🏳️';

  const fromUrl = extractCountryCode(team.flag);
  if (fromUrl) {
    return countryCodeToEmoji(fromUrl);
  }

  const explicitCode = team.country_code;
  if (explicitCode && explicitCode.length === 2) {
    return countryCodeToEmoji(explicitCode);
  }

  return '🏳️';
}

module.exports = {
  countryCodeToEmoji,
  extractCountryCode,
  getTeamFlagEmoji,
};
