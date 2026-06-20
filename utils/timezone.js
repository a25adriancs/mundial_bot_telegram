/**
 * Conversión de zonas horarias de estadios a hora española (Europe/Madrid).
 * Mapea stadium_id → zona horaria real del venue.
 */

const STADIUM_TIMEZONES = {
  // Estados Unidos
  '1': 'America/New_York',   // Estadio Azteca (Mexico City) → CT en realidad, pero la API usa ids propios
  // Nota: los IDs reales de la API deben mapearse tras obtener /get/stadiums
};

// Mapeo por ciudad basado en los estadios documentados
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

    // Fallback por país
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
 * Convierte una fecha local del estadio a hora española.
 * @param {string} localDate - Formato "MM/DD/YYYY HH:mm" de la API
 * @param {string} timezone - Zona horaria del estadio (ej: 'America/New_York')
 * @returns {Date} Fecha en Europe/Madrid
 */
function toSpainTime(localDate, timezone) {
  // Parsea "06/11/2026 13:00" como fecha en la timezone del estadio
  const [datePart, timePart] = localDate.split(' ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute] = timePart.split(':');

  // Crea fecha en la timezone del estadio usando el constructor con timezone
  const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour}:${minute}:00`;
  
  // Usa Intl.DateTimeFormat para convertir
  const date = new Date(dateStr);
  
  // Convertimos a string en la timezone del estadio y luego parseamos a Madrid
  const options = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(date);
  
  const getPart = (type) => parts.find(p => p.type === type)?.value;
  
  const madridStr = `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:00`;
  
  // Ahora interpretamos esa fecha en Europe/Madrid
  const madridDate = new Date(madridStr);
  
  // Diferencia entre la hora UTC y la hora del estadio nos da el offset
  // Simplificación: usamos el approach de crear fecha en UTC y aplicar offset
  // En Node.js moderno podemos usar toLocaleString con timeZone
  const spainStr = date.toLocaleString('en-US', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const spainParts = spainStr.split(/[\/, :]/);
  // mm/dd/yyyy, hh:mm → [mm, dd, yyyy, hh, mm]
  
  return new Date(`${spainParts[2]}-${spainParts[0]}-${spainParts[1]}T${spainParts[3]}:${spainParts[4]}:00`);
}

/**
 * Formatea una fecha para mostrar en mensajes de Telegram (hora española).
 * @param {Date} date
 * @returns {string} Ej: "11/06/2026 19:00"
 */
function formatSpainDate(date) {
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