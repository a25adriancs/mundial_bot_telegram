/**
 * Comando /equipos — lista todos los equipos disponibles, agrupados
 * por grupo, con el nombre exacto que hay que usar en /equipo.
 */

const { getTeams } = require('../worldcup-api/getTeams');
const { getTeamsMap } = require('../storage/teamsCache');

/**
 * @returns {Promise<string>} Mensaje para Telegram
 */
async function equipos() {
  const teamsMap = await getTeamsMap(getTeams);

  const teams = Object.values(teamsMap);

  if (teams.length === 0) {
    return '⚠️ Aún no hay datos de equipos en cache. Inténtalo de nuevo en unos minutos.';
  }

  // Agrupar por grupo (A-L)
  const byGroup = {};
  for (const t of teams) {
    const group = t.groups || t.group || '?';
    if (!byGroup[group]) byGroup[group] = [];
    byGroup[group].push(t);
  }

  const groupNames = Object.keys(byGroup).sort();

  const lines = [
    '👕 *EQUIPOS DISPONIBLES*',
    '',
    'Usa el nombre tal cual aparece aquí con `/equipo`:',
    'Ej: `/equipo Argentina`, `/equipo Spain`',
    '',
  ];

  for (const group of groupNames) {
    lines.push(`*Grupo ${group}*`);
    const sorted = byGroup[group].sort((a, b) => (a.name_en || '').localeCompare(b.name_en || ''));
    for (const t of sorted) {
      lines.push(`  • ${t.name_en}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

module.exports = { equipos };
