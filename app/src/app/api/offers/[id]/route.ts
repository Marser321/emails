import { NextResponse } from 'next/server';
import { authenticationErrorResponse, requireUser } from '@/lib/server/auth';
import { offerPatchSchema, validationMessage } from '@/lib/server/api-schemas';
import { deleteOffer, getOffer, updateOffer } from '@/lib/server/offerStore';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try { await requireUser(); const offer = await getOffer((await params).id); return offer ? NextResponse.json(offer) : NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 }); }
  catch (error) { return authenticationErrorResponse(error) || NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer la oferta' }, { status: 500 }); }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try { await requireUser(); const parsed = offerPatchSchema.safeParse(await req.json()); if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 }); const offer = await updateOffer((await params).id, parsed.data); return offer ? NextResponse.json(offer) : NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 }); }
  catch (error) { return authenticationErrorResponse(error) || NextResponse.json({ error: error instanceof Error ? error.message : 'Error al actualizar la oferta' }, { status: 500 }); }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try { await requireUser(); return (await deleteOffer((await params).id)) ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 }); }
  catch (error) { return authenticationErrorResponse(error) || NextResponse.json({ error: error instanceof Error ? error.message : 'Error al eliminar la oferta' }, { status: 500 }); }
}
