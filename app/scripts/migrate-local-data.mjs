import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const apply = process.argv.includes('--apply');
const SECRET_KEY = /(api.?key|secret|password|credential|token)/i;

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SECRET_KEY.test(key))
      .map(([key, item]) => [key, sanitize(item)]),
  );
}

function brandRow(brand, createdBy) {
  return {
    id: brand.id,
    name: brand.name,
    category: brand.category,
    colors: brand.colors,
    fonts: brand.fonts,
    logo: brand.logo,
    footer: brand.footer,
    voice: brand.voice || null,
    is_favorite: Boolean(brand.isFavorite),
    created_by: createdBy,
    created_at: brand.createdAt || new Date().toISOString(),
    updated_at: brand.updatedAt || new Date().toISOString(),
  };
}

function historyRow(entry, createdBy) {
  return {
    id: entry.id,
    brand_id: entry.brandId,
    template_type: entry.templateType,
    engine: entry.engine,
    model: entry.model,
    prompt: entry.prompt || null,
    subject: entry.subject || entry.content?.subject || entry.content?.headline || 'Email',
    content: entry.content,
    html_snapshot: entry.htmlSnapshot || null,
    rating: entry.rating || null,
    notes: entry.notes || null,
    schema_version: 1,
    created_by: createdBy,
    created_at: entry.createdAt || new Date().toISOString(),
    updated_at: entry.updatedAt || new Date().toISOString(),
  };
}

function draftRow(draft, createdBy) {
  return {
    id: draft.id,
    name: draft.name,
    brand_name: draft.brandName,
    template_name: draft.templateName,
    brand_id: draft.brandId,
    template: draft.template,
    content: draft.content,
    schema_version: 1,
    created_by: createdBy,
    date: draft.date || new Date().toISOString(),
  };
}

async function readHistory() {
  const directory = path.join(dataDir, 'history');
  try {
    const files = (await fs.readdir(directory)).filter(file => file.endsWith('.json'));
    return (await Promise.all(files.map(file => readJson(path.join(directory, file), [])))).flat();
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function upsert(supabase, table, rows) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`${table}: ${error.message}`);
}

const brands = sanitize(await readJson(path.join(dataDir, 'brands.json'), []));
const drafts = sanitize(await readJson(path.join(dataDir, 'drafts.json'), []));
const history = sanitize(await readHistory());
const rawSettings = await readJson(path.join(dataDir, 'settings.json'), {});
const settings = sanitize(rawSettings);
const configuredProviders = {
  gemini: Boolean(rawSettings.geminiApiKey || rawSettings.gemini_api_key),
  claude: Boolean(rawSettings.anthropicApiKey || rawSettings.anthropic_api_key),
};

const exportPayload = {
  format: 'email-builder-safe-export-v1',
  exportedAt: new Date().toISOString(),
  sourceDigest: createHash('sha256')
    .update(JSON.stringify({ brands, drafts, history, settings }))
    .digest('hex'),
  configuredProviders,
  brands,
  drafts,
  history,
  settings,
};

const backupDir = path.join(root, 'backups');
await fs.mkdir(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `safe-export-${new Date().toISOString().replaceAll(':', '-')}.json`);
await fs.writeFile(backupFile, `${JSON.stringify(exportPayload, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });

console.log(`Respaldo sanitizado: ${path.relative(root, backupFile)}`);
console.log(`Marcas: ${brands.length}; borradores: ${drafts.length}; historial: ${history.length}`);

if (!apply) {
  console.log('Dry run completado. Usa "npm run data:migrate -- --apply" para escribir en Supabase.');
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const createdBy = process.env.MIGRATION_CREATED_BY || null;
if (!supabaseUrl || !serviceRole) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

await upsert(supabase, 'brands', brands.map(brand => brandRow(brand, createdBy)));
await upsert(supabase, 'drafts', drafts.map(draft => draftRow(draft, createdBy)));
await upsert(supabase, 'history', history.map(entry => historyRow(entry, createdBy)));

const { error: settingsError } = await supabase.from('settings').upsert({
  id: 'default',
  default_engine: settings.defaultEngine === 'claude' ? 'claude' : 'gemini',
  assets_public_base_url: settings.assetsPublicBaseUrl || null,
  migrated_from_local_storage: true,
  updated_at: new Date().toISOString(),
});
if (settingsError) throw new Error(`settings: ${settingsError.message}`);

console.log('Migración idempotente completada. El respaldo no contiene secretos.');
