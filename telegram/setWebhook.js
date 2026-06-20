/**
 * Registra el webhook de Telegram para recibir updates.
 * Ejecutar una vez tras desplegar en Vercel.
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * @param {string} webhookUrl - URL pública del endpoint serverless (ej: https://tudominio.vercel.app/api/webhook)
 */
async function setWebhook(webhookUrl) {
  if (!TOKEN) {
    throw new Error('Falta TELEGRAM_BOT_TOKEN');
  }

  const url = `${TELEGRAM_API}${TOKEN}/setWebhook`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message'],
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`setWebhook failed: ${data.description}`);
  }

  return data;
}

// CLI: node telegram/setWebhook.js https://tu-url.vercel.app/webhook
if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.error('Uso: node telegram/setWebhook.js <webhook-url>');
    process.exit(1);
  }
  setWebhook(url)
    .then(() => console.log('Webhook configurado correctamente'))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { setWebhook };