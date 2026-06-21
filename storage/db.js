/**
 * Cliente PostgreSQL para Supabase.
 * Usa la conexión pool de pg.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * @param {string} text - Query SQL
 * @param {Array} params - Parámetros
 */
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

module.exports = { query, pool };
