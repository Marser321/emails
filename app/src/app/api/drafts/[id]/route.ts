import { NextResponse } from 'next/server';
import { authenticationErrorResponse, requireUser } from '@/lib/server/auth';
import { deleteDraft } from '@/lib/server/draftStore';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    if (!await deleteDraft(id)) return NextResponse.json({ error: 'Borrador no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authenticationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error in drafts DELETE:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al eliminar el borrador' }, { status: 500 });
  }
}
