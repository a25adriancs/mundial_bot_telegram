/**
 * Obtiene todos los estadios.
 */

const { apiFetch } = require('./client');
const { getToken } = require('./auth');

/**
 * @returns {Promise<Array>} Lista de estadios
 */
async function getStadiums() {
  const token = await getToken();

  const data = await apiFetch('/get/stadiums', {
    headers: { Authorization: `Bearer ${token}` },
  });

  return Array.isArray(data) ? data : data.stadiums || [];
}

module.exports = { getStadiums };