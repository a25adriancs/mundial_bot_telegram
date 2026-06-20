/**
 * Obtiene un equipo por ID o por nombre.
 */

const { apiFetch } = require('./client');
const { getToken } = require('./auth');

/**
 * @param {string} id - ID del equipo
 * @returns {Promise<Object|null>}
 */
async function getTeamById(id) {
  const token = await getToken();

  const data = await apiFetch(`/get/team/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return data?.team || data || null;
}

/**
 * @param {string} name - Nombre del equipo (en inglés o persa)
 * @returns {Promise<Object|null>}
 */
async function getTeamByName(name) {
  const token = await getToken();

  const data = await apiFetch(`/get/team/?name=${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return data?.team || data || null;
}

module.exports = { getTeamById, getTeamByName };