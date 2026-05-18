const { Client } = require('pg');

const url = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9wReAtxEQqp7@ep-patient-base-apc6nsgf-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&pgbouncer=true';

const client = new Client({
  connectionString: url,
});

client.connect()
  .then(() => {
    console.log('Connected to Neon successfully!');
    return client.end();
  })
  .catch(err => {
    console.error('Failed to connect to Neon:', err.message);
    process.exit(1);
  });
