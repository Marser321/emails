import { NextResponse } from 'next/server';
import { authenticationErrorResponse, requireUser } from '@/lib/server/auth';
import { restoreHistoryVersion } from '@/lib/server/historyVersionStore';

type Ctx = { params: Promise<{ id: string; versionId: string }> };
export async function POST(req: Request, { params }: Ctx) {
  try {
    await requireUser();
    const { id, versionId } = await params;
    const brandId = String((await req.json().catch(() => ({})) as { brandId?: string }).brandId || '');
    if (!brandId) return NextResponse.json({ error: 'Falta brandId' }, { status: 400 });
    const result = await restoreHistoryVersion(brandId, id, versionId);
    return result ? NextResponse.json(result) : NextResponse.json({ error: 'Versión no encontrada' }, { status: 404 });
  } catch (error) { return authenticationErrorResponse(error) || NextResponse.json({ error: error instanceof Error ? error.message : 'Error al restaurar la versión' }, { status: 500 }); }
}
