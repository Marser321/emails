import type { BlockConfig, CanvasBlockType, Brand, EmailContent, EmailDocumentV3, EmailDocumentV4, EmailTypography, TemplateType } from './types';
import { defaultPresetForObjective } from './template-presets';

// Orden canónico de render (el mismo que produce legacyContentToBlocks). Se usa
// cuando la pestaña "Contenido" debe CREAR un bloque porque el usuario empezó a
// escribir en un campo cuyo bloque aún no existía: el bloque nuevo se inserta en
// la posición que respeta este orden, sin reordenar los bloques existentes.
export const CANONICAL_BLOCK_ORDER: CanvasBlockType[] = [
  'header', 'hero', 'text', 'image-text', 'bullets', 'gallery', 'quote', 'infobox',
  'band', 'badge', 'callout', 'coupon', 'cta', 'divider', 'spacer', 'footer',
];

function canonicalIndex(type: CanvasBlockType): number {
  const index = CANONICAL_BLOCK_ORDER.indexOf(type);
  return index < 0 ? CANONICAL_BLOCK_ORDER.length : index;
}

// Inserta un bloque respetando el orden canónico entre los bloques actuales
// (antes del primer bloque con orden mayor; si no hay, al final).
export function insertBlockInOrder(blocks: BlockConfig[], block: BlockConfig): BlockConfig[] {
  const order = canonicalIndex(block.type);
  let at = blocks.length;
  for (let i = 0; i < blocks.length; i++) {
    if (canonicalIndex(blocks[i].type) > order) { at = i; break; }
  }
  const next = [...blocks];
  next.splice(at, 0, block);
  return next;
}

// Mueve un bloque de una posición a otra (reordenamiento). Función pura
// compartida por el Canvas y la pestaña "Contenido".
export function moveBlock(blocks: BlockConfig[], from: number, to: number): BlockConfig[] {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

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
      id: 'legacy-cta', type: 'cta', ctaText: content.ctaText || '', ctaUrl: content.ctaUrl || '',
      preCta: content.preCta, secondaryCtaText: content.secondaryCtaText, secondaryCtaUrl: content.secondaryCtaUrl,
    });
  }
  blocks.push({ id: 'legacy-footer', type: 'footer', footerNote: content.footerNote });
  return blocks;
}

// D1 — content.blocks[] como fuente única de verdad: usar en todo punto de
// carga del editor (creación de email nuevo, reapertura desde historial,
// carga de borradores) para migrar contenido legacy sin tocar su apariencia.
// Si blocks ya está poblado (documento migrado o creado en Canvas) se
// devuelve tal cual; si no, se deriva de los campos legacy con
// legacyContentToBlocks, igual que hace renderEmail() al renderizar.
export function ensureContentBlocks(content: EmailContent): EmailContent {
  return content.blocks?.length ? content : { ...content, blocks: legacyContentToBlocks(content) };
}

// D2: prepara el contenido antes de persistir (borradores/historial). El editor
// puede tener bloques en progreso incompletos (creados al vuelo al escribir un
// campo); esto los ajusta para que pasen la validación estricta de guardado sin
// perder datos reales:
//  - descarta bloques estructurales vacíos (hero/imagen-texto sin imagen,
//    galería sin imágenes, badge sin texto) — no hay nada que persistir.
//  - rellena el `alt` obligatorio (accesibilidad) que la pestaña Contenido no
//    expone, con un valor por defecto seguro.
export function prepareContentForSave(content: EmailContent): EmailContent {
  if (!content.blocks?.length) return content;
  const blocks = content.blocks
    .filter(block => {
      switch (block.type) {
        case 'hero':
        case 'image-text': return Boolean(block.imageUrl?.trim());
        case 'gallery': return (block.images || []).some(image => image.url?.trim());
        case 'badge': return Boolean(block.text?.trim());
        default: return true;
      }
    })
    .map(block => {
      if (block.type === 'hero') return { ...block, alt: block.alt?.trim() || 'Imagen' };
      if (block.type === 'image-text') return { ...block, alt: block.alt?.trim() || 'Imagen' };
      if (block.type === 'gallery') {
        return { ...block, images: block.images.filter(image => image.url?.trim()).map(image => ({ ...image, alt: image.alt?.trim() || 'Imagen' })) };
      }
      return block;
    });
  return { ...content, blocks };
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
  // D3: content.blocks[] es la fuente de verdad; no se rellenan campos legacy de
  // contenido (quedan undefined). El render y la UI operan sobre blocks.
  return {
    subject: document.subject,
    preheader: document.preheader,
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
