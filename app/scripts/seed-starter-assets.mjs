import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, 'public', 'email-assets', 'manifest.json'), 'utf8'));
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

for (const asset of manifest) {
  const brandId = asset.brand === 'AMO Managements' && process.env.AMO_BRAND_ID ? process.env.AMO_BRAND_ID : asset.brandId;
  const storagePath = `starter/${asset.path}`;
  const thumbnailPath = `starter/${asset.thumbnailUrl.replace('/email-assets/', '')}`;
  const [emailFile, thumbnailFile] = await Promise.all([
    readFile(path.join(root, 'public', asset.url)),
    readFile(path.join(root, 'public', asset.thumbnailUrl)),
  ]);
  const [emailUpload, thumbnailUpload] = await Promise.all([
    supabase.storage.from('assets').upload(storagePath, emailFile, { contentType: 'image/jpeg', upsert: true }),
    supabase.storage.from('assets').upload(thumbnailPath, thumbnailFile, { contentType: 'image/webp', upsert: true }),
  ]);
  if (emailUpload.error || thumbnailUpload.error) throw new Error(emailUpload.error?.message || thumbnailUpload.error?.message);
  const { error } = await supabase.from('assets').upsert({
    id: asset.id,
    brand_id: brandId,
    filename: asset.filename,
    storage_path: storagePath,
    thumbnail_path: thumbnailPath,
    kind: asset.kind,
    alt_text: asset.altText,
    width: asset.width,
    height: asset.height,
    mime_type: asset.mimeType,
    byte_size: asset.size,
    variant: asset.variant,
    author: asset.author,
    source_prompt: asset.sourcePrompt,
    intended_use: asset.intendedUse,
  }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

console.log(`Starter pack sembrado: ${manifest.length} assets.`);
