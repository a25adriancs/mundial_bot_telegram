/**
 * Formatea la información de un equipo para el comando /equipo.
 */

const { sanitizeText } = require('../utils/sanitizeText');
const { getTeamFlagEmoji } = require('../utils/flagEmoji');

/**
 * @param {Object} team - Equipo de la API
 * @param {Array} upcomingMatches - Próximos partidos del equipo
 * @param {Object} teamsMap - Mapa team_id → { name_en, flag }
 * @returns {string} Mensaje en Markdown
 */
function formatTeamInfo(team, upcomingMatches, teamsMap) {
  if (!team) {
    return '❌ No se encontró el equipo. Prueba con el nombre en inglés.';
  }

  const name = sanitizeText(team.name_en) || '???';
  const nameFa = sanitizeText(team.name_fa);
  const fifaCode = sanitizeText(team.fifa_code) || '';
  const group = team.groups || team.group || '?';
  const flagEmoji = getTeamFlagEmoji(team);

  const lines = [
    `${flagEmoji} *${name}* ${fifaCode ? `(${fifaCode})` : ''}`,
    nameFa ? `_${nameFa}_` : '',
    `📊 Grupo ${group}`,
  ].filter(Boolean);

  if (upcomingMatches && upcomingMatches.length > 0) {
    lines.push(`\n📅 *Próximos partidos:*`);
    for (const m of upcomingMatches) {
      const home = teamsMap[m.home_team_id] || { name_en: m.home_team_name_en || '???' };
      const away = teamsMap[m.away_team_id] || { name_en: m.away_team_name_en || '???' };
      const date = m._spainDateStr || 'Fecha por confirmar';
      lines.push(`   • ${home.name_en} vs ${away.name_en} — ${date}`);
    }
  }

  return lines.join('\n');
}

module.exports = { formatTeamInfo };
