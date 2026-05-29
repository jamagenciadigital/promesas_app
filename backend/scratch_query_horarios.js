const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT id, escenario_id, dia_semana, hora_inicio, hora_fin, es_bloqueado
      FROM escenario_horarios 
      WHERE escenario_id = '5e9dc2c5-97ca-48c7-be5e-858027b67fd9'
      LIMIT 10
    `);
    console.log('--- ESCENARIO HORARIOS ---');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
