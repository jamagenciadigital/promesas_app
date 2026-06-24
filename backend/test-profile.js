const { PostgrestClient } = require('@supabase/postgrest-js');

const restUrl = 'http://localhost:3000/rest/v1';
const rest = new PostgrestClient(restUrl, {
  headers: {
    apikey: 'local-dev-key',
    'Content-Type': 'application/json'
  }
});

async function run() {
  try {
    const { data, error } = await rest
      .from('perfiles')
      .select('rol, id, estado')
      .eq('id', '8b4c4385-fa66-4138-a25b-a59db8bd1cfc')
      .single();


    console.log('--- TEST PROFILE RESULT ---');
    console.log('Error:', error);
    console.log('Data:', data);
    console.log('Data type:', typeof data);
    if (data) {
      console.log('Keys of data:', Object.keys(data));
      console.log('rol:', data.rol);
    }
  } catch (err) {
    console.error('Catch Error:', err);
  }
}
run();
