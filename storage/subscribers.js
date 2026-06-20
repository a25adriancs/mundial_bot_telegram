/**
 * Gestión de suscriptores para notificaciones push.
 * Cualquier chat (privado o grupo) que use /start se auto-registra.
 */

const { query } = require('./db');

const TABLE = 'subscribers';

let tableEnsured = false;

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
  tableEnsured = true;
}

/**
 * Garantiza que la tabla existe antes de cualquier operación.
 * Defensivo: el webhook (api/webhook.js) no llama a ensureTable() al
 * arrancar como sí hace el cron (jobs/poll.js), así que cada función
 * pública de este módulo se asegura de que la tabla exista por su cuenta.
 * tableEnsured evita repetir el CREATE TABLE en cada invocación dentro
 * de la misma instancia serverless "caliente".
 */
async function ensureTableIfNeeded() {
  if (!tableEnsured) {
    await ensureTable();
  }
}

/**
 * Registra un chat como suscriptor. Idempotente.
 */
async function subscribe(chatId, chatType, title, username) {
  await ensureTableIfNeeded();
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
  await ensureTableIfNeeded();
  await query(
    `UPDATE ${TABLE} SET active = FALSE WHERE chat_id = $1`,
    [String(chatId)]
  );
}

/**
 * Devuelve todos los chat_id activos para notificaciones push.
 */
async function getActiveSubscribers() {
  await ensureTableIfNeeded();
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
