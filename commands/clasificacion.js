/**
 * Comando /clasificacion [grupo] — tabla de un grupo.
 * Calcula la clasificación a partir de los partidos cacheados
 * (gamesCache), NO llama a worldcup26.ir directamente, porque esa
 * API rechaza conexiones desde Vercel.
 */

const { getTeams } = require('../worldcup-api/getTeams');
const { getTeamsMap } = require('../storage/teamsCache');
const { getGamesFromCache } = require('../storage/gamesCache');
const { formatStandings } = require('../formatters/standings');

/**
 * Calcula la tabla de clasificación de un grupo a partir de los
 * partidos finalizados de ese grupo.
 * Criterios de desempate: puntos > diferencia de goles > goles a favor.
 * (Nota: esto es una aproximación estándar; el desempate oficial FIFA
 * puede incluir más criterios como resultado entre sí, fair play, etc.)
 *
 * @param {string} groupName - Letra del grupo (A-L)
 * @param {Array} games - Lista completa de partidos
 * @param {Object} teamsMap - Mapa id -> equipo
 * @returns {Array} Tabla ordenada de standings
 */
function computeStandings(groupName, games, teamsMap) {
  const groupGames = games.filter(g => g.group === groupName);

  // Identifica todos los equipos que participan en el grupo
  const teamIds = new Set();
  for (const g of groupGames) {
    teamIds.add(String(g.home_team_id));
    teamIds.add(String(g.away_team_id));
  }

  const table = {};
  for (const id of teamIds) {
    table[id] = {
      team: teamsMap[id] || { id, name_en: 'Desconocido' },
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    };
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
    table[homeId].goalsFor += homeScore;
    table[homeId].goalsAgainst += awayScore;
    table[awayId].goalsFor += awayScore;
    table[awayId].goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      table[homeId].won++;
      table[homeId].points += 3;
      table[awayId].lost++;
    } else if (homeScore < awayScore) {
      table[awayId].won++;
      table[awayId].points += 3;
      table[homeId].lost++;
    } else {
      table[homeId].drawn++;
      table[awayId].drawn++;
      table[homeId].points += 1;
      table[awayId].points += 1;
    }
  }

  return Object.values(table)
    .map(row => ({
      ...row,
      goalDiff: row.goalsFor - row.goalsAgainst,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      return b.goalsFor - a.goalsFor;
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

  const standings = computeStandings(normalized, games, teamsMap);

  if (standings.length === 0) {
    return `❌ No encontré partidos para el grupo ${normalized}.`;
  }

  return formatStandings({ group: normalized, standings }, teamsMap);
}

module.exports = { clasificacion };
