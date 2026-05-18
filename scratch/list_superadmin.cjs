const { Client } = require('pg');
require('dotenv').config({ path: '../backend/.env' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const res = await client.query("SELECT id, email, nombre, rol, estado FROM public.perfiles WHERE rol = 'superadmin'");
    console.log('--- SUPERADMIN USERS ---');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
