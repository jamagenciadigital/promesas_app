require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE escenario_horarios 
      ADD COLUMN IF NOT EXISTS es_bloqueado BOOLEAN DEFAULT false;
    `);
    console.log("Column es_bloqueado added successfully using pg client!");
  } finally {
    client.release();
  }
}

main().catch(console.error).finally(() => pool.end());
