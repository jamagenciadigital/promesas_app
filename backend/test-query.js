const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT id, nombre, descripcion, precio, estado, limite_equipos, limite_jugadores, limite_usuarios, modulos_activos, comision
      FROM planes_suscripcion
    `);
    console.log('--- SUBSCRIPTION PLANS ---');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
