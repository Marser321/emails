import { readFile } from 'node:fs/promises';
import pg from 'pg';

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!connectionString) throw new Error('Falta POSTGRES_URL_NON_POOLING o POSTGRES_URL.');

const parsedConnection = new URL(connectionString);
parsedConnection.searchParams.delete('sslmode');
const client = new pg.Client({ connectionString: parsedConnection.toString(), ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  await client.query('begin');
  await client.query(schema);
  await client.query('commit');

  const { rows } = await client.query(`
    select
      to_regclass('public.offers') as offers,
      to_regclass('public.history_versions') as history_versions,
      (
        select data_type
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'brands'
          and column_name = 'intelligence'
      ) as brand_intelligence
  `);

  const result = rows[0];
  if (!result?.offers || !result?.history_versions || result?.brand_intelligence !== 'jsonb') {
    throw new Error('La verificación posterior a la migración no coincide con el esquema esperado.');
  }
  console.log('Schema aplicado y verificado: offers, history_versions y brands.intelligence.');
} catch (error) {
  await client.query('rollback').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
