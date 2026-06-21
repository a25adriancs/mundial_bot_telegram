/**
 * Comando /equipo [nombre] — información de un equipo.
 * Tolera variantes: mayúsculas/minúsculas, con/sin tildes.
 * Lee de la cache de Supabase (gamesCache, teamsCache, stadiumsCache),
 * NO llama a worldcup26.ir directamente, porque esa API rechaza
 * conexiones desde Vercel.
 */

const { getTeams } = require('../worldcup-api/getTeams');
const { getTeamsMap } = require('../storage/teamsCache');
const { getStadiums } = require('../worldcup-api/getStadiums');
const { getStadiumsMap } = require('../storage/stadiumsCache');
const { getGamesFromCache } = require('../storage/gamesCache');
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
 * Busca un equipo en el mapa de equipos cacheado por nombre (fuzzy).
 * @param {string} searchName
 * @param {Object} teamsMap
 * @returns {Object|null}
 */
function findTeamInCache(searchName, teamsMap) {
  const normalizedSearch = normalizeName(searchName);

  for (const t of Object.values(teamsMap)) {
    const names = [t.name_en, t.name_fa, t.fifa_code].filter(Boolean);

    for (const n of names) {
      const normalized = normalizeName(n);
      if (normalized === normalizedSearch || normalized.includes(normalizedSearch)) {
        return t;
      }
    }
  }

  return null;
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

  const [teamsMap, stadiumsMap, games] = await Promise.all([
    getTeamsMap(getTeams),
    getStadiumsMap(getStadiums),
    getGamesFromCache(),
  ]);

  const team = findTeamInCache(searchName, teamsMap);

  if (!team) {
    return `❌ No encontré el equipo *"${searchName}"*. Prueba con el nombre en inglés.`;
  }

  if (games.length === 0) {
    return '⚠️ Aún no hay datos de partidos en cache. Inténtalo de nuevo en unos minutos.';
  }

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

  return formatTeamInfo(team, upcoming, teamsMap);
}

module.exports = { equipo };
