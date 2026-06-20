/**
 * Comando /clasificacion [grupo] — tabla de un grupo.
 */

const { getGroups } = require('../api/getGroups');
const { getGroupByName } = require('../api/getGroup');
const { getTeams } = require('../api/getTeams');
const { getTeamsMap } = require('../storage/teamsCache');
const { formatStandings } = require('../formatters/standings');

/**
 * @param {string|null} groupName - Letra del grupo (A-L) o null
 * @returns {Promise<string>} Mensaje para Telegram
 */
async function clasificacion(groupName) {
  const teamsMap = await getTeamsMap(getTeams);

  // Si no se especifica grupo, mostrar los 12 disponibles
  if (!groupName) {
    const allGroups = await getGroups();
    const names = allGroups.map(g => g.group || g.name).filter(Boolean).sort();
    return [
      '📊 *Clasificación por grupos*',
      '',
      'Especifica un grupo: `/clasificacion A`, `/clasificacion B`, etc.',
      '',
      `Grupos disponibles: ${names.join(', ')}`,
    ].join('\n');
  }

  const normalized = groupName.trim().toUpperCase();
  if (!/^[A-L]$/.test(normalized)) {
    return '❌ Grupo no válido. Usa una letra entre A y L.';
  }

  const group = await getGroupByName(normalized);
  return formatStandings(group, teamsMap);
}

module.exports = { clasificacion };