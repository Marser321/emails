import { NextResponse } from 'next/server';
import { addHistoryEntry, listHistory } from '@/lib/server/historyStore';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const brandId = url.searchParams.get('brandId') || undefined;
    const q = url.searchParams.get('q') || undefined;
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const entries = await listHistory(brandId, limit, q);
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error in history GET:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer el historial' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const entry = await req.json();
    if (!entry?.brandId) {
      return NextResponse.json({ error: 'brandId es obligatorio' }, { status: 400 });
    }
    const saved = await addHistoryEntry(entry);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error('Error in history POST:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al guardar en el historial' }, { status: 500 });
  }
}
