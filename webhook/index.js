/**
 * Entry point serverless para Vercel.
 * Recibe updates de Telegram vía webhook y enruta a comandos.
 */

const { resultados } = require('../commands/resultados');
const { proximos } = require('../commands/proximos');
const { clasificacion } = require('../commands/clasificacion');
const { equipo } = require('../commands/equipo');
const { sendMessage } = require('../telegram/sendMessage');

/**
 * Extrae el comando y argumentos de un mensaje de Telegram.
 * @param {string} text
 * @returns {Object|null}
 */
function parseCommand(text) {
  if (!text || !text.startsWith('/')) return null;

  const parts = text.trim().split(/\s+/);
  const fullCommand = parts[0]; // ej: "/resultados@MiBot"
  const command = fullCommand.split('@')[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  return { command, args };
}

/**
 * Handler principal de Vercel.
 */
module.exports = async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const update = req.body;

  // Validar estructura mínima
  if (!update?.message?.text || !update?.message?.chat?.id) {
    return res.status(200).json({ ok: true }); // Acknowledge para evitar reenvíos
  }

  const chatId = update.message.chat.id;
  const text = update.message.text;
  const parsed = parseCommand(text);

  if (!parsed) {
    return res.status(200).json({ ok: true });
  }

  const { command, args } = parsed;

  let reply = '';

  try {
    switch (command) {
      case '/resultados':
        reply = await resultados();
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
      case '/start':
        reply = [
          '⚽ *Bot del Mundial 2026*',
          '',
          'Comandos disponibles:',
          '• /resultados — Partidos finalizados hoy',
          '• /proximos — Próximos partidos',
          '• /clasificacion [grupo] — Tabla de grupo (A-L)',
          '• /equipo [nombre] — Info de un equipo',
        ].join('\n');
        break;
      default:
        reply = '❓ Comando no reconocido. Usa /start para ver los disponibles.';
    }
  } catch (error) {
    console.error('Error en comando:', command, error);
    reply = '❌ Error al procesar el comando. Inténtalo de nuevo más tarde.';
  }

  // Enviar respuesta
  try {
    await sendMessage(chatId, reply);
  } catch (err) {
    console.error('Error enviando respuesta:', err);
  }

  // Siempre responder 200 a Telegram para evitar reenvíos
  return res.status(200).json({ ok: true });
};