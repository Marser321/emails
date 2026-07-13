import { NextResponse } from 'next/server';
import { authenticationErrorResponse, requireUser } from '@/lib/server/auth';
import { offerInputSchema, validationMessage } from '@/lib/server/api-schemas';
import { createOffer, listOffers } from '@/lib/server/offerStore';

export async function GET(req: Request) {
  try {
    await requireUser();
    return NextResponse.json(await listOffers(new URL(req.url).searchParams.get('brandId') || undefined));
  } catch (error) {
    return authenticationErrorResponse(error) || NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer ofertas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const parsed = offerInputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
    return NextResponse.json(await createOffer(parsed.data), { status: 201 });
  } catch (error) {
    return authenticationErrorResponse(error) || NextResponse.json({ error: error instanceof Error ? error.message : 'Error al crear la oferta' }, { status: 500 });
  }
}
