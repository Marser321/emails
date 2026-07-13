import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createEmailDocument, documentToContent } from '@/lib/email-document';
import { createDefaultBlock } from '@/lib/types';
import { renderEmail } from '@/lib/templates';
import { getProvider, MissingApiKeyError } from '@/lib/server/ai';
import { generateRequestSchema, validationMessage } from '@/lib/server/api-schemas';
import { requireUser, AuthenticationError } from '@/lib/server/auth';
import { getBrandById } from '@/lib/server/brandStore';
import { addHistoryEntry, getRatedExamples } from '@/lib/server/historyStore';
import { createHistoryVersion } from '@/lib/server/historyVersionStore';
import { getOffer } from '@/lib/server/offerStore';
import type { Brand, EmailContent, EmailHistoryEntry } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = generateRequestSchema.parse(await req.json());
    const suppliedBrand = input.brand as Brand | undefined;
    const brandId = input.brandId || suppliedBrand?.id;
    const brand = brandId ? (await getBrandById(brandId)) || suppliedBrand : suppliedBrand;
    if (!brand) return NextResponse.json({ error: 'Marca no encontrada.' }, { status: 400 });

    const provider = await getProvider(input.engine);
    const examples = await getRatedExamples(brand.id, 3, 2);
    const offer = input.offerId ? await getOffer(input.offerId) : undefined;
    if (input.offerId && (!offer || offer.brandId !== brand.id)) return NextResponse.json({ error: 'Oferta no encontrada para esta marca.' }, { status: 400 });
    const content = await provider.generate({ prompt: input.prompt, templateType: input.templateType, brand, examples, offer, brief: input.brief }) as EmailContent;
    content.campaignBrief = input.brief;
    content.subject ||= content.headline;
    content.preheader ||= content.body?.replace(/\s+/g, ' ').slice(0, 110);
    const document = createEmailDocument(brand, input.templateType, content);
    if (offer) {
      const coupon = { ...createDefaultBlock('coupon'), offerId: offer.id, headline: offer.name, value: offer.value, code: offer.code || '', expires: offer.endsAt ? new Date(offer.endsAt).toLocaleDateString('es') : '', terms: offer.terms, ctaText: input.brief?.cta || 'Aprovechar oferta', ctaUrl: offer.landingUrl };
      const insertAt = Math.max(1, document.blocks.findIndex(block => block.type === 'cta'));
      document.blocks.splice(insertAt, 0, coupon);
    }

    let historyEntry: EmailHistoryEntry | undefined;
    let historyWarning: string | undefined;
    try {
      const savedContent = documentToContent(document);
      historyEntry = await addHistoryEntry({
        brandId: brand.id, templateType: input.templateType, engine: provider.engine, model: provider.model,
        prompt: input.prompt, subject: document.subject, content: savedContent,
        htmlSnapshot: renderEmail(brand, savedContent), rating: null, notes: '', offerId: offer?.id, brief: input.brief,
      }, user.id);
      await createHistoryVersion(historyEntry, 'generated');
    } catch (error) {
      console.error('No se pudo guardar el historial:', error instanceof Error ? error.message : 'error desconocido');
      historyWarning = 'El email se generó, pero no pudo guardarse en el historial.';
    }
    return NextResponse.json({
      document,
      historyId: historyEntry?.id,
      historyEntry,
      historySaved: Boolean(historyEntry),
      historyWarning,
      engine: provider.engine,
      model: provider.model,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: validationMessage(error) }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al generar el correo' }, { status: error instanceof MissingApiKeyError ? 400 : 500 });
  }
}
