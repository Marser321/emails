import type { BlockConfig, Brand, EmailContent, EmailDocumentV3, EmailDocumentV4, EmailTypography, TemplateType } from './types';
import { defaultPresetForObjective } from './template-presets';

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
): EmailDocumentV4 {
  const width = Math.min(700, Math.max(320, content.emailWidth || 600));
  const preset = content.presetId || defaultPresetForObjective(template).id;
  const typography: EmailTypography = {
    headingFont: content.typography?.headingFont || brand.fonts.heading || 'Arial',
    bodyFont: content.typography?.bodyFont || brand.fonts.body || 'Verdana',
    headingColor: content.typography?.headingColor || content.primaryColor || brand.colors.primary,
    bodyColor: content.typography?.bodyColor || '#425466', mutedColor: content.typography?.mutedColor || '#7a8792',
    linkColor: content.typography?.linkColor || content.accentColor || brand.colors.accent,
    ctaTextColor: content.typography?.ctaTextColor || '#ffffff',
  };
  return {
    schemaVersion: 4,
    brandId: brand.id,
    template,
    presetId: preset,
    subject: content.subject || content.headline || 'Email',
    preheader: content.preheader || content.body?.slice(0, 110) || '',
    locale: 'es',
    emailWidth: width,
    theme: {
      pageBackground: content.emailBgColor || '#eef2f6',
      bodyBackground: content.bodyBgColor || '#ffffff',
      emailWidth: width, typography,
      primaryColor: content.primaryColor || brand.colors.primary,
      accentColor: content.accentColor || brand.colors.accent,
      gradientStart: content.gradientStart || brand.colors.gradientStart,
      gradientEnd: content.gradientEnd || brand.colors.gradientEnd,
      headerBackground: content.headerBgColor || brand.colors.headerBg || content.primaryColor || brand.colors.primary,
      footerBackground: content.footerBgColor || brand.colors.footerBg || content.primaryColor || brand.colors.primary,
    },
    blocks: content.blocks?.length ? content.blocks : legacyContentToBlocks(content),
    compliance: {
      unsubscribeLabel: brand.footer.unsubscribeLabel || 'Cancelar suscripción',
      unsubscribeUrl: brand.footer.unsubscribeUrl || '{{unsubscribe}}',
      address: brand.footer.address || '{{location.full_address}}',
    },
  };
}

export function documentToContent(document: EmailDocumentV3 | EmailDocumentV4): EmailContent {
  return {
    subject: document.subject,
    preheader: document.preheader,
    label: '', headline: '', body: '', bulletsTitle: '', bullets: [], ctaText: '', ctaUrl: '',
    eventDate: '', eventTime: '', preCta: '', footerNote: '',
    emailWidth: document.emailWidth,
    emailBgColor: document.theme.pageBackground,
    bodyBgColor: document.theme.bodyBackground,
    presetId: document.schemaVersion === 4 ? document.presetId : undefined,
    typography: document.schemaVersion === 4 ? document.theme.typography : undefined,
    primaryColor: document.schemaVersion === 4 ? document.theme.primaryColor : undefined,
    accentColor: document.schemaVersion === 4 ? document.theme.accentColor : undefined,
    gradientStart: document.schemaVersion === 4 ? document.theme.gradientStart : undefined,
    gradientEnd: document.schemaVersion === 4 ? document.theme.gradientEnd : undefined,
    headerBgColor: document.schemaVersion === 4 ? document.theme.headerBackground : undefined,
    footerBgColor: document.schemaVersion === 4 ? document.theme.footerBackground : undefined,
    blocks: document.blocks,
    compliance: document.compliance,
  };
}

export function isEmailDocumentV4(value: unknown): value is EmailDocumentV4 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EmailDocumentV4>;
  return candidate.schemaVersion === 4 && typeof candidate.brandId === 'string' && typeof candidate.presetId === 'string'
    && typeof candidate.subject === 'string' && candidate.locale === 'es' && Array.isArray(candidate.blocks)
    && Boolean(candidate.theme?.typography && candidate.compliance);
}

export function normalizeEmailDocument(document: EmailDocumentV3 | EmailDocumentV4): EmailDocumentV4 {
  if (isEmailDocumentV4(document)) return document;
  const preset = defaultPresetForObjective(document.template);
  return {
    ...document,
    schemaVersion: 4,
    presetId: preset.id,
    theme: {
      ...document.theme,
      typography: {
        headingFont: 'Arial', bodyFont: 'Verdana', headingColor: '#10263a', bodyColor: '#425466',
        mutedColor: '#7a8792', linkColor: '#147ca8', ctaTextColor: '#ffffff',
      },
      primaryColor: '#0b2a4a', accentColor: '#2979b8', gradientStart: '#2979b8', gradientEnd: '#1b6fc4',
      headerBackground: '#0b2a4a', footerBackground: '#0b2a4a',
    },
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
