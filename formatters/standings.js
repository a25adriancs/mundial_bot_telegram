/**
 * Formatea la tabla de clasificación de un grupo.
 * Usa banderas emoji (derivadas del código de país) en vez de URLs,
 * y un formato más legible para Telegram.
 */

const { sanitizeText } = require('../utils/sanitizeText');

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
 * "https://flagcdn.com/w80/mx.png" -> "mx").
 * @param {string} url
 * @returns {string|null}
 */
function extractCountryCode(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/([a-z]{2})\.png$/i);
  return match ? match[1] : null;
}

/**
 * Obtiene el emoji de bandera de un equipo, intentando primero un
 * código de país explícito y si no, derivándolo de la URL de flag.
 * @param {Object} team
 * @returns {string}
 */
function getTeamFlagEmoji(team) {
  if (!team) return '🏳️';
  const explicitCode = team.country_code || team.fifa_code;
  if (explicitCode && explicitCode.length === 2) {
    return countryCodeToEmoji(explicitCode);
  }
  const fromUrl = extractCountryCode(team.flag);
  if (fromUrl) {
    return countryCodeToEmoji(fromUrl);
  }
  return '🏳️';
}

/**
 * @param {Object} group - { group: 'A', teams: [{ team_id, pts, gf, ga }] }
 * @param {Object} teamsMap - Mapa team_id → { name_en, flag, ... }
 * @returns {string} Mensaje en Markdown
 */
function formatStandings(group, teamsMap) {
  if (!group || !Array.isArray(group.teams) || group.teams.length === 0) {
    return '❌ No se encontró el grupo solicitado.';
  }

  const groupName = group.group || group.name || '?';

  const lines = [
    `📊 *CLASIFICACIÓN — GRUPO ${groupName}*`,
    '',
  ];

  group.teams.forEach((t, index) => {
    const team = teamsMap[t.team_id] || teamsMap[String(t.team_id)] || null;
    const name = team ? (sanitizeText(team.name_en) || 'Equipo desconocido') : `Equipo ${t.team_id}`;
    const flagEmoji = getTeamFlagEmoji(team);

    const pts = t.pts ?? 0;
    const gf = parseInt(t.gf) || 0;
    const ga = parseInt(t.ga) || 0;
    const dg = gf - ga;
    const dgStr = dg > 0 ? `+${dg}` : `${dg}`;

    const position = index + 1;
    const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '';

    lines.push(`${position}. ${flagEmoji} *${name}* ${medal}`);
    lines.push(`   Pts: *${pts}*  ·  GF: ${gf}  ·  GC: ${ga}  ·  DG: ${dgStr}`);
    lines.push('');
  });

  lines.push('_PT: puntos · GF: goles a favor · GC: goles en contra · DG: diferencia de goles_');

  return lines.join('\n').trim();
}

module.exports = { formatStandings };
