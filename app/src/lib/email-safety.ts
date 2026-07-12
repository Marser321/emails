import type { BlockConfig, BlockStyle, Brand, EmailContent, TextStyle } from './types';

export const EMAIL_SAFE_FONTS = ['Arial', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Verdana'] as const;

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function escapeTextWithBreaks(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

export function sanitizeEmailUrl(value: string | undefined, allowRelativeAssets = true): string {
  const url = (value || '').trim();
  if (!url) return '';
  if (/^{{\s*[a-zA-Z0-9_.-]+\s*}}$/.test(url)) return escapeHtml(url);
  if (allowRelativeAssets && /^(\/api\/assets\/|\/email-assets\/)/.test(url)) return escapeHtml(url);
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:', 'mailto:', 'tel:'].includes(parsed.protocol)) return '';
    return escapeHtml(url);
  } catch {
    return '';
  }
}

export function sanitizeColor(value: string | undefined, fallback: string): string {
  const color = (value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

function lightenHexColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round((255 - ((num >> 8) & 0x00ff)) * percent / 100));
  const b = Math.min(255, (num & 0x0000ff) + Math.round((255 - (num & 0x0000ff)) * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

export function sanitizeFont(value: string | undefined, fallback: string): string {
  const font = (value || '').trim();
  return /^[a-z0-9 -]{1,48}$/i.test(font) ? escapeHtml(font) : fallback;
}

function sanitizeTextStyle(style: TextStyle | undefined): TextStyle | undefined {
  if (!style) return undefined;
  const family = EMAIL_SAFE_FONTS.includes(style.fontFamily as typeof EMAIL_SAFE_FONTS[number]) ? style.fontFamily : undefined;
  const weights = [400, 500, 600, 700, 800] as const;
  return {
    color: style.color ? sanitizeColor(style.color, '#425466') : undefined,
    fontFamily: family,
    fontSize: clampOpt(style.fontSize, 10, 48),
    fontWeight: weights.includes(style.fontWeight as typeof weights[number]) ? style.fontWeight : undefined,
    lineHeight: typeof style.lineHeight === 'number' ? Math.min(2, Math.max(1, Math.round(style.lineHeight * 10) / 10)) : undefined,
    textAlign: ['left', 'center', 'right'].includes(style.textAlign || '') ? style.textAlign : undefined,
  };
}

function sanitizeBlockStyle(style: BlockStyle | undefined): BlockStyle | undefined {
  if (!style) return undefined;
  return {
    backgroundColor: style.backgroundColor ? sanitizeColor(style.backgroundColor, '#ffffff') : undefined,
    paddingTop: clampOpt(style.paddingTop, 0, 80), paddingRight: clampOpt(style.paddingRight, 0, 80),
    paddingBottom: clampOpt(style.paddingBottom, 0, 80), paddingLeft: clampOpt(style.paddingLeft, 0, 80),
    text: sanitizeTextStyle(style.text), label: sanitizeTextStyle(style.label), heading: sanitizeTextStyle(style.heading),
  };
}

// Clamp numérico que preserva undefined (los defaults viven en templates.ts)
export function clampOpt(value: number | undefined, min: number, max: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : undefined;
}

function sanitizeBlock(block: BlockConfig, accentColor = '#2979b8'): BlockConfig {
  const style = sanitizeBlockStyle(block.style);
  switch (block.type) {
    case 'hero':
      return {
        ...block, style, id: escapeHtml(block.id), imageUrl: sanitizeEmailUrl(block.imageUrl), alt: escapeHtml(block.alt || ''), href: sanitizeEmailUrl(block.href),
        borderRadius: clampOpt(block.borderRadius, 0, 32), widthPercent: clampOpt(block.widthPercent, 30, 100),
      };
    case 'text':
      return { ...block, style, id: escapeHtml(block.id), label: escapeHtml(block.label || ''), headline: escapeHtml(block.headline || ''), body: escapeTextWithBreaks(block.body || '') };
    case 'image-text':
      return {
        ...block, style, id: escapeHtml(block.id), imageUrl: sanitizeEmailUrl(block.imageUrl), alt: escapeHtml(block.alt || ''), title: escapeHtml(block.title || ''), text: escapeTextWithBreaks(block.text || ''),
        borderRadius: clampOpt(block.borderRadius, 0, 32), imageWidth: clampOpt(block.imageWidth, 120, 252),
      };
    case 'gallery':
      return {
        ...block,
        id: escapeHtml(block.id), style,
        caption: escapeHtml(block.caption || ''),
        images: block.images.map(image => ({ url: sanitizeEmailUrl(image.url), alt: escapeHtml(image.alt || ''), href: sanitizeEmailUrl(image.href) })),
        borderRadius: clampOpt(block.borderRadius, 0, 32),
      };
    case 'bullets':
      return {
        ...block, style, id: escapeHtml(block.id), bulletsTitle: escapeHtml(block.bulletsTitle || ''), bullets: block.bullets.map(escapeHtml),
        marker: escapeHtml(block.marker || ''), perBulletMarker: (block.perBulletMarker || []).map(escapeHtml),
      };
    case 'infobox':
      return { ...block, style, id: escapeHtml(block.id), eventDate: escapeHtml(block.eventDate || ''), eventTime: escapeHtml(block.eventTime || '') };
    case 'quote':
      return { ...block, style, id: escapeHtml(block.id), text: escapeTextWithBreaks(block.text || ''), author: escapeHtml(block.author || ''), role: escapeHtml(block.role || '') };
    case 'cta':
      return {
        ...block, style,
        id: escapeHtml(block.id),
        ctaText: escapeHtml(block.ctaText || ''), ctaUrl: sanitizeEmailUrl(block.ctaUrl),
        preCta: escapeHtml(block.preCta || ''), secondaryCtaText: escapeHtml(block.secondaryCtaText || ''),
        secondaryCtaUrl: sanitizeEmailUrl(block.secondaryCtaUrl),
        ctaBgColor: sanitizeColor(block.ctaBgColor, accentColor), ctaTextColor: sanitizeColor(block.ctaTextColor, '#ffffff'),
        ctaRadius: clampOpt(block.ctaRadius, 0, 28),
        ctaFullWidth: typeof block.ctaFullWidth === 'boolean' ? block.ctaFullWidth : false,
        ctaSize: ['sm', 'md', 'lg'].includes(block.ctaSize || '') ? block.ctaSize : 'md',
      };
    case 'band':
      return {
        ...block, style,
        id: escapeHtml(block.id),
        bgColor: sanitizeColor(block.bgColor, '#29abe2'),
        gradientStart: sanitizeColor(block.gradientStart, '#29abe2'),
        gradientEnd: sanitizeColor(block.gradientEnd, '#1b6fc4'),
        text: escapeHtml(block.text || ''),
        textColor: sanitizeColor(block.textColor, '#ffffff'),
        emoji: escapeHtml(block.emoji || ''),
        height: clampOpt(block.height, 4, 80),
      };
    case 'badge':
      return {
        ...block, style,
        id: escapeHtml(block.id),
        text: escapeHtml(block.text || ''),
        emoji: escapeHtml(block.emoji || ''),
        bgColor: sanitizeColor(block.bgColor, accentColor),
        textColor: sanitizeColor(block.textColor, '#ffffff'),
        align: ['left', 'center', 'right'].includes(block.align || '') ? block.align : 'center',
      };
    case 'callout': {
      const calloutAccent = sanitizeColor(block.accentColor, accentColor);
      return {
        ...block, style,
        id: escapeHtml(block.id),
        emoji: escapeHtml(block.emoji || ''),
        title: escapeHtml(block.title || ''),
        body: escapeTextWithBreaks(block.body || ''),
        bgColor: sanitizeColor(block.bgColor, lightenHexColor(calloutAccent, 85)),
        accentColor: calloutAccent,
      };
    }
    case 'divider':
      return {
        ...block, style,
        id: escapeHtml(block.id),
        color: sanitizeColor(block.color, '#e5eaf0'),
        thickness: clampOpt(block.thickness, 1, 8),
        lineStyle: ['solid', 'dashed', 'dotted'].includes(block.lineStyle || '') ? block.lineStyle : 'solid',
        ornament: escapeHtml(block.ornament || ''),
      };
    case 'footer':
      return { ...block, style, id: escapeHtml(block.id), footerNote: escapeHtml(block.footerNote || '') };
    case 'spacer':
      return { ...block, style, id: escapeHtml(block.id), height: Math.min(80, Math.max(4, block.height || 20)) };
    default:
      return { ...block, style, id: escapeHtml(block.id) };
  }
}

export function sanitizeBrandForEmail(input: Brand): Brand {
  return {
    ...input,
    name: escapeHtml(input.name),
    category: escapeHtml(input.category),
    colors: {
      primary: sanitizeColor(input.colors.primary, '#0b2a4a'),
      accent: sanitizeColor(input.colors.accent, '#2979b8'),
      gradientStart: sanitizeColor(input.colors.gradientStart, '#2979b8'),
      gradientEnd: sanitizeColor(input.colors.gradientEnd, '#1b6fc4'),
      headerBg: sanitizeColor(input.colors.headerBg, input.colors.primary),
      footerBg: sanitizeColor(input.colors.footerBg, input.colors.primary),
    },
    fonts: {
      heading: sanitizeFont(input.fonts.heading, 'Arial'),
      body: sanitizeFont(input.fonts.body, 'Arial'),
    },
    logo: {
      ...input.logo,
      value: input.logo.type === 'image' ? sanitizeEmailUrl(input.logo.value) : escapeHtml(input.logo.value),
      imageWidth: Math.min(280, Math.max(80, input.logo.imageWidth || 180)),
    },
    footer: {
      tagline: escapeHtml(input.footer.tagline || ''),
      subtitle: escapeHtml(input.footer.subtitle || ''),
      disclaimer: escapeTextWithBreaks(input.footer.disclaimer || ''),
      address: escapeHtml(input.footer.address || '{{location.full_address}}'),
      unsubscribeLabel: escapeHtml(input.footer.unsubscribeLabel || 'Cancelar suscripción'),
      unsubscribeUrl: sanitizeEmailUrl(input.footer.unsubscribeUrl || '{{unsubscribe}}'),
    },
  };
}

export function sanitizeContentForEmail(input: EmailContent): EmailContent {
  return {
    ...input,
    subject: escapeHtml(input.subject || input.headline || 'Email'),
    preheader: escapeHtml(input.preheader || ''),
    label: escapeHtml(input.label || ''),
    headline: escapeHtml(input.headline || ''),
    body: escapeTextWithBreaks(input.body || ''),
    bulletsTitle: escapeHtml(input.bulletsTitle || ''),
    bullets: (input.bullets || []).map(escapeHtml),
    ctaText: escapeHtml(input.ctaText || ''),
    ctaUrl: sanitizeEmailUrl(input.ctaUrl),
    eventDate: escapeHtml(input.eventDate || ''),
    eventTime: escapeHtml(input.eventTime || ''),
    preCta: escapeHtml(input.preCta || ''),
    footerNote: escapeHtml(input.footerNote || ''),
    emailBgColor: sanitizeColor(input.emailBgColor, '#eef2f6'),
    bodyBgColor: sanitizeColor(input.bodyBgColor, '#ffffff'),
    primaryColor: sanitizeColor(input.primaryColor, '#0b2a4a'),
    accentColor: sanitizeColor(input.accentColor, '#2979b8'),
    gradientStart: sanitizeColor(input.gradientStart, '#2979b8'),
    gradientEnd: sanitizeColor(input.gradientEnd, '#1b6fc4'),
    headerBgColor: sanitizeColor(input.headerBgColor, input.primaryColor || '#0b2a4a'),
    footerBgColor: sanitizeColor(input.footerBgColor, input.primaryColor || '#0b2a4a'),
    presetId: input.presetId,
    typography: input.typography ? {
      headingFont: sanitizeFont(input.typography.headingFont, 'Arial'),
      bodyFont: sanitizeFont(input.typography.bodyFont, 'Verdana'),
      headingColor: sanitizeColor(input.typography.headingColor, '#10263a'),
      bodyColor: sanitizeColor(input.typography.bodyColor, '#425466'),
      mutedColor: sanitizeColor(input.typography.mutedColor, '#7a8792'),
      linkColor: sanitizeColor(input.typography.linkColor, '#147ca8'),
      ctaTextColor: sanitizeColor(input.typography.ctaTextColor, '#ffffff'),
    } : undefined,
    textureUrl: sanitizeEmailUrl(input.textureUrl),
    headerTextureUrl: sanitizeEmailUrl(input.headerTextureUrl),
    secondaryCtaText: escapeHtml(input.secondaryCtaText || ''),
    secondaryCtaUrl: sanitizeEmailUrl(input.secondaryCtaUrl),
    emailWidth: Math.min(700, Math.max(320, input.emailWidth || 600)),
    hero: input.hero ? {
      ...input.hero, imageUrl: sanitizeEmailUrl(input.hero.imageUrl), alt: escapeHtml(input.hero.alt || ''), href: sanitizeEmailUrl(input.hero.href),
      borderRadius: clampOpt(input.hero.borderRadius, 0, 32), widthPercent: clampOpt(input.hero.widthPercent, 30, 100),
    } : undefined,
    imageText: input.imageText ? {
      ...input.imageText, imageUrl: sanitizeEmailUrl(input.imageText.imageUrl), alt: escapeHtml(input.imageText.alt || ''),
      title: escapeHtml(input.imageText.title || ''), text: escapeTextWithBreaks(input.imageText.text || ''),
      borderRadius: clampOpt(input.imageText.borderRadius, 0, 32), imageWidth: clampOpt(input.imageText.imageWidth, 120, 252),
    } : undefined,
    gallery: input.gallery ? {
      ...input.gallery, caption: escapeHtml(input.gallery.caption || ''), images: input.gallery.images.map(image => ({
        url: sanitizeEmailUrl(image.url), alt: escapeHtml(image.alt || ''), href: sanitizeEmailUrl(image.href),
      })),
      borderRadius: clampOpt(input.gallery.borderRadius, 0, 32),
    } : undefined,
    quote: input.quote ? {
      ...input.quote, text: escapeTextWithBreaks(input.quote.text || ''), author: escapeHtml(input.quote.author || ''), role: escapeHtml(input.quote.role || ''),
    } : undefined,
    blocks: input.blocks?.map(block => sanitizeBlock(block, sanitizeColor(input.accentColor, '#2979b8'))),
    compliance: input.compliance ? {
      unsubscribeLabel: escapeHtml(input.compliance.unsubscribeLabel || 'Cancelar suscripción'),
      unsubscribeUrl: sanitizeEmailUrl(input.compliance.unsubscribeUrl || '{{unsubscribe}}'),
      address: escapeHtml(input.compliance.address || '{{location.full_address}}'),
    } : undefined,
  };
}
