/**
 * Comando /stop — cancela notificaciones push para este chat.
 */

const { unsubscribe } = require('../storage/subscribers');

/**
 * @param {number} chatId
 * @returns {Promise<string>}
 */
async function stop(chatId) {
  await unsubscribe(chatId);
  return '🔕 Notificaciones canceladas. Usa /start para volver a activarlas.';
}

module.exports = { stop };