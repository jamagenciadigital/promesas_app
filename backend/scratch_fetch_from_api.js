async function run() {
  const url = 'http://localhost:3000/rest/v1/perfiles?select=rol,id,estado&id=eq.54c93f7e-3055-4c39-af69-a5acb40927ab';
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': 'local-dev-key',
        'Authorization': 'Bearer local-dev-key',
        'Accept': 'application/vnd.pgrst.object+json'
      }
    });
    const data = await res.json();
    console.log('--- PROFILE FETCH RESULT ---');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
