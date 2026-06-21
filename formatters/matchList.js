/**
 * Formatea una lista de partidos para comandos /resultados y /proximos.
 */

const { formatSpainDate } = require('../utils/timezone');
const { getTeamFlagEmoji } = require('../utils/flagEmoji');

/**
 * @param {Array} matches - Partidos filtrados y ordenados
 * @param {Object} teamsMap - Mapa team_id → { name_en, flag }
 * @param {string} title - Título del mensaje
 * @returns {string} Mensaje en Markdown
 */
function formatMatchList(matches, teamsMap, title) {
  if (matches.length === 0) {
    return `📭 *${title}*\n\nNo hay partidos en esta franja.`;
  }

  const lines = [`⚽ *${title}*\n`];

  for (const m of matches) {
    const home = teamsMap[m.home_team_id] || { name_en: m.home_team_name_en || '???', flag: '' };
    const away = teamsMap[m.away_team_id] || { name_en: m.away_team_name_en || '???', flag: '' };

    const homeFlag = getTeamFlagEmoji(home);
    const awayFlag = getTeamFlagEmoji(away);

    const score = m.finished === 'TRUE' || m.finished === true
      ? `${m.home_score ?? 0} - ${m.away_score ?? 0}`
      : 'vs';

    const dateStr = m._spainDateStr || formatSpainDate(m._spainDate);
    const groupLabel = m.type === 'group' ? `Grupo ${m.group}` : m.group;

    lines.push(
      `${homeFlag} *${home.name_en}* ${score} *${away.name_en}* ${awayFlag}`,
      `   📅 ${dateStr} · ${groupLabel}`,
      ``
    );
  }

  return lines.join('\n');
}

module.exports = { formatMatchList };
