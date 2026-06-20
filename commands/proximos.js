/**
 * Comando /proximos — próximos partidos sin jugar, ordenados por fecha.
 */

const { getGames } = require('../api/getGames');
const { getTeams } = require('../api/getTeams');
const { getTeamsMap } = require('../storage/teamsCache');
const { getStadiums } = require('../api/getStadiums');
const { getStadiumsMap } = require('../storage/stadiumsCache');
const { buildStadiumTimezoneMap, toSpainTime } = require('../utils/timezone');
const { formatMatchList } = require('../formatters/matchList');

/**
 * @returns {Promise<string>} Mensaje para Telegram
 */
async function proximos() {
  const [teamsMap, stadiumsMap] = await Promise.all([
    getTeamsMap(getTeams),
    getStadiumsMap(getStadiums),
  ]);

  const stadiumTzMap = buildStadiumTimezoneMap(Object.values(stadiumsMap));
  const games = await getGames();

  const nowSpain = new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' });
  const now = new Date(nowSpain);

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

  return formatMatchList(upcoming, teamsMap, 'Próximos partidos');
}

module.exports = { proximos };