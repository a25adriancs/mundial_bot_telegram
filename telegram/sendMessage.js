/**
 * Envía un mensaje de texto a Telegram vía Bot API.
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * @param {string} chatId - ID del chat o canal
 * @param {string} text - Texto del mensaje (Markdown)
 * @param {Object} options - Opciones adicionales
 */
async function sendMessage(chatId, text, options = {}) {
  if (!TOKEN) {
    throw new Error('Falta TELEGRAM_BOT_TOKEN');
  }

  const url = `${TELEGRAM_API}${TOKEN}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...options,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || response.statusText}`);
  }

  return data.result;
}

module.exports = { sendMessage };