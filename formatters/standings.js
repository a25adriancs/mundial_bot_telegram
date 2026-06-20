/**
 * Formatea la tabla de clasificación de un grupo.
 */

const { sanitizeText } = require('../utils/sanitizeText');

/**
 * @param {Object} group - Resultado de getGroupByName
 * @param {Object} teamsMap - Mapa team_id → { name_en, flag }
 * @returns {string} Mensaje en Markdown
 */
function formatStandings(group, teamsMap) {
  if (!group || !group.teams) {
    return '❌ No se encontró el grupo solicitado.';
  }

  const groupName = group.group || group.name || '?';

  const lines = [
    `📊 *CLASIFICACIÓN GRUPO ${groupName}*\n`,
    `\`P\`  \`Equipo\`          \`PT\` \`GF\` \`GC\` \`DG\``,
  ];

  for (const t of group.teams) {
    const team = teamsMap[t.team_id] || { name_en: '???', flag: '' };
    const pts = t.pts ?? 0;
    const gf = t.gf ?? 0;
    const ga = t.ga ?? 0;
    const dg = (parseInt(gf) || 0) - (parseInt(ga) || 0);

    const name = sanitizeText(team.name_en) || '???';
    const flag = team.flag ? `${team.flag} ` : '';

    lines.push(
      `${flag}${name.padEnd(16)} ${String(pts).padStart(2)}  ${String(gf).padStart(2)}  ${String(ga).padStart(2)}  ${String(dg >= 0 ? '+' : '').padStart(2)}${dg}`
    );
  }

  return lines.join('\n');
}

module.exports = { formatStandings };