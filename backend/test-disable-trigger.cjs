const { Client } = require('pg');

const neonUrl = "postgresql://neondb_owner:npg_9wReAtxEQqp7@ep-patient-base-apc6nsgf-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
  const client = new Client({ connectionString: neonUrl });
  await client.connect();
  try {
    await client.query('SET session_replication_role = replica;');
    console.log("Success setting replication role");
    await client.query('SET session_replication_role = DEFAULT;');
    await client.query('ALTER TABLE "public"."deportes" ENABLE TRIGGER ALL;');
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
