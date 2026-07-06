import { NextResponse } from 'next/server';
import { getProvider, MissingApiKeyError } from '@/lib/server/ai';
import { getBrandById } from '@/lib/server/brandStore';
import { addHistoryEntry, getTopRatedExamples } from '@/lib/server/historyStore';
import { Brand, EmailContent } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { prompt, templateType, brand, brandId, engine, userApiKey } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'La instrucción no puede estar vacía.' }, { status: 400 });
    }

    // Marca fresca desde disco (voz actualizada); fallback al objeto enviado por el cliente
    const resolvedBrandId: string | undefined = brandId || brand?.id;
    const freshBrand: Brand | undefined = resolvedBrandId
      ? (await getBrandById(resolvedBrandId)) ?? brand
      : brand;

    if (!freshBrand) {
      return NextResponse.json({ error: 'Marca no encontrada.' }, { status: 400 });
    }

    const provider = await getProvider(engine, userApiKey);
    const examples = freshBrand.id ? await getTopRatedExamples(freshBrand.id, 3) : [];

    if (process.env.DEBUG_PROMPTS) {
      const { buildGenerateSystemPrompt } = await import('@/lib/server/prompts');
      console.log('[DEBUG_PROMPTS] generate system prompt:\n', buildGenerateSystemPrompt(freshBrand, examples));
    }

    const data = await provider.generate({
      prompt,
      templateType,
      brand: freshBrand,
      examples,
    });

    // Registro de historial — el aprendizaje diario nace acá
    let historyId: string | undefined;
    if (freshBrand.id) {
      try {
        const entry = await addHistoryEntry({
          brandId: freshBrand.id,
          templateType,
          engine: provider.engine,
          model: provider.model,
          prompt,
          subject: data.headline || '',
          content: data as EmailContent,
          htmlSnapshot: '',
          rating: null,
          notes: '',
        });
        historyId = entry.id;
      } catch (e) {
        console.error('Error saving history entry:', e);
      }
    }

    return NextResponse.json({ ...data, historyId, engine: provider.engine });
  } catch (error) {
    console.error('Error in generate API:', error);
    const status = error instanceof MissingApiKeyError ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar el correo con IA' },
      { status }
    );
  }
}
