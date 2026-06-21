/**
 * Comando /proximos — próximos partidos sin jugar, ordenados por fecha.
 * VERSION CON DEBUG EXTREMO - temporal, para encontrar el bug del filtro.
 */

const { getTeams } = require('../worldcup-api/getTeams');
const { getTeamsMap } = require('../storage/teamsCache');
const { getStadiums } = require('../worldcup-api/getStadiums');
const { getStadiumsMap } = require('../storage/stadiumsCache');
const { getGamesFromCache } = require('../storage/gamesCache');
const { buildStadiumTimezoneMap, toSpainTime } = require('../utils/timezone');
const { formatMatchList } = require('../formatters/matchList');

async function proximos() {
  const [teamsMap, stadiumsMap, games] = await Promise.all([
    getTeamsMap(getTeams),
    getStadiumsMap(getStadiums),
    getGamesFromCache(),
  ]);

  if (games.length === 0) {
    return '⚠️ Aún no hay datos de partidos en cache. Inténtalo de nuevo en unos minutos.';
  }

  const stadiumTzMap = buildStadiumTimezoneMap(Object.values(stadiumsMap));

  const nowSpain = new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' });
  const now = new Date(nowSpain);

  // DEBUG EXTREMO: log del partido 39 específico, paso a paso
  const partido39 = games.find(g => String(g.id) === '39');
  if (partido39) {
    console.log('[DEBUG39] objeto completo:', JSON.stringify(partido39));
    console.log('[DEBUG39] typeof finished:', typeof partido39.finished, JSON.stringify(partido39.finished));
    const isFin = partido39.finished === 'TRUE' || partido39.finished === true;
    console.log('[DEBUG39] isFinished calculado:', isFin);
    const tz39 = stadiumTzMap.get(String(partido39.stadium_id)) || 'America/New_York';
    console.log('[DEBUG39] stadium_id:', JSON.stringify(partido39.stadium_id), 'tz:', tz39);
    const sd39 = toSpainTime(partido39.local_date, tz39);
    console.log('[DEBUG39] local_date:', partido39.local_date, '-> spainDate:', sd39.toISOString());
    console.log('[DEBUG39] now:', now.toISOString());
    console.log('[DEBUG39] spainDate > now:', sd39 > now);
  } else {
    console.log('[DEBUG39] Partido 39 NO encontrado en games array. IDs disponibles (primeros 10):', games.slice(0, 10).map(g => g.id));
  }

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
    .slice(0, 10);

  console.log('[/proximos] upcoming.length tras filtro:', upcoming.length);

  return formatMatchList(upcoming, teamsMap, 'Próximos partidos');
}

module.exports = { proximos };
