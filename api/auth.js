/**
 * Autenticación JWT contra worldcup26.ir.
 * Obtiene y renueva el token vía /auth/authenticate.
 */

const { apiFetch } = require('./client');

const API_EMAIL = process.env.WORLDCUP_API_EMAIL;
const API_PASSWORD = process.env.WORLDCUP_API_PASSWORD;

/**
 * Obtiene un token JWT válido.
 * @returns {Promise<string>} Bearer token
 */
async function getToken() {
  if (!API_EMAIL || !API_PASSWORD) {
    throw new Error('Faltan credenciales WORLDCUP_API_EMAIL o WORLDCUP_API_PASSWORD');
  }

  const data = await apiFetch('/auth/authenticate', {
    method: 'POST',
    body: JSON.stringify({ email: API_EMAIL, password: API_PASSWORD }),
  });

  if (!data.token) {
    throw new Error('La API no devolvió token en authenticate');
  }

  return data.token;
}

module.exports = { getToken };