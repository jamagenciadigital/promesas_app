async function run() {
  const url = 'http://localhost:3000/rest/v1/equipos?select=id,nombre,clubes(nombre)';
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': 'local-dev-key',
        'Authorization': 'Bearer local-dev-key'
      }
    });
    const data = await res.json();
    console.log('--- EQUIPOS MOCK FETCH RESULT ---');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
