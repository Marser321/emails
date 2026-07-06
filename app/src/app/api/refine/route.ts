import { NextResponse } from 'next/server';
import { getProvider, MissingApiKeyError } from '@/lib/server/ai';
import { getBrandById } from '@/lib/server/brandStore';

export async function POST(req: Request) {
  try {
    const { text, field, command, engine, brandId, userApiKey } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'El campo de texto no puede estar vacío.' },
        { status: 400 }
      );
    }

    const provider = await getProvider(engine, userApiKey);
    const brand = brandId ? await getBrandById(brandId) : undefined;

    const result = await provider.refine({ text, field, command, brand });
    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error in refine API:', error);
    const status = error instanceof MissingApiKeyError ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al refinar el texto con IA' },
      { status }
    );
  }
}
