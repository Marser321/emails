const { Client } = require('pg');
const fs = require('fs');

async function init() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL_NON_POOLING,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Connected to Postgres');
    const sql = fs.readFileSync('supabase/schema.sql', 'utf8');
    await client.query(sql);
    console.log('Schema created successfully');
  } catch (err) {
    console.error('Error creating schema', err);
  } finally {
    await client.end();
  }
}
init();
