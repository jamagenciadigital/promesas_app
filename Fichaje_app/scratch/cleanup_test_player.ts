
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://skssegbltojjokjtvgev.supabase.co';
const supabaseAnonKey = 'sb_publishable_CwebclWzymArk87_8eKSUg_84A175CF';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanup() {
  console.log('Buscando deportista "Jam Martinez"...');
  const { data: athletes, error: aError } = await supabase
    .from('deportistas')
    .select('id, nombre_completo, apellidos')
    .or('nombre_completo.ilike.%Jam%,apellidos.ilike.%Martinez%');

  if (aError) {
    console.error('Error buscando atletas:', aError);
    return;
  }

  if (!athletes || athletes.length === 0) {
    console.log('No se encontró ningún deportista con ese nombre.');
    return;
  }

  for (const athlete of athletes) {
    console.log(`Eliminando cartera de ${athlete.nombre_completo} ${athlete.apellidos} (ID: ${athlete.id})...`);
    const { error: cError } = await supabase
      .from('cartera')
      .delete()
      .eq('deportista_id', athlete.id);
    
    if (cError) console.error('Error eliminando cartera:', cError);

    console.log(`Eliminando deportista ${athlete.id}...`);
    const { error: dError } = await supabase
      .from('deportistas')
      .delete()
      .eq('id', athlete.id);
    
    if (dError) console.error('Error eliminando deportista:', dError);
    else console.log('Eliminado con éxito.');
  }
}

cleanup();
