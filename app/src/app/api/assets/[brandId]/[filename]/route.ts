import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { dataPath } from '@/lib/server/storage';

type Ctx = { params: Promise<{ brandId: string; filename: string }> };

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// Resuelve la ruta y valida que quede dentro de data/assets/ (anti path-traversal)
function resolveAssetPath(brandId: string, filename: string): string | null {
  const assetsRoot = path.resolve(dataPath('assets'));
  const resolved = path.resolve(assetsRoot, brandId, filename);
  if (!resolved.startsWith(assetsRoot + path.sep)) return null;
  return resolved;
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { brandId, filename } = await params;
    const decoded = decodeURIComponent(filename);
    const filePath = resolveAssetPath(brandId, decoded);
    if (!filePath) {
      return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 });
    }

    const ext = path.extname(decoded).toLowerCase();
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) {
      return NextResponse.json({ error: 'Tipo de archivo no soportado' }, { status: 400 });
    }

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(filePath);
    } catch {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 });
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error in asset GET:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer la imagen' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { brandId, filename } = await params;
    const decoded = decodeURIComponent(filename);
    const filePath = resolveAssetPath(brandId, decoded);
    if (!filePath) {
      return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 });
    }
    try {
      await fs.unlink(filePath);
    } catch {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in asset DELETE:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al eliminar la imagen' }, { status: 500 });
  }
}
