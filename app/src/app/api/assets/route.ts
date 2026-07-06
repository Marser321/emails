import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { EmailAsset } from '@/lib/types';
import { dataPath } from '@/lib/server/storage';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function sanitizeBrandId(brandId: string): string {
  return brandId.replace(/[^a-zA-Z0-9_-]/g, '');
}

function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const base = path
    .basename(filename, path.extname(filename))
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .toLowerCase() || 'imagen';
  return `${base}${ext}`;
}

// GET /api/assets?brandId=<id|_shared> — lee el directorio en cada request:
// soltar archivos en Finder funciona sin sync ni reinicio
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const brandId = sanitizeBrandId(url.searchParams.get('brandId') || '_shared');
    const dir = dataPath(path.join('assets', brandId));

    let files: string[] = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      return NextResponse.json({ assets: [] });
    }

    const assets: EmailAsset[] = [];
    for (const filename of files) {
      if (!ALLOWED_EXTENSIONS.has(path.extname(filename).toLowerCase())) continue;
      try {
        const stat = await fs.stat(path.join(dir, filename));
        if (!stat.isFile()) continue;
        assets.push({
          filename,
          brandId,
          url: `/api/assets/${brandId}/${encodeURIComponent(filename)}`,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        });
      } catch {
        // archivo desapareció entre readdir y stat
      }
    }

    assets.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Error in assets GET:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al listar assets' }, { status: 500 });
  }
}

// POST /api/assets — multipart form-data: file, brandId
export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get('file');
    const brandId = sanitizeBrandId(String(fd.get('brandId') || '_shared'));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo (campo "file")' }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'El archivo supera el máximo de 5 MB' }, { status: 400 });
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Usa PNG, JPG, GIF o WebP (PNG/JPG recomendado para emails).' },
        { status: 400 }
      );
    }

    const dir = dataPath(path.join('assets', brandId));
    await fs.mkdir(dir, { recursive: true });

    let filename = sanitizeFilename(file.name);
    // Evitar colisiones agregando timestamp
    try {
      await fs.access(path.join(dir, filename));
      const base = path.basename(filename, ext);
      filename = `${base}-${Date.now().toString(36)}${ext}`;
    } catch {
      // no existe: se usa el nombre tal cual
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buffer);

    const asset: EmailAsset = {
      filename,
      brandId,
      url: `/api/assets/${brandId}/${encodeURIComponent(filename)}`,
      size: buffer.length,
      modifiedAt: new Date().toISOString(),
    };
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('Error in assets POST:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al subir el archivo' }, { status: 500 });
  }
}
