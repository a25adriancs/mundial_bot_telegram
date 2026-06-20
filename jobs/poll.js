/**
 * Script ejecutado por GitHub Actions cron.
 * Polling de partidos: detecta resultados finales y goles en vivo.
 * Envía notificaciones push a TODOS los suscriptores activos (privados y grupos).
 */

const { getGames } = require('../worldcup-api/getGames');
const { getTeams } = require('../worldcup-api/getTeams');
const { getStadiums } = require('../worldcup-api/getStadiums');
const { ensureTable: ensureNotifiedTable, isNotified, markNotified } = require('../storage/notifiedMatches');
const { ensureTable: ensureSubscribersTable, getActiveSubscribers } = require('../storage/subscribers');
const { buildStadiumTimezoneMap, toSpainTime, formatSpainDate, getSpainDateString, getTodaySpain } = require('../utils/timezone');
const { formatMatchResult } = require('../formatters/matchResult');
const { sendMessage } = require('../telegram/sendMessage');
const { retryWithBackoff } = require('../utils/retryWithBackoff');
const { query } = require('../storage/db');
const { getTeamsMap, ensureTable: ensureTeamsTable } = require('../storage/teamsCache');
const { getStadiumsMap, ensureTable: ensureStadiumsTable } = require('../storage/stadiumsCache');

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

    if (diffHours > -3 && diffHours < 4) {
      return true;
    }
  }

  return false;
}

/**
 * Formatea notificación de gol en vivo.
 */
function formatGoalAlert(match, teamsMap, spainDateStr) {
  const home = teamsMap[match.home_team_id] || { name_en: match.home_team_name_en || '???', flag: '' };
  const away = teamsMap[match.away_team_id] || { name_en: match.away_team_name_en || '???', flag: '' };

  const score = `${match.home_score ?? 0} - ${match.away_score ?? 0}`;

  return [
    `⚽ *GOL EN VIVO*`,
    ``,
    `${home.flag} *${home.name_en}* ${score} *${away.name_en}* ${away.flag}`,
    `📅 ${spainDateStr}`,
  ].join('\n');
}

/**
 * Notifica a todos los suscriptores activos.
 */
async function broadcast(message) {
  const subscribers = await getActiveSubscribers();

  if (subscribers.length === 0) {
    console.log('No hay suscriptores activos. Saltando notificaciones.');
    return;
  }

  for (const chatId of subscribers) {
    try {
      await retryWithBackoff(() => sendMessage(chatId, message));
    } catch (err) {
      console.error(`Error notificando a ${chatId}:`, err.message);
      // Si es error de chat no encontrado o bot bloqueado, podríamos desactivar
      if (err.message?.includes('chat not found') || err.message?.includes('bot was blocked')) {
        try {
          await query(
            `UPDATE subscribers SET active = FALSE WHERE chat_id = $1`,
            [String(chatId)]
          );
          console.log(`Desactivado suscriptor ${chatId} por error persistente.`);
        } catch (dbErr) {
          console.error('Error desactivando suscriptor:', dbErr.message);
        }
      }
    }
  }
}

/**
 * Entry point del job.
 */
async function main() {
  // Asegurar tablas
  await ensureNotifiedTable();
  await ensureSubscribersTable();
  await ensureTeamsTable();
  await ensureStadiumsTable();

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

  // Cargar estado anterior de partidos
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
        await broadcast(message);
        await markNotified(match.id, 'finished');
        console.log(`Notificado final: ${match.id}`);
      }
    }

    // 2. Notificar gol en vivo
    if (!isFinished && previousMap[match.id]) {
      const homeChanged = match.home_score !== previousMap[match.id].home_score;
      const awayChanged = match.away_score !== previousMap[match.id].away_score;

      if (homeChanged || awayChanged) {
        const goalKey = `${match.id}-${match.home_score}-${match.away_score}`;
        const alreadyNotified = await isNotified(goalKey, 'goal');
        if (!alreadyNotified) {
          const message = formatGoalAlert(match, teamsMap, spainDateStr);
          await broadcast(message);
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