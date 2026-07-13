import { NextResponse } from 'next/server';
import { addHistoryEntry, listHistory } from '@/lib/server/historyStore';
import { authenticationErrorResponse, requireUser } from '@/lib/server/auth';
import { historyCreateSchema, validationMessage } from '@/lib/server/api-schemas';

export async function GET(req: Request) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const brandId = url.searchParams.get('brandId') || undefined;
    const q = url.searchParams.get('q') || undefined;
    const limitParam = url.searchParams.get('limit');
    const rawLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const limit = rawLimit && Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : undefined;
    const archivedParam = url.searchParams.get('archived');
    const pinnedParam = url.searchParams.get('pinned');
    const entries = await listHistory(brandId, limit, q, {
      archived: archivedParam === null ? undefined : archivedParam === 'true',
      pinned: pinnedParam === null ? undefined : pinnedParam === 'true',
      before: url.searchParams.get('before') || undefined,
    });
    return NextResponse.json(entries);
  } catch (error) {
    const authResponse = authenticationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error in history GET:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer el historial' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = historyCreateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
    const entry = parsed.data;
    const saved = await addHistoryEntry(entry, user.id);
    const { createHistoryVersion } = await import('@/lib/server/historyVersionStore');
    await createHistoryVersion(saved, 'manual');
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const authResponse = authenticationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error in history POST:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al guardar en el historial' }, { status: 500 });
  }
}
