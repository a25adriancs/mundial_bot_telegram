/**
 * Obtiene todos los equipos (48).
 */

const { apiFetch } = require('./client');
const { getToken } = require('./auth');

/**
 * @returns {Promise<Array>} Lista de equipos
 */
async function getTeams() {
  const token = await getToken();

  const data = await apiFetch('/get/teams', {
    headers: { Authorization: `Bearer ${token}` },
  });

  return Array.isArray(data) ? data : data.teams || [];
}

module.exports = { getTeams };