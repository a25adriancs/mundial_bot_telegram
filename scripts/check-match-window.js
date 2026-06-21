/**
 * Script ligero para GitHub Actions: determina si hay algún partido
 * en ventana activa (cerca de empezar, en juego, o recién terminado)
 * y escribe mode=active|idle en GITHUB_OUTPUT, para que otro step del
 * workflow decida si vale la pena correr el polling pesado (jobs/poll.js).
 *
 * Reutiliza storage/gamesCache.js (lectura) y utils/timezone.js
 * (misma lógica de conversión de fechas que usa poll.js), en vez de
 * un cliente Supabase distinto, para mantener consistencia con el
 * resto del proyecto.
 */

const { getGamesFromCache } = require('../storage/gamesCache');
const { getStadiumsMap } = require('../storage/stadiumsCache');
const { getStadiums } = require('../worldcup-api/getStadiums');
const { buildStadiumTimezoneMap, toSpainTime } = require('../utils/timezone');

const MARGEN_ANTES_MS = 10 * 60 * 1000;        // 10 min antes de empezar
const MARGEN_DESPUES_MS = 2.5 * 60 * 60 * 1000; // 2h30 después de empezar

async function main() {
  const [games, stadiumsMap] = await Promise.all([
    getGamesFromCache(),
    getStadiumsMap(getStadiums),
  ]);

  if (games.length === 0) {
    // Sin datos en cache todavía: por seguridad, activamos el polling
    // para que jobs/poll.js haga el fetch inicial y rellene la cache.
    console.log('mode=active');
    return;
  }

  const stadiumTzMap = buildStadiumTimezoneMap(Object.values(stadiumsMap));
  const now = new Date();

  const hayPartidoActivo = games.some(g => {
    const isFinished = g.finished === 'TRUE' || g.finished === true;
    if (isFinished) return false;

    const tz = stadiumTzMap.get(String(g.stadium_id)) || 'America/New_York';
    const inicio = toSpainTime(g.local_date, tz);

    if (Number.isNaN(inicio.getTime())) return false; // fecha inválida, ignorar

    const inicioMs = inicio.getTime();
    return now.getTime() >= inicioMs - MARGEN_ANTES_MS
        && now.getTime() <= inicioMs + MARGEN_DESPUES_MS;
  });

  console.log(`mode=${hayPartidoActivo ? 'active' : 'idle'}`);
}

main().catch(err => {
  console.error('Error en check-match-window:', err);
  // En caso de error, activamos el polling por seguridad (mejor hacer
  // trabajo de más que perderse una notificación real).
  console.log('mode=active');
  process.exit(0);
});
