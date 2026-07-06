import { NextResponse } from 'next/server';
import { getProvider, MissingApiKeyError } from '@/lib/server/ai';

export async function POST(req: Request) {
  try {
    const { headline, body, engine, userApiKey } = await req.json();

    if (!headline && !body) {
      return NextResponse.json(
        { error: 'El contenido del email no puede estar vacío.' },
        { status: 400 }
      );
    }

    const provider = await getProvider(engine, userApiKey);
    const data = await provider.abTest({ headline: headline || '', body: body || '' });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in ab-test API:', error);
    const status = error instanceof MissingApiKeyError ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar variantes A/B' },
      { status }
    );
  }
}
