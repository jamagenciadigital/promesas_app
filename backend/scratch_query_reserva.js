const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT id, escenario_id, tipo_reserva, fecha, hora_inicio, hora_fin, atleta_nombre, equipo_id
      FROM reserva_escenario 
      WHERE tipo_reserva = 'bloqueo'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log('--- RECENT BLOCKED SLOTS ---');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
