/**
 * Persistencia de partidos ya notificados.
 * Evita duplicados de notificaciones push.
 */

const { query } = require('./db');

const TABLE = 'notified_matches';

/**
 * Crea la tabla si no existe.
 */
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      match_id TEXT PRIMARY KEY,
      notified_at TIMESTAMPTZ DEFAULT NOW(),
      notification_type TEXT DEFAULT 'finished'
    )
  `);
}

/**
 * @param {string} matchId
 * @param {string} type - 'finished' | 'goal'
 * @returns {Promise<boolean>}
 */
async function isNotified(matchId, type = 'finished') {
  const result = await query(
    `SELECT 1 FROM ${TABLE} WHERE match_id = $1 AND notification_type = $2`,
    [matchId, type]
  );
  return result.rowCount > 0;
}

/**
 * @param {string} matchId
 * @param {string} type
 */
async function markNotified(matchId, type = 'finished') {
  await query(
    `INSERT INTO ${TABLE} (match_id, notification_type) VALUES ($1, $2)
     ON CONFLICT (match_id, notification_type) DO NOTHING`,
    [matchId, type]
  );
}

/**
 * Limpia notificaciones antiguas (opcional, mantenimiento).
 */
async function cleanupOld(days = 30) {
  await query(
    `DELETE FROM ${TABLE} WHERE notified_at < NOW() - INTERVAL '${days} days'`
  );
}

module.exports = {
  ensureTable,
  isNotified,
  markNotified,
  cleanupOld,
};