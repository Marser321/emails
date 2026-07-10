import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { z, ZodError } from 'zod';
import type { EmailAsset } from '@/lib/types';
import { AuthenticationError, requireUser } from '@/lib/server/auth';
import { isSupabaseConfigured } from '@/lib/server/env';
import { createServerSupabase } from '@/lib/supabase/server';

const BUCKET = 'assets';
const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const kindSchema = z.enum(['logo', 'hero', 'tile', 'icon', 'other']);

interface AssetRow {
  id: string;
  brand_id: string;
  filename: string;
  storage_path: string;
  thumbnail_path: string | null;
  kind: EmailAsset['kind'];
  alt_text: string;
  width: number;
  height: number;
  mime_type: string;
  byte_size: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  author: string;
  source_prompt: string | null;
  intended_use: string | null;
}

function sanitizeSegment(value: string, fallback: string): string {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || fallback;
}

function sanitizeFilename(filename: string): string {
  return path.basename(filename, path.extname(filename)).normalize('NFKD')
    .replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').toLowerCase() || 'imagen';
}

async function starterAssets(): Promise<EmailAsset[]> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'public', 'email-assets', 'manifest.json'), 'utf8');
    return JSON.parse(raw) as EmailAsset[];
  } catch {
    return [];
  }
}

function publicUrl(supabase: Awaited<ReturnType<typeof createServerSupabase>>, storagePath: string | null): string {
  if (!storagePath) return '';
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

function mapRow(supabase: Awaited<ReturnType<typeof createServerSupabase>>, row: AssetRow): EmailAsset {
  return {
    id: row.id,
    filename: row.filename,
    brandId: row.brand_id,
    url: publicUrl(supabase, row.storage_path),
    thumbnailUrl: publicUrl(supabase, row.thumbnail_path),
    size: row.byte_size,
    modifiedAt: row.updated_at || row.created_at,
    kind: row.kind || 'other',
    altText: row.alt_text,
    width: row.width,
    height: row.height,
    mimeType: row.mime_type,
    variant: 'email',
    createdBy: row.created_by || undefined,
    author: row.author,
    createdAt: row.created_at,
    sourcePrompt: row.source_prompt || undefined,
    intendedUse: row.intended_use || undefined,
  };
}

export async function GET(req: Request) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const brandId = sanitizeSegment(url.searchParams.get('brandId') || '_shared', '_shared');
    const kind = url.searchParams.get('kind');
    const query = (url.searchParams.get('q') || '').trim().toLocaleLowerCase('es');

    let assets: EmailAsset[] = [];

    if (isSupabaseConfigured()) {
      const supabase = await createServerSupabase();
      let request = supabase.from('assets').select('*').eq('brand_id', brandId).order('created_at', { ascending: false }).limit(200);
      if (kindSchema.safeParse(kind).success) request = request.eq('kind', kind);
      const { data, error } = await request;
      if (error) throw new Error(`Aplica la migración de assets: ${error.message}`);
      assets = ((data || []) as AssetRow[]).map(row => mapRow(supabase, row));
    }

    // Merge con starter assets del manifest.json local
    const localStarters = (await starterAssets()).filter(asset =>
      asset.brandId === brandId && (!kind || asset.kind === kind)
    );

    // Evitar duplicar URLs
    const existingUrls = new Set(assets.map(a => a.url));
    const uniqueStarters = localStarters.filter(s => !existingUrls.has(s.url));

    assets = [...assets, ...uniqueStarters];

    if (query) {
      assets = assets.filter(asset => `${asset.filename} ${asset.altText}`.toLocaleLowerCase('es').includes(query));
    }

    return NextResponse.json({ assets });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al listar assets' }, { status: error instanceof AuthenticationError ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!isSupabaseConfigured()) return NextResponse.json({ error: 'Configura Supabase para subir imágenes' }, { status: 503 });
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'El archivo debe pesar menos de 8 MB' }, { status: 400 });

    const brandId = sanitizeSegment(String(form.get('brandId') || '_shared'), '_shared');
    const kind = kindSchema.parse(String(form.get('kind') || 'other'));
    const altText = z.string().trim().min(1).max(240).parse(String(form.get('altText') || file.name.replace(/\.[^.]+$/, '')));
    const author = z.string().trim().min(1).max(120).parse(String(form.get('author') || user.email || 'Equipo interno'));
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { animated: false, failOn: 'error' }).rotate();
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format || '')) {
      return NextResponse.json({ error: 'La imagen no tiene un formato válido' }, { status: 400 });
    }

    const base = `${sanitizeFilename(file.name)}-${Date.now().toString(36)}`;
    let emailBuffer: Buffer;
    let width: number;
    let height: number;
    let extension: string;
    let mimeType: string;

    if (kind === 'logo' || kind === 'icon') {
      const maxWidth = kind === 'icon' ? 96 : 600;
      const maxHeight = kind === 'icon' ? 96 : 300;
      emailBuffer = await image.clone().resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
      const output = await sharp(emailBuffer).metadata();
      width = output.width || maxWidth; height = output.height || maxHeight; extension = 'png'; mimeType = 'image/png';
    } else {
      const target = kind === 'hero' ? { width: 1200, height: 600 } : kind === 'tile' ? { width: 800, height: 800 } : { width: 1200, height: 1200 };
      emailBuffer = await image.clone().resize(target.width, target.height, { fit: kind === 'other' ? 'inside' : 'cover', withoutEnlargement: kind === 'other' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      const output = await sharp(emailBuffer).metadata();
      width = output.width || target.width; height = output.height || target.height; extension = 'jpg'; mimeType = 'image/jpeg';
    }

    const thumbnailBuffer = await sharp(emailBuffer).resize(320, 320, { fit: 'cover' }).webp({ quality: 76 }).toBuffer();
    const storagePath = `${brandId}/${kind}/${base}.${extension}`;
    const thumbnailPath = `${brandId}/${kind}/${base}-thumb.webp`;
    const supabase = await createServerSupabase();
    const [emailUpload, thumbUpload] = await Promise.all([
      supabase.storage.from(BUCKET).upload(storagePath, emailBuffer, { contentType: mimeType, upsert: false }),
      supabase.storage.from(BUCKET).upload(thumbnailPath, thumbnailBuffer, { contentType: 'image/webp', upsert: false }),
    ]);
    if (emailUpload.error || thumbUpload.error) throw new Error(emailUpload.error?.message || thumbUpload.error?.message);

    const { data, error } = await supabase.from('assets').insert({
      brand_id: brandId, filename: `${base}.${extension}`, storage_path: storagePath, thumbnail_path: thumbnailPath,
      kind, alt_text: altText, width, height, mime_type: mimeType, byte_size: emailBuffer.length, created_by: user.id,
      author,
    }).select().single();
    if (error) {
      await supabase.storage.from(BUCKET).remove([storagePath, thumbnailPath]);
      throw new Error(error.message);
    }
    return NextResponse.json({ asset: mapRow(supabase, data as AssetRow) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Datos inválidos' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al subir el archivo' }, { status: error instanceof AuthenticationError ? 401 : 500 });
  }
}
