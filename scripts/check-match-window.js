import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const now = new Date();
const margenAntes = 10 * 60 * 1000;   // empezar a hacer polling 10 min antes
const margenDespues = 2.5 * 60 * 60 * 1000; // dejar de hacer polling 2h30 después

const { data: partidos } = await supabase
  .from('games_cache')
  .select('fecha_inicio')
  .gte('fecha_inicio', new Date(now - margenDespues).toISOString())
  .lte('fecha_inicio', new Date(now.getTime() + margenAntes).toISOString());

const hayPartidoActivo = (partidos ?? []).some(p => {
  const inicio = new Date(p.fecha_inicio).getTime();
  return now.getTime() >= inicio - margenAntes && now.getTime() <= inicio + margenDespues;
});

console.log(`mode=${hayPartidoActivo ? 'active' : 'idle'}`);
