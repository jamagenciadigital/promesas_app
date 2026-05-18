const { Client } = require('pg');
require('dotenv').config();

async function migrateData() {
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
  const neonUrl = process.env.DATABASE_URL;

  console.log('Connecting to Supabase...');
  const supabase = new Client({ connectionString: supabaseUrl });
  await supabase.connect();

  console.log('Connecting to Neon...');
  const neon = new Client({ connectionString: neonUrl });
  await neon.connect();

  try {
    // 1. Get all foreign keys from Neon
    const { rows: fkRows } = await neon.query(`
      SELECT
          tc.table_schema, 
          tc.table_name, 
          tc.constraint_name, 
          pg_get_constraintdef(c.oid) AS constraint_def
      FROM 
          information_schema.table_constraints AS tc 
          JOIN pg_constraint AS c ON tc.constraint_name = c.conname
      WHERE constraint_type = 'FOREIGN KEY' AND tc.table_schema IN ('public', 'auth');
    `);

    console.log(`Found ${fkRows.length} foreign key constraints to temporarily drop.`);

    // 2. Drop all foreign keys
    for (const fk of fkRows) {
      await neon.query(`ALTER TABLE "${fk.table_schema}"."${fk.table_name}" DROP CONSTRAINT "${fk.constraint_name}";`);
    }
    console.log('Dropped all foreign keys.');

    // 3. Migrate data table by table
    const { rows: publicTables } = await supabase.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`);
    const { rows: authTables } = await supabase.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'auth' AND table_type = 'BASE TABLE'`);
    const allTables = [
      ...authTables.map(t => ({ schema: 'auth', table: t.table_name })),
      ...publicTables.map(t => ({ schema: 'public', table: t.table_name }))
    ];

    console.log(`Migrating data for ${allTables.length} tables...`);
    for (const { schema, table } of allTables) {
      // Truncate table first
      await neon.query(`TRUNCATE TABLE "${schema}"."${table}" CASCADE;`).catch(() => {});

      const { rows: data } = await supabase.query(`SELECT * FROM "${schema}"."${table}"`);
      if (data.length === 0) continue;

      const colRes = await neon.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
      `, [schema, table]);
      if (colRes.rows.length === 0) continue;
      const columns = colRes.rows.map(r => r.column_name);
      const columnTypes = {};
      colRes.rows.forEach(r => columnTypes[r.column_name] = r.data_type);

      const CHUNK_SIZE = 100;
      const chunks = [];
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        chunks.push(data.slice(i, i + CHUNK_SIZE));
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const values = [];
        const placeholders = [];
        let paramIdx = 1;

        for (let j = 0; j < chunk.length; j++) {
          const rowPlaceholders = [];
          for (const col of columns) {
            let val = chunk[j][col];
            if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
              if (columnTypes[col] !== 'ARRAY') {
                val = JSON.stringify(val);
              }
            }
            values.push(val);
            rowPlaceholders.push(`$${paramIdx++}`);
          }
          placeholders.push(`(${rowPlaceholders.join(', ')})`);
        }

        const query = `INSERT INTO "${schema}"."${table}" ("${columns.join('", "')}") VALUES ${placeholders.join(', ')}`;
        try {
          await neon.query(query, values);
        } catch(err) {
          console.error(`Error inserting into ${schema}.${table}:`, err.message);
        }
      }
      console.log(`Migrated ${data.length} rows into ${schema}.${table}`);
    }

    // 4. Restore foreign keys
    console.log('Restoring foreign key constraints...');
    for (const fk of fkRows) {
      try {
        await neon.query(`ALTER TABLE "${fk.table_schema}"."${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}" ${fk.constraint_def};`);
      } catch (err) {
        console.error(`Failed to restore FK ${fk.constraint_name} on ${fk.table_schema}.${fk.table_name}:`, err.message);
      }
    }
    console.log('Restored foreign keys successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await supabase.end();
    await neon.end();
  }
}

migrateData();
