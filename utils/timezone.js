/**
 * Conversión de zonas horarias de estadios a hora española (Europe/Madrid).
 * Mapea stadium_id → zona horaria real del venue.
 *
 * NOTA IMPORTANTE: en algunos entornos serverless (Vercel) el soporte de
 * Intl/ICU puede comportarse de forma distinta a un entorno Node completo,
 * lo que en ciertos casos producía "Invalid Date" al usar hour12:false.
 * Por eso aquí se usa hourCycle:'h23' (más explícito y fiable) y se valida
 * el resultado con un fallback de offsets fijos por si Intl fallara.
 */

const CITY_TO_TZ = {
  'Mexico City': 'America/Mexico_City',
  'Guadalajara': 'America/Mexico_City',
  'Monterrey': 'America/Monterrey',
  'New York': 'America/New_York',
  'East Rutherford': 'America/New_York',
  'Dallas': 'America/Chicago',
  'Arlington': 'America/Chicago',
  'Houston': 'America/Chicago',
  'Los Angeles': 'America/Los_Angeles',
  'Inglewood': 'America/Los_Angeles',
  'Miami': 'America/New_York',
  'Miami Gardens': 'America/New_York',
  'Atlanta': 'America/New_York',
  'Philadelphia': 'America/New_York',
  'San Francisco': 'America/Los_Angeles',
  'Santa Clara': 'America/Los_Angeles',
  'Seattle': 'America/Los_Angeles',
  'Boston': 'America/New_York',
  'Foxborough': 'America/New_York',
  'Kansas City': 'America/Chicago',
  'Vancouver': 'America/Vancouver',
  'Toronto': 'America/Toronto',
};

// Offsets de respaldo (en minutos, UTC - hora_local) para horario de VERANO
// (DST activo), que es el periodo del Mundial 2026 (11 jun - 19 jul).
// Solo se usan si el cálculo vía Intl falla por algún motivo.
const DST_FALLBACK_OFFSET_MIN = {
  'America/New_York': 240,    // UTC-4
  'America/Chicago': 300,     // UTC-5
  'America/Los_Angeles': 420, // UTC-7
  'America/Mexico_City': 300, // UTC-5 (México no aplica DST desde 2022)
  'America/Monterrey': 300,
  'America/Toronto': 240,
  'America/Vancouver': 420,
};

/**
 * Construye el mapeo stadium_id → timezone a partir de los datos de la API.
 * @param {Array} stadiums - Resultado de getStadiums()
 * @returns {Map<string, string>}
 */
function buildStadiumTimezoneMap(stadiums) {
  const map = new Map();

  for (const s of stadiums) {
    const city = s.city_en || s.city || '';
    const country = s.country_en || s.country || '';

    let tz = null;
    for (const [cityName, timezone] of Object.entries(CITY_TO_TZ)) {
      if (city.includes(cityName)) {
        tz = timezone;
        break;
      }
    }

    if (!tz) {
      if (country.includes('United States')) tz = 'America/New_York';
      else if (country.includes('Mexico')) tz = 'America/Mexico_City';
      else if (country.includes('Canada')) tz = 'America/Toronto';
    }

    if (tz) {
      map.set(String(s.id), tz);
    }
  }

  return map;
}

/**
 * Calcula el offset en minutos (UTC - hora_local_timezone) para un
 * instante dado, usando Intl.DateTimeFormat con hourCycle explícito.
 * @param {Date} date
 * @param {string} timeZone
 * @returns {number|null} Offset en minutos, o null si el cálculo falla
 */
function getOffsetMinutes(date, timeZone) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23', // más explícito y fiable que hour12:false entre runtimes
    });
    const parts = dtf.formatToParts(date);
    const get = (type) => parts.find(p => p.type === type)?.value;

    const year = Number(get('year'));
    const month = Number(get('month'));
    const day = Number(get('day'));
    const hour = Number(get('hour'));
    const minute = Number(get('minute'));
    const second = Number(get('second'));

    if ([year, month, day, hour, minute, second].some(v => Number.isNaN(v))) {
      return null;
    }

    const asUTC = Date.UTC(year, month - 1, day, hour, minute, second);
    const offset = (asUTC - date.getTime()) / 60000;

    return Number.isNaN(offset) ? null : offset;
  } catch (err) {
    return null;
  }
}

/**
 * Convierte una fecha LOCAL del estadio (string sin zona horaria) a un Date
 * que representa el instante UTC real. Funciona igual sin importar en qué
 * timezone corra el proceso (Madrid, UTC, etc. — importante para GitHub
 * Actions y Vercel, que usan UTC).
 *
 * @param {string} localDate - Formato "MM/DD/YYYY HH:mm" de la API, hora LOCAL del estadio
 * @param {string} timezone - Zona horaria del estadio (ej: 'America/New_York')
 * @returns {Date} Instante UTC real del partido
 */
function toSpainTime(localDate, timezone) {
  const [datePart, timePart] = (localDate || '').split(' ');
  if (!datePart || !timePart) {
    return new Date(NaN);
  }

  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  if ([month, day, year, hour, minute].some(v => Number.isNaN(v))) {
    return new Date(NaN);
  }

  const naiveUTC = Date.UTC(year, month - 1, day, hour, minute, 0);
  const guess = new Date(naiveUTC);

  let offsetMin = getOffsetMinutes(guess, timezone);

  // Fallback: si Intl falla en este entorno, usar offset fijo conocido
  // (válido para el periodo del Mundial 2026, en horario de verano).
  if (offsetMin === null) {
    offsetMin = DST_FALLBACK_OFFSET_MIN[timezone] ?? 240; // default America/New_York
  }

  return new Date(naiveUTC - offsetMin * 60000);
}

/**
 * Formatea una fecha para mostrar en mensajes de Telegram (hora española).
 * @param {Date} date
 * @returns {string} Ej: "11/06/2026 19:00"
 */
function formatSpainDate(date) {
  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }
  return date.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Devuelve solo la fecha (sin hora) en formato ISO para comparar "días".
 * @param {Date} date
 * @returns {string} Ej: "2026-06-11"
 */
function getSpainDateString(date) {
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
}

/**
 * Devuelve la fecha de hoy en España como string ISO.
 * @returns {string}
 */
function getTodaySpain() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
}

module.exports = {
  buildStadiumTimezoneMap,
  toSpainTime,
  formatSpainDate,
  getSpainDateString,
  getTodaySpain,
};
    
