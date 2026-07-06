import { NextResponse } from 'next/server';
import { deleteHistoryEntry, getHistoryEntry, updateHistoryEntry } from '@/lib/server/historyStore';

type Ctx = { params: Promise<{ id: string }> };

function brandIdFrom(req: Request, body?: Record<string, unknown>): string | null {
  const url = new URL(req.url);
  return (body?.brandId as string) || url.searchParams.get('brandId');
}

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const brandId = brandIdFrom(req);
    if (!brandId) {
      return NextResponse.json({ error: 'brandId es obligatorio (query param)' }, { status: 400 });
    }
    const entry = await getHistoryEntry(brandId, id);
    if (!entry) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }
    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error in history GET by id:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer el registro' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const brandId = brandIdFrom(req, body);
    if (!brandId) {
      return NextResponse.json({ error: 'brandId es obligatorio' }, { status: 400 });
    }
    const patch: Record<string, unknown> = {};
    if (body.rating === 'up' || body.rating === 'down' || body.rating === null) patch.rating = body.rating;
    if (typeof body.notes === 'string') patch.notes = body.notes;
    if (typeof body.htmlSnapshot === 'string') patch.htmlSnapshot = body.htmlSnapshot;
    if (typeof body.subject === 'string') patch.subject = body.subject;
    if (body.content && typeof body.content === 'object') patch.content = body.content;

    const updated = await updateHistoryEntry(brandId, id, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error in history PATCH:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al actualizar el registro' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const brandId = brandIdFrom(req);
    if (!brandId) {
      return NextResponse.json({ error: 'brandId es obligatorio (query param)' }, { status: 400 });
    }
    const ok = await deleteHistoryEntry(brandId, id);
    if (!ok) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in history DELETE:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al eliminar el registro' }, { status: 500 });
  }
}
