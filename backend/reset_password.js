const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const hash = await bcrypt.hash('$pruebas', 10);
    const res = await client.query(
      "UPDATE auth.users SET encrypted_password = $1 WHERE email = 'demo.club@fichaje.com.co'",
      [hash]
    );
    console.log('Update result:', res.rowCount, 'rows updated to password "$pruebas"');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
