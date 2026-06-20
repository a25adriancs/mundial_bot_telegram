/**
 * Comando /equipo [nombre] — información de un equipo.
 * Tolera variantes: mayúsculas/minúsculas, con/sin tildes.
 */

const { getTeamByName } = require('../api/getTeam');
const { getGames } = require('../api/getGames');
const { getTeams } = require('../api/getTeams');
const { getTeamsMap } = require('../storage/teamsCache');
const { getStadiums } = require('../api/getStadiums');
const { getStadiumsMap } = require('../storage/stadiumsCache');
const { buildStadiumTimezoneMap, toSpainTime } = require('../utils/timezone');
const { formatTeamInfo } = require('../formatters/teamInfo');

/**
 * Normaliza nombre para búsqueda fuzzy.
 * @param {string} name
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * @param {string} query - Nombre del equipo
 * @returns {Promise<string>} Mensaje para Telegram
 */
async function equipo(query) {
  if (!query || query.trim().length === 0) {
    return '❌ Escribe el nombre de un equipo: `/equipo Argentina`';
  }

  const searchName = query.trim();
  const normalizedSearch = normalizeName(searchName);

  // Intentar búsqueda directa primero
  let team = await getTeamByName(searchName);

  // Si falla, buscar en cache con fuzzy matching
  if (!team) {
    const teamsMap = await getTeamsMap(getTeams);
    for (const t of Object.values(teamsMap)) {
      const names = [
        t.name_en,
        t.name_fa,
        t.fifa_code,
      ].filter(Boolean);

      for (const n of names) {
        if (normalizeName(n) === normalizedSearch || normalizeName(n).includes(normalizedSearch)) {
          team = t;
          break;
        }
      }
      if (team) break;
    }
  }

  if (!team) {
    return `❌ No encontré el equipo *"${searchName}"*. Prueba con el nombre en inglés.`;
  }

  // Buscar próximos partidos del equipo
  const [games, stadiumsMap] = await Promise.all([
    getGames(),
    getStadiumsMap(getStadiums),
  ]);

  const stadiumTzMap = buildStadiumTimezoneMap(Object.values(stadiumsMap));
  const teamId = String(team.id);

  const nowSpain = new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' });
  const now = new Date(nowSpain);

  const upcoming = games
    .filter(g => {
      const isFinished = g.finished === 'TRUE' || g.finished === true;
      if (isFinished) return false;

      const isHome = String(g.home_team_id) === teamId;
      const isAway = String(g.away_team_id) === teamId;
      if (!isHome && !isAway) return false;

      const tz = stadiumTzMap.get(String(g.stadium_id)) || 'America/New_York';
      const spainDate = toSpainTime(g.local_date, tz);
      return spainDate > now;
    })
    .map(g => {
      const tz = stadiumTzMap.get(String(g.stadium_id)) || 'America/New_York';
      g._spainDate = toSpainTime(g.local_date, tz);
      g._spainDateStr = g._spainDate.toLocaleString('es-ES', {
        timeZone: 'Europe/Madrid',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      });
      return g;
    })
    .sort((a, b) => a._spainDate - b._spainDate);

  const teamsMap = await getTeamsMap(getTeams);
  return formatTeamInfo(team, upcoming, teamsMap);
}

module.exports = { equipo };