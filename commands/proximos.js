/**
 * Comando /proximos — próximos partidos sin jugar, ordenados por fecha.
 * Lee de la cache de Supabase (gamesCache), NO llama a worldcup26.ir
 * directamente, porque esa API rechaza conexiones desde Vercel.
 */

const { getTeams } = require('../worldcup-api/getTeams');
const { getTeamsMap } = require('../storage/teamsCache');
const { getStadiums } = require('../worldcup-api/getStadiums');
const { getStadiumsMap } = require('../storage/stadiumsCache');
const { getGamesFromCache } = require('../storage/gamesCache');
const { buildStadiumTimezoneMap, toSpainTime } = require('../utils/timezone');
const { formatMatchList } = require('../formatters/matchList');

/**
 * @returns {Promise<string>} Mensaje para Telegram
 */
async function proximos() {
  const [teamsMap, stadiumsMap, games] = await Promise.all([
    getTeamsMap(getTeams),
    getStadiumsMap(getStadiums),
    getGamesFromCache(),
  ]);

  // LOG TEMPORAL DE DIAGNÓSTICO - quitar cuando se resuelva el problema
  console.log('[/proximos] games.length:', games.length);
  console.log('[/proximos] typeof games:', typeof games, Array.isArray(games));
  console.log('[/proximos] stadiumsMap keys:', Object.keys(stadiumsMap).length);

  if (games.length === 0) {
    return '⚠️ Aún no hay datos de partidos en cache. Inténtalo de nuevo en unos minutos.';
  }

  const stadiumTzMap = buildStadiumTimezoneMap(Object.values(stadiumsMap));
  console.log('[/proximos] stadiumTzMap size:', stadiumTzMap.size);
  console.log('[/proximos] stadiumTzMap tiene "7"?:', stadiumTzMap.has('7'), stadiumTzMap.get('7'));

  const nowSpain = new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' });
  const now = new Date(nowSpain);
  console.log('[/proximos] now (Madrid):', now.toString());

  const notFinished = games.filter(g => !(g.finished === 'TRUE' || g.finished === true));
  console.log('[/proximos] partidos no finalizados:', notFinished.length);

  const upcoming = games
    .filter(g => {
      const isFinished = g.finished === 'TRUE' || g.finished === true;
      if (isFinished) return false;

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
    .sort((a, b) => a._spainDate - b._spainDate)
    .slice(0, 10); // Máximo 10 próximos

  console.log('[/proximos] upcoming.length tras filtro:', upcoming.length);

  return formatMatchList(upcoming, teamsMap, 'Próximos partidos');
}

module.exports = { proximos };
