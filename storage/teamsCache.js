/**
 * Cache en memoria + persistencia en BD para equipos.
 * Los equipos no cambian durante el torneo, así que se cachean agresivamente.
 */

const { query } = require('../db');

let memoryCache = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
let lastFetch = 0;

const TABLE = 'teams_cache';

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      cached_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

/**
 * @param {Function} fetchFn - Función para obtener equipos frescos (getTeams)
 * @returns {Promise<Object>} Mapa id → equipo
 */
async function getTeamsMap(fetchFn) {
  const now = Date.now();

  if (memoryCache && (now - lastFetch) < CACHE_TTL_MS) {
    return memoryCache;
  }

  // Intenta cargar de BD
  const dbResult = await query(`SELECT data FROM ${TABLE}`);
  if (dbResult.rowCount > 0) {
    const map = {};
    for (const row of dbResult.rows) {
      const team = row.data;
      map[String(team.id)] = team;
    }
    memoryCache = map;
    lastFetch = now;
    return map;
  }

  // Fetch fresco de la API
  const teams = await fetchFn();
  const map = {};
  for (const t of teams) {
    map[String(t.id)] = t;
    await query(
      `INSERT INTO ${TABLE} (id, data) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET data = $2, cached_at = NOW()`,
      [String(t.id), JSON.stringify(t)]
    );
  }

  memoryCache = map;
  lastFetch = now;
  return map;
}

/**
 * @param {string} id
 * @param {Object} teamsMap
 * @returns {Object|null}
 */
function getTeamById(id, teamsMap) {
  return teamsMap[String(id)] || null;
}

module.exports = {
  ensureTable,
  getTeamsMap,
  getTeamById,
};