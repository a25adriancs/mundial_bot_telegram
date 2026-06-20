/**
 * Script ejecutado por GitHub Actions cron.
 * Polling de partidos: detecta resultados finales y goles en vivo.
 * Envía notificaciones push a Telegram.
 */

const { getGames } = require('../api/getGames');
const { getTeams } = require('../api/getTeams');
const { getStadiums } = require('../api/getStadiums');
const { getTeamsMap } = require('../storage/teamsCache');
const { getStadiumsMap } = require('../storage/stadiumsCache');
const { ensureTable: ensureNotifiedTable, isNotified, markNotified } = require('../storage/notifiedMatches');
const { buildStadiumTimezoneMap, toSpainTime, formatSpainDate, getSpainDateString, getTodaySpain } = require('../utils/timezone');
const { formatMatchResult } = require('../formatters/matchResult');
const { sendMessage } = require('../telegram/sendMessage');
const { retryWithBackoff } = require('../utils/retryWithBackoff');

const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Determina si hay partidos en juego o próximos en las próximas 4 horas.
 * Si no, se puede saltar el polling para ahorrar requests.
 */
function shouldPollToday(games, stadiumTzMap) {
  const nowSpain = new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' });
  const now = new Date(nowSpain);

  for (const g of games) {
    const tz = stadiumTzMap.get(String(g.stadium_id)) || 'America/New_York';
    const spainDate = toSpainTime(g.local_date, tz);
    const diffHours = (spainDate - now) / (1000 * 60 * 60);

    // Partido en juego (hace menos de 3h) o próximo (en las próximas 4h)
    if (diffHours > -3 && diffHours < 4) {
      return true;
    }
  }

  return false;
}

/**
 * Detecta cambios de marcador en partidos no finalizados.
 */
function detectGoalChanges(current, previousMap) {
  const changes = [];

  for (const match of current) {
    const isFinished = match.finished === 'TRUE' || match.finished === true;
    if (isFinished) continue;

    const prev = previousMap[match.id];
    if (!prev) continue;

    const homeChanged = match.home_score !== prev.home_score;
    const awayChanged = match.away_score !== prev.away_score;

    if (homeChanged || awayChanged) {
      changes.push({
        match,
        previous: prev,
        homeChanged,
        awayChanged,
      });
    }
  }

  return changes;
}

/**
 * Formatea notificación de gol en vivo.
 */
function formatGoalAlert(change, teamsMap, spainDateStr) {
  const m = change.match;
  const home = teamsMap[m.home_team_id] || { name_en: m.home_team_name_en || '???', flag: '' };
  const away = teamsMap[m.away_team_id] || { name_en: m.away_team_name_en || '???', flag: '' };

  const score = `${m.home_score ?? 0} - ${m.away_score ?? 0}`;

  return [
    `⚽ *GOL EN VIVO*`,
    ``,
    `${home.flag} *${home.name_en}* ${score} *${away.name_en}* ${away.flag}`,
    `📅 ${spainDateStr}`,
  ].join('\n');
}

/**
 * Entry point del job.
 */
async function main() {
  if (!CHAT_ID) {
    console.error('Falta TELEGRAM_CHAT_ID');
    process.exit(1);
  }

  // Asegurar tablas
  await ensureNotifiedTable();

  // Cargar caches
  const teamsMap = await retryWithBackoff(() => getTeamsMap(getTeams));
  const stadiumsMap = await retryWithBackoff(() => getStadiumsMap(getStadiums));

  // Construir mapa de timezones
  const stadiumTzMap = buildStadiumTimezoneMap(Object.values(stadiumsMap));

  // Obtener partidos actuales
  const games = await retryWithBackoff(getGames);

  // Optimización: si no hay partidos relevantes hoy, salir temprano
  if (!shouldPollToday(games, stadiumTzMap)) {
    console.log('No hay partidos en franja activa. Saltando polling.');
    return;
  }

  // Cargar estado anterior de partidos (de variables de entorno o BD)
  // Para GitHub Actions, usamos el artefacto del run anterior o un approach simple:
  // Guardamos el estado en una tabla de estado
  const { query } = require('../storage/db');
  await query(`
    CREATE TABLE IF NOT EXISTS poll_state (
      key TEXT PRIMARY KEY,
      value JSONB,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const stateResult = await query(`SELECT value FROM poll_state WHERE key = 'last_games'`);
  const previousGames = stateResult.rowCount > 0 ? stateResult.rows[0].value : {};
  const previousMap = {};
  for (const g of (previousGames.games || [])) {
    previousMap[g.id] = g;
  }

  // Procesar cada partido
  for (const match of games) {
    const tz = stadiumTzMap.get(String(match.stadium_id)) || 'America/New_York';
    const spainDate = toSpainTime(match.local_date, tz);
    const spainDateStr = formatSpainDate(spainDate);

    const isFinished = match.finished === 'TRUE' || match.finished === true;
    const wasFinished = previousMap[match.id]?.finished === 'TRUE' || previousMap[match.id]?.finished === true;

    // 1. Notificar resultado final (transición false → true)
    if (isFinished && !wasFinished) {
      const alreadyNotified = await isNotified(match.id, 'finished');
      if (!alreadyNotified) {
        const message = formatMatchResult(match, teamsMap, stadiumsMap, spainDateStr);
        await retryWithBackoff(() => sendMessage(CHAT_ID, message));
        await markNotified(match.id, 'finished');
        console.log(`Notificado final: ${match.id}`);
      }
    }

    // 2. Notificar gol en vivo (opcional, nice-to-have)
    if (!isFinished && previousMap[match.id]) {
      const homeChanged = match.home_score !== previousMap[match.id].home_score;
      const awayChanged = match.away_score !== previousMap[match.id].away_score;

      if (homeChanged || awayChanged) {
        const alreadyNotified = await isNotified(`${match.id}-${match.home_score}-${match.away_score}`, 'goal');
        if (!alreadyNotified) {
          const goalKey = `${match.id}-${match.home_score}-${match.away_score}`;
          const message = formatGoalAlert(
            { match, previous: previousMap[match.id], homeChanged, awayChanged },
            teamsMap,
            spainDateStr
          );
          await retryWithBackoff(() => sendMessage(CHAT_ID, message));
          await markNotified(goalKey, 'goal');
          console.log(`Notificado gol: ${match.id} (${match.home_score}-${match.away_score})`);
        }
      }
    }
  }

  // Guardar estado actual para el siguiente run
  await query(
    `INSERT INTO poll_state (key, value) VALUES ('last_games', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify({ games, polled_at: new Date().toISOString() })]
  );

  console.log('Polling completado.');
}

main().catch(err => {
  console.error('Error en poll:', err);
  process.exit(1);
});
