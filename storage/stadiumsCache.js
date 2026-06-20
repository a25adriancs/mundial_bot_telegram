/**
 * Cache en memoria + BD para estadios.
 * Igual patrón que teamsCache.
 */

const { query } = require('../db');

let memoryCache = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let lastFetch = 0;

const TABLE = 'stadiums_cache';

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
 * @param {Function} fetchFn - getStadiums
 * @returns {Promise<Object>} Mapa id → estadio
 */
async function getStadiumsMap(fetchFn) {
  const now = Date.now();

  if (memoryCache && (now - lastFetch) < CACHE_TTL_MS) {
    return memoryCache;
  }

  const dbResult = await query(`SELECT data FROM ${TABLE}`);
  if (dbResult.rowCount > 0) {
    const map = {};
    for (const row of dbResult.rows) {
      const s = row.data;
      map[String(s.id)] = s;
    }
    memoryCache = map;
    lastFetch = now;
    return map;
  }

  const stadiums = await fetchFn();
  const map = {};
  for (const s of stadiums) {
    map[String(s.id)] = s;
    await query(
      `INSERT INTO ${TABLE} (id, data) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET data = $2, cached_at = NOW()`,
      [String(s.id), JSON.stringify(s)]
    );
  }

  memoryCache = map;
  lastFetch = now;
  return map;
}

module.exports = {
  ensureTable,
  getStadiumsMap,
};