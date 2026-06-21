/**
 * Comando /resultados_hoy — partidos finalizados hoy (hora española).
 * Lee de la cache de Supabase (gamesCache), NO llama a worldcup26.ir
 * directamente, porque esa API rechaza conexiones desde Vercel.
 */

const { getTeams } = require('../worldcup-api/getTeams');
const { getTeamsMap } = require('../storage/teamsCache');
const { getStadiums } = require('../worldcup-api/getStadiums');
const { getStadiumsMap } = require('../storage/stadiumsCache');
const { getGamesFromCache } = require('../storage/gamesCache');
const { buildStadiumTimezoneMap, toSpainTime, getSpainDateString, getTodaySpain } = require('../utils/timezone');
const { formatMatchList } = require('../formatters/matchList');

/**
 * @returns {Promise<string>} Mensaje para Telegram
 */
async function resultadosHoy() {
  const [teamsMap, stadiumsMap, games] = await Promise.all([
    getTeamsMap(getTeams),
    getStadiumsMap(getStadiums),
    getGamesFromCache(),
  ]);

  if (games.length === 0) {
    return '⚠️ Aún no hay datos de partidos en cache. Inténtalo de nuevo en unos minutos.';
  }

  const stadiumTzMap = buildStadiumTimezoneMap(Object.values(stadiumsMap));
  const today = getTodaySpain();

  const finishedToday = games
    .filter(g => {
      const isFinished = g.finished === 'TRUE' || g.finished === true;
      if (!isFinished) return false;

      const tz = stadiumTzMap.get(String(g.stadium_id)) || 'America/New_York';
      const spainDate = toSpainTime(g.local_date, tz);
      if (Number.isNaN(spainDate.getTime())) return false;
      const dateStr = getSpainDateString(spainDate);

      return dateStr === today;
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

  return formatMatchList(finishedToday, teamsMap, 'Resultados de hoy');
}

module.exports = { resultadosHoy };
