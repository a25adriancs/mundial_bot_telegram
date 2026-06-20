/**
 * Obtiene un grupo concreto por nombre (A, B, C... L).
 */

const { apiFetch } = require('./client');
const { getToken } = require('./auth');

/**
 * @param {string} name - Letra del grupo (ej: 'A')
 * @returns {Promise<Object|null>}
 */
async function getGroupByName(name) {
  const token = await getToken();

  const data = await apiFetch(`/get/group/?name=${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return data?.group || data || null;
}

module.exports = { getGroupByName };   