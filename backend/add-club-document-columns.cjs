require('dotenv').config();
const { Client } = require('pg');

const url = process.env.DATABASE_URL;
const client = new Client({ connectionString: url });

async function main() {
  await client.connect();

  await client.query(
    `ALTER TABLE public.clubes ADD COLUMN IF NOT EXISTS reconocimiento_deportivo_url TEXT`
  );
  console.log("Column 'reconocimiento_deportivo_url' added to clubes");

  await client.query(
    `ALTER TABLE public.clubes ADD COLUMN IF NOT EXISTS documento_representante_url TEXT`
  );
  console.log("Column 'documento_representante_url' added to clubes");

  await client.end();
}
main().catch(err => { console.error(err); process.exit(1); });
