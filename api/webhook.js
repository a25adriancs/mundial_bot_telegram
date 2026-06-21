/**
 * Entry point serverless para Vercel.
 * Recibe updates de Telegram vía webhook y enruta a comandos.
 * Multi-chat: responde al chat que envía el comando.
 */

const { start } = require('../commands/start');
const { stop } = require('../commands/stop');
const { resultadosHoy } = require('../commands/resultadosHoy');
const { proximos } = require('../commands/proximos');
const { clasificacion } = require('../commands/clasificacion');
const { equipo } = require('../commands/equipo');
const { equipos } = require('../commands/equipos');
const { sendMessage } = require('../telegram/sendMessage');

/**
 * Extrae el comando y argumentos, soportando @BotName en grupos.
 */
function parseCommand(text, botUsername) {
  if (!text || !text.startsWith('/')) return null;

  const parts = text.trim().split(/\s+/);
  const fullCommand = parts[0];
  const [command, mentionedBot] = fullCommand.split('@');

  // En grupos, si hay @BotName, verificar que sea el nuestro
  if (mentionedBot && botUsername && mentionedBot.toLowerCase() !== botUsername.toLowerCase()) {
    return null;
  }

  return {
    command: command.toLowerCase(),
    args: parts.slice(1).join(' '),
  };
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).send('✅ Webhook activo. Esperando updates de Telegram (POST).');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const update = req.body;

  if (!update?.message?.text || !update?.message?.chat?.id) {
    return res.status(200).json({ ok: true });
  }

  const chatId = update.message.chat.id;
  const text = update.message.text;
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || '';
  const parsed = parseCommand(text, botUsername);

  if (!parsed) {
    return res.status(200).json({ ok: true });
  }

  const { command, args } = parsed;

  let reply = '';

  try {
    switch (command) {
      case '/start':
        reply = await start(update.message);
        break;
      case '/stop':
        reply = await stop(chatId);
        break;
      case '/resultados_hoy':
        reply = await resultadosHoy();
        break;
      case '/proximos':
        reply = await proximos();
        break;
      case '/clasificacion':
        reply = await clasificacion(args || null);
        break;
      case '/equipo':
        reply = await equipo(args || null);
        break;
      case '/equipos':
        reply = await equipos();
        break;
      default:
        reply = '❓ Comando no reconocido. Usa /start para ver los disponibles.';
    }
  } catch (error) {
    console.error('Error en comando:', command, error);
    reply = '❌ Error al procesar el comando. Inténtalo de nuevo más tarde.';
  }

  try {
    await sendMessage(chatId, reply);
  } catch (err) {
    console.error('Error enviando respuesta:', err);
  }

  return res.status(200).json({ ok: true });
};
