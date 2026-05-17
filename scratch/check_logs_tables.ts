import { supabase } from '../src/lib/supabase';

async function checkTables() {
  const tables = ['bitacora', 'logs', 'registros', 'notificaciones'];
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`Table ${table} exists and has ${count} rows.`);
    } else {
      console.log(`Table ${table} check failed: ${error.message}`);
    }
  }
}

checkTables();
