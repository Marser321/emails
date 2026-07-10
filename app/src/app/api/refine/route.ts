import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getProvider, MissingApiKeyError } from '@/lib/server/ai';
import { refineRequestSchema, validationMessage } from '@/lib/server/api-schemas';
import { requireUser, AuthenticationError } from '@/lib/server/auth';
import { getBrandById } from '@/lib/server/brandStore';

export async function POST(req: Request) {
  try {
    await requireUser();
    const input = refineRequestSchema.parse(await req.json());
    const provider = await getProvider(input.engine);
    const brand = input.brandId ? await getBrandById(input.brandId) : undefined;
    return NextResponse.json({ result: await provider.refine({ text: input.text, field: input.field, command: input.command, brand }) });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: validationMessage(error) }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al refinar' }, { status: error instanceof MissingApiKeyError ? 400 : 500 });
  }
}
