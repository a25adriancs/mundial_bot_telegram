/**
 * Cache en Supabase de la lista completa de partidos (games).
 * El cron (jobs/poll.js) es quien la actualiza llamando a la API en vivo.
 * Los comandos del webhook (Vercel) SOLO leen de aquí — nunca llaman a
 * worldcup26.ir directamente, porque esa API rechaza conexiones desde
 * la infraestructura de Vercel (TLS ECONNRESET), aunque sí funciona
 * perfectamente desde GitHub Actions.
 */

const { query } = require('./db');

const TABLE = 'games_cache';

/**
 * Crea la tabla si no existe. Guardamos un único row con todo el array
 * de partidos en JSONB, igual que se hace con poll_state.
 */
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      key TEXT PRIMARY KEY,
      games JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

/**
 * Guarda la lista completa de partidos. Llamar desde jobs/poll.js
 * en cada ejecución, justo después de obtener `games` de la API.
 * @param {Array} games
 */
async function saveGames(games) {
  await ensureTable();
  await query(
    `INSERT INTO ${TABLE} (key, games, updated_at) VALUES ('all', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET games = $1, updated_at = NOW()`,
    [JSON.stringify(games)]
  );
}

/**
 * Lee la lista completa de partidos cacheada.
 * @returns {Promise<Array>} Lista de partidos (vacío si no hay caché aún)
 */
async function getGamesFromCache() {
  await ensureTable();
  const result = await query(`SELECT games, updated_at FROM ${TABLE} WHERE key = 'all'`);
  if (result.rowCount === 0) {
    return [];
  }
  return result.rows[0].games || [];
}

module.exports = {
  ensureTable,
  saveGames,
  getGamesFromCache,
};
