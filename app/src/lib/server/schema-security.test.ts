import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(path.join(process.cwd(), 'supabase', 'schema.sql'), 'utf8').toLowerCase();

describe('contrato de seguridad de Supabase', () => {
  it.each(['brands', 'history', 'drafts', 'settings', 'assets', 'offers', 'history_versions'])('activa RLS y revoca anon en %s', table => {
    expect(schema).toContain(`alter table public.${table} enable row level security`);
    expect(schema).toMatch(new RegExp(`revoke all on table[\\s\\S]*public\\.${table}[\\s\\S]*from anon`));
  });

  it('mantiene lectura pública y escritura autenticada solo para imágenes', () => {
    expect(schema).toMatch(/for select to public using \(bucket_id = 'assets'\)/);
    expect(schema).toMatch(/for insert to authenticated with check \(bucket_id = 'assets'\)/);
    expect(schema).toMatch(/for update to authenticated using \(bucket_id = 'assets'\)/);
    expect(schema).toMatch(/for delete to authenticated using \(bucket_id = 'assets'\)/);
  });

  it('elimina las columnas legacy de secretos', () => {
    expect(schema).toContain('drop column if exists gemini_api_key');
    expect(schema).toContain('drop column if exists anthropic_api_key');
    expect(schema).toContain('drop column if exists groq_api_key');
  });

  it('admite Groq sin relajar los constraints de motores', () => {
    expect(schema).toContain("engine in ('gemini', 'groq', 'claude')");
    expect(schema).toContain("default_engine in ('gemini', 'groq', 'claude')");
  });
});
