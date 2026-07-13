import { NextResponse } from 'next/server';
import { authenticationErrorResponse, requireUser } from '@/lib/server/auth';
import { listHistoryVersions } from '@/lib/server/historyVersionStore';

type Ctx = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Ctx) {
  try { await requireUser(); return NextResponse.json(await listHistoryVersions((await params).id)); }
  catch (error) { return authenticationErrorResponse(error) || NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer versiones' }, { status: 500 }); }
}
