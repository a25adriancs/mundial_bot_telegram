/**
 * Comando /start — registro de suscriptor y mensaje de bienvenida con comandos.
 */

const { subscribe } = require('../storage/subscribers');

/**
 * @param {Object} message - Objeto message de Telegram
 * @returns {Promise<string>}
 */
async function start(message) {
  const chatId = message.chat.id;
  const chatType = message.chat.type;
  const title = message.chat.title || null;
  const username = message.from?.username || null;

  await subscribe(chatId, chatType, title, username);

  const isGroup = chatType === 'group' || chatType === 'supergroup';

  return [
    `⚽ *¡Bienvenido al Bot del Mundial 2026!*`,
    ``,
    isGroup
      ? `Este grupo recibirá notificaciones automáticas de resultados y goles.`
      : `Recibirás notificaciones automáticas de resultados y goles.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📋 *COMANDOS DISPONIBLES*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `🏁 *\\/resultados\\_hoy*`,
    `   Partidos finalizados hoy (hora España)`,
    ``,
    `📅 *\\/proximos*`,
    `   Próximos partidos sin jugar`,
    ``,
    `📊 *\\/clasificacion \\[grupo\\]*`,
    `   Tabla de un grupo (A, B, C… L)`,
    `   Ej: /clasificacion A`,
    ``,
    `👕 *\\/equipo \\[nombre\\]*`,
    `   Info de un equipo`,
    `   Ej: /equipo Argentina`,
    ``,
    `🔕 *\\/stop*`,
    `   Cancelar notificaciones`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
  ].join('\n');
}

module.exports = { start };