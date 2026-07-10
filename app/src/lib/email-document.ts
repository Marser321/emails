import type { BlockConfig, Brand, EmailContent, EmailDocumentV3, TemplateType } from './types';

export function legacyContentToBlocks(content: EmailContent): BlockConfig[] {
  const blocks: BlockConfig[] = [{ id: 'legacy-header', type: 'header' }];
  if (content.hero?.imageUrl) blocks.push({ id: 'legacy-hero', type: 'hero', ...content.hero });
  if (content.label || content.headline || content.body) {
    blocks.push({ id: 'legacy-text', type: 'text', label: content.label, headline: content.headline, body: content.body });
  }
  if (content.imageText?.imageUrl && content.imageText.text) blocks.push({ id: 'legacy-image-text', type: 'image-text', ...content.imageText });
  if (content.bulletsTitle || content.bullets?.some(Boolean)) {
    blocks.push({ id: 'legacy-bullets', type: 'bullets', bulletsTitle: content.bulletsTitle, bullets: content.bullets || [] });
  }
  if (content.gallery?.images?.some(image => image.url)) blocks.push({ id: 'legacy-gallery', type: 'gallery', ...content.gallery });
  if (content.quote?.text) blocks.push({ id: 'legacy-quote', type: 'quote', ...content.quote });
  if (content.eventDate || content.eventTime) blocks.push({ id: 'legacy-infobox', type: 'infobox', eventDate: content.eventDate, eventTime: content.eventTime });
  if (content.ctaText || content.preCta) {
    blocks.push({
      id: 'legacy-cta', type: 'cta', ctaText: content.ctaText, ctaUrl: content.ctaUrl,
      preCta: content.preCta, secondaryCtaText: content.secondaryCtaText, secondaryCtaUrl: content.secondaryCtaUrl,
    });
  }
  blocks.push({ id: 'legacy-footer', type: 'footer', footerNote: content.footerNote });
  return blocks;
}

export function createEmailDocument(
  brand: Brand,
  template: TemplateType,
  content: EmailContent,
): EmailDocumentV3 {
  const width = Math.min(700, Math.max(320, content.emailWidth || 600));
  return {
    schemaVersion: 3,
    brandId: brand.id,
    template,
    subject: content.subject || content.headline || 'Email',
    preheader: content.preheader || content.body?.slice(0, 110) || '',
    locale: 'es',
    emailWidth: width,
    theme: {
      pageBackground: content.emailBgColor || '#eef2f6',
      bodyBackground: content.bodyBgColor || '#ffffff',
      emailWidth: width,
    },
    blocks: content.blocks?.length ? content.blocks : legacyContentToBlocks(content),
    compliance: {
      unsubscribeLabel: brand.footer.unsubscribeLabel || 'Cancelar suscripción',
      unsubscribeUrl: brand.footer.unsubscribeUrl || '{{unsubscribe}}',
      address: brand.footer.address || '{{location.full_address}}',
    },
  };
}

export function documentToContent(document: EmailDocumentV3): EmailContent {
  return {
    subject: document.subject,
    preheader: document.preheader,
    label: '', headline: '', body: '', bulletsTitle: '', bullets: [], ctaText: '', ctaUrl: '',
    eventDate: '', eventTime: '', preCta: '', footerNote: '',
    emailWidth: document.emailWidth,
    emailBgColor: document.theme.pageBackground,
    bodyBgColor: document.theme.bodyBackground,
    blocks: document.blocks,
    compliance: document.compliance,
  };
}

export function isEmailDocumentV3(value: unknown): value is EmailDocumentV3 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EmailDocumentV3>;
  const templates: TemplateType[] = ['masterclass', 'registration', 'followup', 'promo', 'reminder', 'newsletter', 'sales', 'financial_advisory', 'onboarding'];
  return candidate.schemaVersion === 3
    && typeof candidate.brandId === 'string' && candidate.brandId.length > 0
    && templates.includes(candidate.template as TemplateType)
    && typeof candidate.subject === 'string'
    && typeof candidate.preheader === 'string'
    && candidate.locale === 'es'
    && typeof candidate.emailWidth === 'number' && candidate.emailWidth >= 320 && candidate.emailWidth <= 700
    && Boolean(candidate.theme && typeof candidate.theme.pageBackground === 'string' && typeof candidate.theme.bodyBackground === 'string')
    && Array.isArray(candidate.blocks) && candidate.blocks.length >= 2
    && candidate.blocks.every(block => Boolean(block && typeof block.id === 'string' && typeof block.type === 'string'))
    && Boolean(candidate.compliance && typeof candidate.compliance.unsubscribeUrl === 'string' && typeof candidate.compliance.address === 'string');
}
