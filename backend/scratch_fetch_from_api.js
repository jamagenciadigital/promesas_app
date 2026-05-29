async function run() {
  const url = 'http://localhost:3000/rest/v1/reserva_escenario?escenario_id=eq.5e9dc2c5-97ca-48c7-be5e-858027b67fd9&fecha=eq.2026-05-28';
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': 'local-dev-key',
        'Authorization': 'Bearer local-dev-key'
      }
    });
    const data = await res.json();
    console.log('--- DATE SPECIFIC FETCH RESULT ---');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
