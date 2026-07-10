import path from 'node:path';
import { NextResponse } from 'next/server';
import { EmailAsset } from '@/lib/types';
import { supabase } from '@/lib/server/supabase';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const BUCKET = 'assets';

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const brandId = sanitizeBrandId(url.searchParams.get('brandId') || '_shared');

    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .list(brandId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Error listing assets from Supabase:', error);
      return NextResponse.json({ assets: [] });
    }

    const assets: EmailAsset[] = [];
    for (const file of data) {
      if (file.name === '.emptyFolderPlaceholder') continue;
      
      const { data: publicUrlData } = supabase
        .storage
        .from(BUCKET)
        .getPublicUrl(`${brandId}/${file.name}`);

      assets.push({
        filename: file.name,
        brandId,
        url: publicUrlData.publicUrl,
        size: file.metadata?.size || 0,
        modifiedAt: file.updated_at || file.created_at || new Date().toISOString(),
      });
    }

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Error in assets GET:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al listar assets' }, { status: 500 });
  }
}

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
    
    // Fallback to name if file.name is empty (sometimes happens with blobs)
    const nameToUse = file.name || 'image.png';
    const ext = path.extname(nameToUse).toLowerCase() || '.png';
    
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Usa PNG, JPG, GIF o WebP.' },
        { status: 400 }
      );
    }

    let filename = sanitizeFilename(nameToUse);
    const base = path.basename(filename, ext);
    filename = `${base}-${Date.now().toString(36)}${ext}`;

    const filePath = `${brandId}/${filename}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase
      .storage
      .from(BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase
      .storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const asset: EmailAsset = {
      filename,
      brandId,
      url: publicUrlData.publicUrl,
      size: file.size,
      modifiedAt: new Date().toISOString(),
    };
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('Error in assets POST:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al subir el archivo' }, { status: 500 });
  }
}
