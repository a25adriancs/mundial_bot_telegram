/**
 * Obtiene todos los partidos del Mundial.
 */

const { apiFetch } = require('./client');
const { getToken } = require('./auth');

/**
 * @returns {Promise<Array>} Lista de 104 partidos
 */
async function getGames() {
  const token = await getToken();

  const data = await apiFetch('/get/games', {
    headers: { Authorization: `Bearer ${token}` },
  });

  // La API devuelve { games: [...] } o directamente un array
  return Array.isArray(data) ? data : data.games || [];
}

module.exports = { getGames };