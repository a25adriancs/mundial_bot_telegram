/**
 * Gestión de suscriptores para notificaciones push.
 * Cualquier chat (privado o grupo) que use /start se auto-registra.
 */

const { query } = require('../db');

const TABLE = 'subscribers';

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      chat_id TEXT PRIMARY KEY,
      chat_type TEXT NOT NULL, -- 'private', 'group', 'supergroup', 'channel'
      title TEXT,
      username TEXT,
      subscribed_at TIMESTAMPTZ DEFAULT NOW(),
      active BOOLEAN DEFAULT TRUE
    )
  `);
}

/**
 * Registra un chat como suscriptor. Idempotente.
 */
async function subscribe(chatId, chatType, title, username) {
  await query(
    `INSERT INTO ${TABLE} (chat_id, chat_type, title, username)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (chat_id) DO UPDATE SET
       chat_type = $2,
       title = $3,
       username = $4,
       active = TRUE`,
    [String(chatId), chatType, title || null, username || null]
  );
}

/**
 * Da de baja un suscriptor.
 */
async function unsubscribe(chatId) {
  await query(
    `UPDATE ${TABLE} SET active = FALSE WHERE chat_id = $1`,
    [String(chatId)]
  );
}

/**
 * Devuelve todos los chat_id activos para notificaciones push.
 */
async function getActiveSubscribers() {
  const result = await query(
    `SELECT chat_id FROM ${TABLE} WHERE active = TRUE`
  );
  return result.rows.map(r => r.chat_id);
}

module.exports = {
  ensureTable,
  subscribe,
  unsubscribe,
  getActiveSubscribers,
};