const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    const res = await client.query("SELECT id, email, encrypted_password FROM auth.users WHERE email = 'demo.club@fichaje.com.co'");
    if (res.rows.length === 0) {
      console.log('No user found.');
      return;
    }
    const user = res.rows[0];
    console.log('User found:', user.email);
    console.log('Hashed Password:', user.encrypted_password);
    
    const candidates = ['admin123', 'admin', '123456', 'promesas', 'fichaje', 'superadmin', 'password', '12345678'];
    for (const cand of candidates) {
      const match = await bcrypt.compare(cand, user.encrypted_password);
      if (match) {
        console.log(`FOUND PASSWORD MATCH: "${cand}"`);
        return;
      }
    }
    console.log('No match found among common candidates.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
