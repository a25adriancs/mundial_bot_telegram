/**
 * Obtiene todas las clasificaciones de grupos.
 */

const { apiFetch } = require('./client');
const { getToken } = require('./auth');

/**
 * @returns {Promise<Array>} Lista de grupos con standings
 */
async function getGroups() {
  const token = await getToken();

  const data = await apiFetch('/get/groups', {
    headers: { Authorization: `Bearer ${token}` },
  });

  return Array.isArray(data) ? data : data.groups || [];
}

module.exports = { getGroups };