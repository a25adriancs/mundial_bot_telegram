/**
 * Comando /clasificacion [grupo] — tabla de un grupo.
 * Calcula la clasificación a partir de los partidos cacheados
 * (gamesCache), NO llama a worldcup26.ir directamente, porque esa
 * API rechaza conexiones desde Vercel.
 *
 * Genera la misma forma de datos que antes devolvía getGroupByName
 * ({ group, teams: [{ team_id, pts, gf, ga }] }) para no tener que
 * tocar formatters/standings.js.
 */

const { getTeams } = require('../worldcup-api/getTeams');
const { getTeamsMap } = require('../storage/teamsCache');
const { getGamesFromCache } = require('../storage/gamesCache');
const { formatStandings } = require('../formatters/standings');

/**
 * Calcula la tabla de clasificación de un grupo a partir de los
 * partidos finalizados de ese grupo.
 * Criterios de desempate: puntos > diferencia de goles > goles a favor.
 * (Aproximación estándar; el desempate oficial FIFA puede incluir
 * más criterios como resultado entre sí, fair play, etc.)
 *
 * @param {string} groupName - Letra del grupo (A-L)
 * @param {Array} games - Lista completa de partidos
 * @returns {Array} Lista de { team_id, pts, gf, ga } ordenada
 */
function computeStandings(groupName, games) {
  const groupGames = games.filter(g => g.group === groupName);

  const teamIds = new Set();
  for (const g of groupGames) {
    teamIds.add(String(g.home_team_id));
    teamIds.add(String(g.away_team_id));
  }

  const table = {};
  for (const id of teamIds) {
    table[id] = { team_id: id, pts: 0, gf: 0, ga: 0, played: 0 };
  }

  for (const g of groupGames) {
    const isFinished = g.finished === 'TRUE' || g.finished === true;
    if (!isFinished) continue;

    const homeId = String(g.home_team_id);
    const awayId = String(g.away_team_id);
    const homeScore = Number(g.home_score) || 0;
    const awayScore = Number(g.away_score) || 0;

    if (!table[homeId] || !table[awayId]) continue;

    table[homeId].played++;
    table[awayId].played++;
    table[homeId].gf += homeScore;
    table[homeId].ga += awayScore;
    table[awayId].gf += awayScore;
    table[awayId].ga += homeScore;

    if (homeScore > awayScore) {
      table[homeId].pts += 3;
    } else if (homeScore < awayScore) {
      table[awayId].pts += 3;
    } else {
      table[homeId].pts += 1;
      table[awayId].pts += 1;
    }
  }

  return Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const dgA = a.gf - a.ga;
    const dgB = b.gf - b.ga;
    if (dgB !== dgA) return dgB - dgA;
    return b.gf - a.gf;
  });
}

/**
 * @param {string|null} groupName - Letra del grupo (A-L) o null
 * @returns {Promise<string>} Mensaje para Telegram
 */
async function clasificacion(groupName) {
  const [teamsMap, games] = await Promise.all([
    getTeamsMap(getTeams),
    getGamesFromCache(),
  ]);

  if (games.length === 0) {
    return '⚠️ Aún no hay datos de partidos en cache. Inténtalo de nuevo en unos minutos.';
  }

  // Si no se especifica grupo, mostrar los grupos disponibles
  if (!groupName) {
    const groupNames = [...new Set(games.map(g => g.group).filter(Boolean))].sort();
    return [
      '📊 *Clasificación por grupos*',
      '',
      'Especifica un grupo: `/clasificacion A`, `/clasificacion B`, etc.',
      '',
      `Grupos disponibles: ${groupNames.join(', ')}`,
    ].join('\n');
  }

  const normalized = groupName.trim().toUpperCase();
  if (!/^[A-L]$/.test(normalized)) {
    return '❌ Grupo no válido. Usa una letra entre A y L.';
  }

  const teams = computeStandings(normalized, games);

  if (teams.length === 0) {
    return `❌ No encontré partidos para el grupo ${normalized}.`;
  }

  return formatStandings({ group: normalized, teams }, teamsMap);
}

module.exports = { clasificacion };
