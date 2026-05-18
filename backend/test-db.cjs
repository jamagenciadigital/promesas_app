const { Client } = require('pg');

const url = 'postgresql://postgres.skssegbltojjokjtvgev:5qkGYgq4OsMFS0Ii@db.skssegbltojjokjtvgev.supabase.co:5432/postgres';

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log('Connected to Supabase successfully!');
    return client.end();
  })
  .catch(err => {
    console.error('Failed to connect:', err.message);
    process.exit(1);
  });
