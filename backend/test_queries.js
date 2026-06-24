const { Client } = require('pg');
require('dotenv').config({ override: true });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    console.log('--- CLUBES ---');
    const clubes = await client.query('SELECT id, nombre, plan_id FROM clubes');
    console.log(clubes.rows);

    console.log('--- PERFIL DE DEMO.CLUB ---');
    const perfiles = await client.query("SELECT id, email, rol, club_id FROM perfiles WHERE email = 'demo.club@fichaje.com.co'");
    console.log(perfiles.rows);

    if (perfiles.rows.length > 0) {
      const clubId = perfiles.rows[0].club_id;
      console.log('--- EQUIPOS ---');
      const equipos = await client.query('SELECT id, nombre, club_id FROM equipos WHERE club_id = $1', [clubId]);
      console.log(equipos.rows);

      console.log('--- AGENDA DEPORTIVA ---');
      const agenda = await client.query('SELECT id, titulo, fecha FROM agenda_deportiva WHERE club_id = $1', [clubId]);
      console.log(agenda.rows);

      console.log('--- JUEGOS AMISTOSOS ---');
      const juegos = await client.query('SELECT id, club_id, fecha, equipo_local_id FROM juegos_amistosos WHERE club_id = $1', [clubId]);
      console.log(juegos.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
