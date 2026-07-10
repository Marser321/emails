import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getProvider, MissingApiKeyError } from '@/lib/server/ai';
import { abTestRequestSchema, validationMessage } from '@/lib/server/api-schemas';
import { requireUser, AuthenticationError } from '@/lib/server/auth';

export async function POST(req: Request) {
  try {
    await requireUser();
    const input = abTestRequestSchema.parse(await req.json());
    const provider = await getProvider(input.engine);
    return NextResponse.json(await provider.abTest({ headline: input.headline, body: input.body }));
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: validationMessage(error) }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al generar variantes' }, { status: error instanceof MissingApiKeyError ? 400 : 500 });
  }
}
