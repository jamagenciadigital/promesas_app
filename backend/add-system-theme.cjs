require('dotenv').config();
const { Client } = require('pg');

const url = process.env.DATABASE_URL;
const client = new Client({ connectionString: url });

async function main() {
  await client.connect();
  
  await client.query(
    `ALTER TABLE public.configuracion_sistema ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{}'::jsonb`
  );
  console.log("Column 'theme' added to configuracion_sistema");

  await client.query(
    `INSERT INTO public.configuracion_sistema (id, theme)
     SELECT gen_random_uuid(), '{}'::jsonb
     WHERE NOT EXISTS (SELECT 1 FROM public.configuracion_sistema)`
  );
  console.log("System config row ensured");

  await client.end();
}
main().catch(err => { console.error(err); process.exit(1); });
