const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Manually parse backend/.env
const envPath = path.resolve(__dirname, '../backend/.env');
let databaseUrl = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*["']?([^"']+)["']?/);
    if (match) {
      databaseUrl = match[1];
      break;
    }
  }
} catch (err) {
  console.error("Could not read .env file:", err.message);
  process.exit(1);
}

if (!databaseUrl) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log("Connected to Neon DB successfully.");

  // Check if storage_files table exists
  const tableCheck = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'storage_files'
    );
  `);
  console.log("storage_files table exists:", tableCheck.rows[0].exists);

  if (tableCheck.rows[0].exists) {
    // List recent files in storage_files
    const files = await client.query(`
      SELECT id, bucket, path, mime_type, created_at, length(content) as content_length
      FROM public.storage_files
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    console.log("Recent files in storage_files:", files.rows);
  }

  // Query 'clubes' to see if there is any logo_url stored
  const clubes = await client.query(`
    SELECT id, nombre, logo_url
    FROM public.clubes
    LIMIT 5;
  `);
  console.log("Clubes in DB:", clubes.rows);

  await client.end();
}

run().catch(console.error);
