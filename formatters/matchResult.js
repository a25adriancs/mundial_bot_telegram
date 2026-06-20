/**
 * Formatea el mensaje de resultado final de un partido.
 * Output: Markdown para Telegram.
 */

const { formatSpainDate } = require('../utils/timezone');
const { parseScorers } = require('../utils/parseScorers');
const { sanitizeText } = require('../utils/sanitizeText');

/**
 * @param {Object} match - Partido de la API
 * @param {Object} teamsMap - Mapa team_id → { name_en, flag }
 * @param {Object} stadiumsMap - Mapa stadium_id → { name_en, city_en }
 * @param {string} spainDateStr - Fecha/hora ya convertida a España
 * @returns {string} Mensaje en Markdown
 */
function formatMatchResult(match, teamsMap, stadiumsMap, spainDateStr) {
  const homeTeam = teamsMap[match.home_team_id] || { name_en: match.home_team_name_en || '???', flag: '' };
  const awayTeam = teamsMap[match.away_team_id] || { name_en: match.away_team_name_en || '???', flag: '' };

  const homeScore = match.home_score ?? 0;
  const awayScore = match.away_score ?? 0;

  const groupLabel = match.type === 'group' ? `Grupo ${match.group}` : match.group;
  const typeLabel = match.type === 'group' ? 'Fase de grupos' : match.type.toUpperCase();

  const stadium = stadiumsMap[match.stadium_id];
  const stadiumLine = stadium ? `\n🏟️ ${sanitizeText(stadium.name_en)}, ${sanitizeText(stadium.city_en)}` : '';

  const homeScorers = parseScorers(match.home_scorers);
  const awayScorers = parseScorers(match.away_scorers);

  const scorersLines = [];
  if (homeScorers) {
    scorersLines.push(`  ⚽ ${homeTeam.name_en}: ${homeScorers.join(', ')}`);
  }
  if (awayScorers) {
    scorersLines.push(`  ⚽ ${awayTeam.name_en}: ${awayScorers.join(', ')}`);
  }

  const scorersBlock = scorersLines.length > 0 ? `\n${scorersLines.join('\n')}` : '';

  return [
    `🏁 *RESULTADO FINAL*`,
    ``,
    `${homeTeam.flag} *${homeTeam.name_en}* ${homeScore} - ${awayScore} *${awayTeam.name_en}* ${awayTeam.flag}`,
    ``,
    `📅 ${spainDateStr} (hora española)`,
    `🏆 ${typeLabel} · ${groupLabel}${stadiumLine}`,
    `${scorersBlock}`,
  ].join('\n');
}

module.exports = { formatMatchResult };