async function run() {
  const url = 'http://localhost:3000/rest/v1/escenario_horarios?escenario_id=eq.5e9dc2c5-97ca-48c7-be5e-858027b67fd9';
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': 'local-dev-key',
        'Authorization': 'Bearer local-dev-key'
      }
    });
    const data = await res.json();
    console.log('--- HORARIOS MOCK FETCH RESULT ---');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
