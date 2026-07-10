import { NextResponse } from 'next/server';
import type { Draft } from '@/lib/types';
import { authenticationErrorResponse, requireUser } from '@/lib/server/auth';
import { draftInputSchema, validationMessage } from '@/lib/server/api-schemas';
import { listDrafts, saveDraft } from '@/lib/server/draftStore';

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await listDrafts());
  } catch (error) {
    const authResponse = authenticationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error in drafts GET:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer borradores' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = draftInputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
    const draft = parsed.data as Draft;
    return NextResponse.json(await saveDraft(draft, user.id), { status: 201 });
  } catch (error) {
    const authResponse = authenticationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error in drafts POST:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al guardar el borrador' }, { status: 500 });
  }
}
