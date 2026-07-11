// Template Engine — Generates email-client-compatible HTML
import { BlockConfig, Brand, EmailContent, GalleryBlock, HeroBlock, ImageTextBlock, LayoutVariant, QuoteBlock } from './types';
import { legacyContentToBlocks } from './email-document';
import { sanitizeBrandForEmail, sanitizeContentForEmail } from './email-safety';

export interface RenderOptions {
  // Base pública para reescribir /api/assets/ al exportar (se aplica client-side en export.ts)
  assetBaseUrl?: string;
}

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0x0000ff) - Math.round(255 * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

/**
 * Lighten a hex color with opacity simulation on white
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round((255 - ((num >> 8) & 0x00ff)) * percent / 100));
  const b = Math.min(255, (num & 0x0000ff) + Math.round((255 - (num & 0x0000ff)) * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

/**
 * Detect if a hex color is dark using YIQ luminance formula
 */
function isColorDark(hex: string): boolean {
  if (!hex) return true;
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  if (color.length !== 6) return true;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}

/**
 * Returns the correct logo version depending on background darkness
 */
function getEffectiveLogoUrl(brand: Brand, isBgDark: boolean): string {
  if (brand.id === 'admediasolution' && brand.logo.value.includes('logo.png')) {
    return isBgDark ? '/api/assets/admediasolution/logo-white.png' : '/api/assets/admediasolution/logo.png';
  }
  return brand.logo.value;
}

/**
 * Image logo, optionally with the business name next to / below it.
 * Table-based (MSO-safe) — never flexbox.
 */
function renderImageLogoWithName(brand: Brand, width: number, fontSize: number, logoUrl: string): string {
  const img = `<img src="${logoUrl}" alt="${brand.name}" width="${width}" style="display:block;max-width:${width}px;height:auto;" border="0">`;
  if (!brand.logo.showName) {
    return `<img src="${logoUrl}" alt="${brand.name}" width="${width}" style="display:block;margin:0 auto;max-width:${width}px;height:auto;" border="0">`;
  }
  const nameHtml = `<span style="font-family:'${brand.fonts.heading}','Open Sans',Arial,sans-serif;font-size:${fontSize}px;font-weight:800;color:#ffffff;white-space:nowrap;">${brand.name}</span>`;
  if (brand.logo.namePosition === 'below') {
    return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
<tr><td align="center" style="padding:0 0 8px;">${img}</td></tr>
<tr><td align="center" style="vertical-align:middle;">${nameHtml}</td></tr>
</table>`;
  }
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
<tr>
<td style="vertical-align:middle;">${img}</td>
<td style="vertical-align:middle;padding-left:12px;">${nameHtml}</td>
</tr>
</table>`;
}

/**
 * Generate the logo HTML based on brand configuration
 */
function renderLogo(brand: Brand, headerBg: string): string {
  const isBgDark = isColorDark(headerBg);
  const logoUrl = getEffectiveLogoUrl(brand, isBgDark);

  if (brand.logo.type === 'image') {
    return renderImageLogoWithName(brand, brand.logo.imageWidth || 180, 22, logoUrl);
  }

  // Text logo — split by |
  const parts = brand.logo.value.split('|');
  if (parts.length === 2) {
    return `<span style="color:#ffffff;font-weight:700;">${parts[0]}</span> <span style="color:${brand.colors.accent};font-weight:700;">${parts[1]}</span>`;
  }
  return `<span style="color:#ffffff;font-weight:700;">${brand.logo.value}</span>`;
}

/**
 * Generate the footer logo HTML (smaller version)
 */
function renderFooterLogo(brand: Brand, footerBg: string): string {
  const isBgDark = isColorDark(footerBg);
  const logoUrl = getEffectiveLogoUrl(brand, isBgDark);

  if (brand.logo.type === 'image') {
    if (brand.logo.showName) {
      return `<img src="${logoUrl}" alt="${brand.name}" width="120" style="display:block;margin:0 auto 6px;max-width:120px;height:auto;" border="0"><span style="font-family:'${brand.fonts.heading}','Open Sans',Arial,sans-serif;font-size:14px;font-weight:800;color:#ffffff;">${brand.name}</span>`;
    }
    return `<img src="${logoUrl}" alt="${brand.name}" width="120" style="display:block;margin:0 auto 8px;max-width:120px;height:auto;" border="0">`;
  }

  const parts = brand.logo.value.split('|');
  if (parts.length === 2) {
    return `<span style="color:#ffffff;font-weight:700;">${parts[0]}</span> <span style="color:${brand.colors.accent};font-weight:700;">${parts[1]}</span>`;
  }
  return `<span style="color:#ffffff;font-weight:700;">${brand.logo.value}</span>`;
}

/**
 * Render bullet points
 */
function renderBullets(bullets: string[], accentColor: string): string {
  return bullets
    .map((b, i) => {
      if (!b.trim()) return '';
      return `
  <p data-editor-field="bullet-${i}" class="bullet-text" style="margin:0 0 6px;font-family:Verdana,Geneva,sans-serif;font-size:16px;line-height:1.5;color:#4a5568;">
    <span style="color:${accentColor};font-weight:700;">&#8226;</span> ${b}
  </p>`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Render the info box (date/time or custom content)
 */
function renderInfoBox(content: EmailContent, brand: Brand): string {
  if (!content.eventDate && !content.eventTime) return '';
  
  const infoBoxBg = lightenColor(brand.colors.accent, 85);
  
  return `
  <!-- Info Box -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${infoBoxBg};border:2px solid ${brand.colors.accent}33;border-radius:12px;margin:0 0 28px;">
  <tr>
  <td class="info-box-cell" style="padding:20px 24px;text-align:center;">
    ${content.eventDate ? `<p data-editor-field="eventDate" style="margin:0 0 4px;font-family:Verdana,Geneva,sans-serif;font-size:16px;color:${brand.colors.primary};font-weight:800;">${content.eventDate}</p>` : ''}
    ${content.eventTime ? `<p data-editor-field="eventTime" style="margin:0;font-family:Verdana,Geneva,sans-serif;font-size:16px;color:${brand.colors.accent};font-weight:700;">${content.eventTime}</p>` : ''}
  </td>
  </tr>
  </table>`;
}

/**
 * Hero image — full container width, optional link. Table + width attribute (Outlook-safe).
 */
function renderHero(hero: HeroBlock | undefined): string {
  if (!hero?.imageUrl) return '';
  const padding = hero.fullBleed ? '0' : '16px 16px 0';
  const baseWidth = hero.fullBleed ? 600 : 568;
  const pct = Math.min(100, Math.max(30, hero.widthPercent ?? 100));
  const width = Math.round((baseWidth * pct) / 100);
  const radius = Math.min(32, Math.max(0, hero.borderRadius ?? 0));
  const radiusStyle = radius > 0 ? `border-radius:${radius}px;` : '';
  const img = `<img src="${hero.imageUrl}" alt="${hero.alt || ''}" width="${width}" class="hero-img" data-editor-field="hero" style="display:block;width:100%;max-width:${width}px;height:auto;${radiusStyle}" border="0">`;
  let inner = hero.href
    ? `<a href="${hero.href}" target="_blank" rel="noopener noreferrer nofollow" style="display:block;">${img}</a>`
    : img;
  if (pct < 100) {
    // Centrado Outlook-safe: tabla con align, nunca margin/flex
    inner = `<table role="presentation" align="center" width="${width}" cellpadding="0" cellspacing="0" border="0"><tr><td>${inner}</td></tr></table>`;
  }
  return `
<!-- ====== HERO ====== -->
<tr>
<td style="padding:${padding};">${inner}</td>
</tr>`;
}

/**
 * Image + text side by side. MSO conditional fixed widths + .stack-column for mobile.
 * For imagePosition 'right', the text cell goes first in the DOM (MSO respects DOM order).
 */
function renderImageTextBlock(block: ImageTextBlock | undefined, brand: Brand): string {
  if (!block?.imageUrl || !block?.text) return '';
  const imgWidth = Math.min(252, Math.max(120, Math.round(block.imageWidth ?? 252)));
  const radius = Math.min(32, Math.max(0, block.borderRadius ?? 8));
  const imgCell = `
<!--[if mso]><td width="260" valign="top"><![endif]-->
<div class="stack-column" style="display:inline-block;width:100%;max-width:260px;vertical-align:top;text-align:center;">
  <img src="${block.imageUrl}" alt="${block.alt || ''}" width="${imgWidth}" data-editor-field="imageText" style="display:inline-block;width:100%;max-width:${imgWidth}px;height:auto;border-radius:${radius}px;" border="0">
</div>
<!--[if mso]></td><![endif]-->`;
  const textCell = `
<!--[if mso]><td width="260" valign="top"><![endif]-->
<div class="stack-column" style="display:inline-block;width:100%;max-width:260px;vertical-align:top;">
  ${block.title ? `<p style="margin:0 0 8px;font-family:'${brand.fonts.heading}','Open Sans',Arial,sans-serif;font-size:17px;font-weight:800;color:${brand.colors.primary};">${block.title}</p>` : ''}
  <p style="margin:0;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:14px;line-height:1.6;color:#4a5568;">${block.text}</p>
</div>
<!--[if mso]></td><![endif]-->`;
  const cells = block.imagePosition === 'right' ? textCell + imgCell : imgCell + textCell;
  return `
<!-- Image + Text -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
<tr>
<td style="text-align:center;font-size:0;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><![endif]-->
${cells}
<!--[if mso]></tr></table><![endif]-->
</td>
</tr>
</table>`;
}

/**
 * Gallery of 2-3 images per row (adsets). Fixed width attributes — Outlook ignores max-width.
 */
function renderGallery(gallery: GalleryBlock | undefined, brand: Brand): string {
  const images = gallery?.images?.filter(img => img.url) || [];
  if (!images.length) return '';
  const cols = gallery!.columns === 3 ? 3 : 2;
  const cellWidth = cols === 3 ? 168 : 260;
  const radius = Math.min(32, Math.max(0, gallery!.borderRadius ?? 8));

  const rows: string[] = [];
  for (let i = 0; i < images.length; i += cols) {
    const rowImages = images.slice(i, i + cols);
    const cells = rowImages
      .map((img, j) => {
        const tag = `<img src="${img.url}" alt="${img.alt || ''}" width="${cellWidth}" data-editor-field="gallery-${i + j}" style="display:block;width:100%;max-width:${cellWidth}px;height:auto;border-radius:${radius}px;" border="0">`;
        const inner = img.href
          ? `<a href="${img.href}" target="_blank" rel="noopener noreferrer nofollow" style="display:block;">${tag}</a>`
          : tag;
        return `
<!--[if mso]><td width="${cellWidth}" valign="top"><![endif]-->
<div class="stack-column" style="display:inline-block;width:100%;max-width:${cellWidth}px;vertical-align:top;padding:0 4px 8px;box-sizing:border-box;">${inner}</div>
<!--[if mso]></td><![endif]-->`;
      })
      .join('\n');
    rows.push(`
<tr>
<td style="text-align:center;font-size:0;">
<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><![endif]-->
${cells}
<!--[if mso]></tr></table><![endif]-->
</td>
</tr>`);
  }

  return `
<!-- Gallery -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
${rows.join('\n')}
${gallery!.caption ? `<tr><td style="text-align:center;padding:4px 0 0;"><p style="margin:0;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:12px;color:#9aa6b2;">${gallery!.caption}</p></td></tr>` : ''}
</table>`;
}

/**
 * Quote / testimonial. Accent bar as a bgcolor cell (border-left is inconsistent in Outlook).
 */
function renderQuote(quote: QuoteBlock | undefined, brand: Brand): string {
  if (!quote?.text) return '';
  return `
<!-- Quote -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
<tr>
<td width="4" bgcolor="${brand.colors.accent}" style="width:4px;font-size:0;line-height:0;">&nbsp;</td>
<td style="padding:4px 0 4px 16px;">
  <p data-editor-field="quote" style="margin:0 0 6px;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:16px;line-height:1.6;color:#4a5568;font-style:italic;">"${quote.text}"</p>
  ${quote.author ? `<p style="margin:0;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:13px;color:${brand.colors.primary};font-weight:700;">— ${quote.author}${quote.role ? `<span style="color:#9aa6b2;font-weight:400;"> · ${quote.role}</span>` : ''}</p>` : ''}
</td>
</tr>
</table>`;
}

/**
 * Subtle divider between sections.
 */
function renderDivider(show: boolean | undefined): string {
  if (!show) return '';
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #e5eaf0;font-size:0;line-height:0;padding-top:20px;">&nbsp;</td></tr></table>`;
}

/**
 * Render the CTA button with VML fallback for Outlook
 */
function renderCTA(text: string, url: string, bgColor: string, fieldName: 'ctaText' | 'secondaryCtaText' | string = 'ctaText'): string {
  if (!text || !url) return '';
  
  return `
  <!-- CTA Button -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="cta-table">
  <tr>
  <td align="center" style="padding:0 0 8px;">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:52px;v-text-anchor:middle;width:320px;" arcsize="15%" fillcolor="${bgColor}">
    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">${text}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${url}" target="_blank" rel="noopener noreferrer nofollow" class="cta-btn" data-editor-field="${fieldName}" style="display:inline-block;background:${bgColor};color:#ffffff;font-family:'Montserrat','Open Sans',Arial,sans-serif;font-size:17px;font-weight:700;text-decoration:none;padding:15px 42px;border-radius:8px;letter-spacing:0.5px;width:auto;">${text}</a>
    <!--<![endif]-->
  </td>
  </tr>
  </table>`;
}

// ===== Canvas Block Renderer =====

/**
 * Render a single modular canvas block into email-compatible HTML.
 * Each block gets a data-editor-field attribute for interactive click-to-edit.
 */
function renderCanvasBlock(block: BlockConfig, brand: Brand, index: number): string {
  const accent = brand.colors.accent;
  const primary = brand.colors.primary;
  const headingFont = brand.fonts.heading || 'Montserrat';
  const bodyFont = brand.fonts.body || 'Montserrat';
  const headerBg = brand.colors.headerBg || primary;
  const footerBg = brand.colors.footerBg || primary;
  const prefix = `block-${index}`;

  switch (block.type) {
    case 'header': {
      const logoHtml = renderLogo(brand, headerBg);
      const isImgLogo = brand.logo.type === 'image';
      return `
<!-- ====== BLOCK ${index}: HEADER ====== -->
<tr>
<td class="header-cell" data-editor-field="${prefix}" style="background-color:${headerBg};padding:26px 32px;text-align:center;" bgcolor="${headerBg}">
  ${isImgLogo ? logoHtml : `<p class="header-logo-text" style="margin:0;font-family:${bodyFont},Geneva,sans-serif;font-size:26px;font-weight:700;">${logoHtml}</p>`}
</td>
</tr>
<!-- GRADIENT BAR -->
<tr>
<td style="height:4px;background-color:${accent};background-image:linear-gradient(90deg,${brand.colors.gradientStart},${brand.colors.gradientEnd});line-height:4px;font-size:0;">&nbsp;</td>
</tr>`;
    }

    case 'hero': {
      return renderHero({
        imageUrl: block.imageUrl, alt: block.alt, href: block.href, fullBleed: block.fullBleed,
        borderRadius: block.borderRadius, widthPercent: block.widthPercent,
      }).replace('data-editor-field="hero"', `data-editor-field="${prefix}-imageUrl"`);
    }

    case 'text': {
      const parts: string[] = [];
      if (block.label) {
        parts.push(`<p data-editor-field="${prefix}-label" style="margin:0 0 6px;font-family:${bodyFont},Geneva,sans-serif;font-size:13px;color:${accent};font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">${block.label}</p>`);
      }
      if (block.headline) {
        parts.push(`<h1 data-editor-field="${prefix}-headline" class="email-headline" style="margin:0 0 16px;font-family:'${headingFont}','Open Sans',Arial,sans-serif;color:${primary};font-size:26px;font-weight:800;line-height:1.25;">${block.headline}</h1>`);
      }
      if (block.body) {
        parts.push(`<p data-editor-field="${prefix}-body" class="email-body-text" style="margin:0 0 18px;font-family:${bodyFont},Geneva,sans-serif;font-size:16px;line-height:1.6;color:#4a5568;">${block.body}</p>`);
      }
      if (!parts.length) return '';
      return `
<!-- ====== BLOCK ${index}: TEXT ====== -->
<tr>
<td class="email-body-cell" style="padding:24px 32px 16px;">
  ${parts.join('\n  ')}
</td>
</tr>`;
    }

    case 'image-text': {
      const html = renderImageTextBlock(
        {
          imageUrl: block.imageUrl, alt: block.alt, title: block.title, text: block.text, imagePosition: block.imagePosition,
          borderRadius: block.borderRadius, imageWidth: block.imageWidth,
        },
        brand
      );
      if (!html) return '';
      return `
<!-- ====== BLOCK ${index}: IMAGE-TEXT ====== -->
<tr>
<td style="padding:8px 32px;" data-editor-field="${prefix}">
  ${html}
</td>
</tr>`;
    }

    case 'gallery': {
      const html = renderGallery({ images: block.images, columns: block.columns, caption: block.caption, borderRadius: block.borderRadius }, brand);
      if (!html) return '';
      return `
<!-- ====== BLOCK ${index}: GALLERY ====== -->
<tr>
<td style="padding:8px 32px;" data-editor-field="${prefix}">
  ${html}
</td>
</tr>`;
    }

    case 'bullets': {
      const bulletsHtml = renderBullets(block.bullets || [], accent);
      if (!bulletsHtml && !block.bulletsTitle) return '';
      return `
<!-- ====== BLOCK ${index}: BULLETS ====== -->
<tr>
<td style="padding:8px 32px;" data-editor-field="${prefix}">
  ${block.bulletsTitle ? `<p style="margin:0 0 10px;font-family:${bodyFont},Geneva,sans-serif;font-size:16px;color:${primary};font-weight:800;">${block.bulletsTitle}</p>` : ''}
  ${bulletsHtml}
</td>
</tr>`;
    }

    case 'infobox': {
      if (!block.eventDate && !block.eventTime) return '';
      const infoBoxBg = lightenColor(accent, 85);
      return `
<!-- ====== BLOCK ${index}: INFOBOX ====== -->
<tr>
<td style="padding:8px 32px;" data-editor-field="${prefix}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${infoBoxBg};border:2px solid ${accent}33;border-radius:12px;">
  <tr>
  <td class="info-box-cell" style="padding:20px 24px;text-align:center;">
    ${block.eventDate ? `<p style="margin:0 0 4px;font-family:${bodyFont},Geneva,sans-serif;font-size:16px;color:${primary};font-weight:800;">${block.eventDate}</p>` : ''}
    ${block.eventTime ? `<p style="margin:0;font-family:${bodyFont},Geneva,sans-serif;font-size:16px;color:${accent};font-weight:700;">${block.eventTime}</p>` : ''}
  </td>
  </tr>
  </table>
</td>
</tr>`;
    }

    case 'quote': {
      const html = renderQuote({ text: block.text, author: block.author, role: block.role }, brand);
      if (!html) return '';
      return `
<!-- ====== BLOCK ${index}: QUOTE ====== -->
<tr>
<td style="padding:8px 32px;" data-editor-field="${prefix}">
  ${html}
</td>
</tr>`;
    }

    case 'cta': {
      const ctaMain = renderCTA(block.ctaText, block.ctaUrl, accent, `${prefix}-ctaText`);
      const ctaSec = block.secondaryCtaText && block.secondaryCtaUrl
        ? renderCTA(block.secondaryCtaText, block.secondaryCtaUrl, primary, `${prefix}-secondaryCtaText`)
        : '';
      const preCta = block.preCta
        ? `<p data-editor-field="${prefix}-preCta" class="pre-cta-text" style="margin:0 0 16px;font-family:${bodyFont},Geneva,sans-serif;font-size:16px;text-align:center;color:${primary};font-weight:700;">${block.preCta}</p>`
        : '';
      return `
<!-- ====== BLOCK ${index}: CTA ====== -->
<tr>
<td style="padding:8px 32px;" data-editor-field="${prefix}">
  ${preCta}
  ${ctaMain}
  ${ctaSec}
</td>
</tr>`;
    }

    case 'divider': {
      return `
<!-- ====== BLOCK ${index}: DIVIDER ====== -->
<tr>
<td style="padding:0 32px;" data-editor-field="${prefix}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #e5eaf0;font-size:0;line-height:0;padding-top:20px;">&nbsp;</td></tr></table>
</td>
</tr>`;
    }

    case 'spacer': {
      const h = block.height || 20;
      return `
<!-- ====== BLOCK ${index}: SPACER ====== -->
<tr>
<td style="height:${h}px;font-size:0;line-height:0;" data-editor-field="${prefix}">&nbsp;</td>
</tr>`;
    }

    case 'footer': {
      const disclaimerBg = darkenColor(footerBg, 8);
      const ftLogoHtml = renderFooterLogo(brand, footerBg);
      return `
<!-- ====== BLOCK ${index}: FOOTER ====== -->
<tr>
<td class="footer-cell" style="background:${footerBg};padding:22px 32px;text-align:center;" data-editor-field="${prefix}">
  ${brand.footer.tagline ? `<p class="footer-tagline" style="margin:0 0 4px;font-family:${bodyFont},Geneva,sans-serif;font-size:16px;color:#ffffff;font-weight:700;">${brand.footer.tagline}</p>` : ''}
  <p class="footer-subtitle" style="margin:0;font-family:${bodyFont},Geneva,sans-serif;font-size:14px;">
    ${ftLogoHtml}
    ${brand.footer.subtitle ? `<span style="color:#8ba0b8;"> · ${brand.footer.subtitle}</span>` : ''}
  </p>
  ${block.footerNote ? `<p class="footer-note-text" style="margin:8px 0 0;font-family:${bodyFont},Geneva,sans-serif;font-size:14px;text-align:center;color:#9aa6b2;">${block.footerNote}</p>` : ''}
  ${brand.footer.address ? `<p style="margin:12px 0 0;font-family:${bodyFont},Geneva,sans-serif;font-size:11px;line-height:1.5;color:#8ba0b8;">${brand.footer.address}</p>` : ''}
  ${brand.footer.unsubscribeUrl ? `<p style="margin:8px 0 0;font-family:${bodyFont},Geneva,sans-serif;font-size:11px;"><a href="${brand.footer.unsubscribeUrl}" style="color:#b9c7d6;text-decoration:underline;">${brand.footer.unsubscribeLabel || 'Cancelar suscripción'}</a></p>` : ''}
</td>
</tr>
${brand.footer.disclaimer ? `
<tr>
<td class="disclaimer-cell" style="background:${disclaimerBg};padding:18px 32px;text-align:center;">
  <p class="disclaimer-text" style="margin:0;font-family:${bodyFont},Geneva,sans-serif;font-size:12px;line-height:1.6;color:#5f7089;">${brand.footer.disclaimer}</p>
</td>
</tr>` : ''}`;
    }

    default:
      return '';
  }
}

/**
 * Render email using the canvas blocks array (v2 modular path).
 */
function renderCanvasEmail(brand: Brand, content: EmailContent): string {
  const emailWidth = content.emailWidth || 600;
  const headingFont = brand.fonts.heading || 'Montserrat';
  const bodyFont = brand.fonts.body || 'Montserrat';
  const pageBackground = content.emailBgColor || '#eef2f6';
  const bodyBackground = content.bodyBgColor || '#ffffff';

  const blocksHtml = (content.blocks || []).map((b, i) => renderCanvasBlock(b, brand, i)).join('\n');

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<title>${content.subject || content.headline || 'Email'}</title>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont).replace(/%20/g, '+')}:wght@400;700;800&family=${encodeURIComponent(bodyFont).replace(/%20/g, '+')}:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<style>table,td{font-family:Arial,sans-serif!important;}</style>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
  @media only screen and (max-width: ${emailWidth + 20}px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .email-body-cell { padding: 28px 20px 22px !important; }
    .email-headline { font-size: 22px !important; line-height: 1.3 !important; }
    .email-body-text { font-size: 15px !important; }
    .cta-btn { display: block !important; width: 100% !important; max-width: 100% !important; padding: 16px 20px !important; text-align: center !important; box-sizing: border-box !important; }
    .info-box-cell { padding: 16px 18px !important; }
    .footer-cell { padding: 18px 20px !important; }
    .disclaimer-cell { padding: 14px 20px !important; }
    .header-cell { padding: 20px !important; }
    .header-logo-text { font-size: 22px !important; }
    .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
    .hero-img { width: 100% !important; max-width: 100% !important; height: auto !important; }
  }
  @media (prefers-color-scheme: dark) {
    .email-bg { background-color: #1a1a2e !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${pageBackground};font-family:'${headingFont}','Open Sans',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
${content.preheader ? `<div style="display:none;font-size:1px;color:${pageBackground};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${content.preheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>` : ''}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${pageBackground};" class="email-bg" bgcolor="${pageBackground}">
<tr><td align="center" style="padding:24px 16px;">

<!--[if mso]>
<table role="presentation" width="${emailWidth}" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td>
<![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="email-container" style="width:100%;max-width:${emailWidth}px;background:${bodyBackground};border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(11,42,74,.12);" bgcolor="${bodyBackground}">

${blocksHtml}

</table>
<!--[if mso]>
</td></tr></table>
<![endif]-->

</td></tr>
</table>

</body>
</html>`;
}

// Tokens de estilo por variante de layout — parametrizan el template, no lo duplican
interface LayoutTokens {
  gradientBar: boolean;
  containerRadius: number;
  heroTop: boolean;       // hero full-bleed ANTES del header (layout 'hero')
  cardSections: boolean;  // body en card blanca sobre fondo gris (layout 'card')
  flatShadow: boolean;    // sin sombra profunda (layout 'minimal')
  compactHeader: boolean;
}

function layoutTokens(layout: LayoutVariant): LayoutTokens {
  switch (layout) {
    case 'minimal':
      return { gradientBar: false, containerRadius: 8, heroTop: false, cardSections: false, flatShadow: true, compactHeader: false };
    case 'hero':
      return { gradientBar: false, containerRadius: 16, heroTop: true, cardSections: false, flatShadow: false, compactHeader: true };
    case 'card':
      return { gradientBar: true, containerRadius: 16, heroTop: false, cardSections: true, flatShadow: false, compactHeader: false };
    case 'classic':
    default:
      return { gradientBar: true, containerRadius: 16, heroTop: false, cardSections: false, flatShadow: false, compactHeader: false };
  }
}

/**
 * Main render function — generates complete email HTML
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function renderEmail(brand: Brand, content: EmailContent, _options: RenderOptions = {}): string {
  brand = sanitizeBrandForEmail(brand);
  content = sanitizeContentForEmail(content);

  // All content now passes through the modular renderer. Legacy documents are
  // normalized into deterministic blocks so existing drafts/share links survive.
  if (!content.blocks?.length) {
    content = { ...content, blocks: legacyContentToBlocks(content) };
  }
  if (content.blocks?.length) {
    return renderCanvasEmail(brand, content);
  }

  const {
    primary,
    accent,
    gradientStart,
    gradientEnd,
  } = brand.colors;
  
  const emailWidth = content.emailWidth || 600;

  const headingFont = brand.fonts.heading || 'Montserrat';
  const bodyFont = brand.fonts.body || 'Montserrat';

  const layout = content.layout || 'classic';
  const V = layoutTokens(layout);

  const headerBg = brand.colors.headerBg || primary;
  const footerBg = brand.colors.footerBg || primary;
  const disclaimerBg = darkenColor(footerBg, 8);
  const pageBackground = content.emailBgColor || '#eef2f6';
  // Layout 'card': el contenedor toma un gris claro y el contenido va en cards blancas
  const bodyBackground = V.cardSections ? lightenColor(primary, 96) : (content.bodyBgColor || '#ffffff');
  const cardBackground = content.bodyBgColor || '#ffffff';

  const logoHtml = renderLogo(brand, headerBg);
  const isImageLogo = brand.logo.type === 'image';
  const footerLogoHtml = renderFooterLogo(brand, footerBg);
  const bulletsHtml = renderBullets(content.bullets || [], accent);
  const infoBoxHtml = renderInfoBox(content, brand);
  const ctaHtml = renderCTA(content.ctaText, content.ctaUrl, accent, 'ctaText');
  const secondaryCtaHtml = content.secondaryCtaText && content.secondaryCtaUrl
    ? renderCTA(content.secondaryCtaText, content.secondaryCtaUrl, primary, 'secondaryCtaText')
    : '';
  const heroHtml = renderHero(content.hero);
  const imageTextHtml = renderImageTextBlock(content.imageText, brand);
  const galleryHtml = renderGallery(content.gallery, brand);
  const quoteHtml = renderQuote(content.quote, brand);
  const dividerHtml = renderDivider(content.showDividers);

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<title>${content.headline || 'Email'}</title>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont).replace(/%20/g, '+')}:wght@400;700;800&family=${encodeURIComponent(bodyFont).replace(/%20/g, '+')}:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<style>table,td{font-family:Arial,sans-serif!important;}</style>
<![endif]-->
<style>
  /* Reset */
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }

  /* Responsive */
  @media only screen and (max-width: ${emailWidth + 20}px) {
    .email-container {
      width: 100% !important;
      max-width: 100% !important;
    }
    .fluid-padding {
      padding-left: 20px !important;
      padding-right: 20px !important;
    }
    .email-body-cell {
      padding: 28px 20px 22px !important;
    }
    .email-headline {
      font-size: 22px !important;
      line-height: 1.3 !important;
    }
    .email-body-text {
      font-size: 15px !important;
    }
    .cta-btn {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      padding: 16px 20px !important;
      text-align: center !important;
      box-sizing: border-box !important;
    }
    .info-box-cell {
      padding: 16px 18px !important;
    }
    .footer-cell {
      padding: 18px 20px !important;
    }
    .disclaimer-cell {
      padding: 14px 20px !important;
    }
    .header-cell {
      padding: 20px !important;
    }
    .header-logo-text {
      font-size: 22px !important;
    }
    .footer-tagline {
      font-size: 15px !important;
    }
    .footer-subtitle {
      font-size: 13px !important;
    }
    .disclaimer-text {
      font-size: 11px !important;
    }
    .spacer-lg {
      height: 14px !important;
    }
    .bullet-text {
      font-size: 15px !important;
    }
    .pre-cta-text {
      font-size: 15px !important;
    }
    .footer-note-text {
      font-size: 13px !important;
    }
    .mobile-full-width {
      width: 100% !important;
    }
    .stack-column {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
    .hero-img {
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
    }
    .card-section-cell {
      padding: 20px 18px !important;
    }
  }

  /* Dark mode support for email clients */
  @media (prefers-color-scheme: dark) {
    .email-bg { background-color: #1a1a2e !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${pageBackground};font-family:'${brand.fonts.heading}','Open Sans',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<!-- WRAPPER -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${pageBackground};" class="email-bg" bgcolor="${pageBackground}">
<tr><td align="center" style="padding:24px 16px;">

<!-- CONTAINER — fluid with max-width -->
<!--[if mso]>
<table role="presentation" width="${emailWidth}" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td>
<![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="email-container" ${content.textureUrl ? `background="${content.textureUrl}"` : ''} style="width:100%;max-width:${emailWidth}px;background:${bodyBackground};${content.textureUrl ? `background-image:url(${content.textureUrl});background-size:cover;` : ''}border-radius:${V.containerRadius}px;overflow:hidden;${V.flatShadow ? 'border:1px solid #e5eaf0;' : 'box-shadow:0 6px 24px rgba(11,42,74,.12);'}" bgcolor="${bodyBackground}">

${V.heroTop ? heroHtml : ''}

<!-- ====== HEADER ====== -->
<tr>
<td class="header-cell" ${content.headerTextureUrl ? `background="${content.headerTextureUrl}"` : ''} style="background-color:${headerBg};${content.headerTextureUrl ? `background-image:url(${content.headerTextureUrl});background-size:cover;` : ''}padding:${V.compactHeader ? '16px 32px' : '26px 32px'};text-align:center;" bgcolor="${headerBg}">
  ${isImageLogo ? logoHtml : `<p class="header-logo-text" style="margin:0;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:${V.compactHeader ? 20 : 26}px;font-weight:700;">${logoHtml}</p>`}
</td>
</tr>

${V.gradientBar ? `<!-- ====== GRADIENT BAR ====== -->
<tr>
<td style="height:4px;background-color:${accent};background-image:linear-gradient(90deg,${gradientStart},${gradientEnd});line-height:4px;font-size:0;">&nbsp;</td>
</tr>` : ''}

${!V.heroTop ? heroHtml : ''}

<!-- ====== BODY ====== -->
<tr>
<td class="email-body-cell" style="padding:${V.cardSections ? '24px 20px 20px' : '34px 32px 26px'};">
${V.cardSections ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${cardBackground};border-radius:12px;" bgcolor="${cardBackground}">
<tr>
<td class="card-section-cell" style="padding:28px 26px 22px;">` : ''}

  <!-- Label -->
  ${content.label ? `<p data-editor-field="label" style="margin:0 0 6px;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:13px;color:${accent};font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">${content.label}</p>` : ''}

  <!-- Headline -->
  ${content.headline ? `<h1 data-editor-field="headline" class="email-headline" style="margin:0 0 16px;font-family:'${brand.fonts.heading}','Open Sans',Arial,sans-serif;color:${primary};font-size:26px;font-weight:800;line-height:1.25;">${content.headline}</h1>` : ''}

  <!-- Body text -->
  ${content.body ? `<p data-editor-field="body" class="email-body-text" style="margin:0 0 18px;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:16px;line-height:1.6;color:#4a5568;">${content.body}</p>` : ''}

  ${imageTextHtml ? dividerHtml + imageTextHtml : ''}

  <!-- Bullets title -->
  ${content.bulletsTitle && content.bullets?.length ? `<p data-editor-field="bulletsTitle" style="margin:0 0 10px;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:16px;color:${primary};font-weight:800;">${content.bulletsTitle}</p>` : ''}

  <!-- Bullets -->
  ${bulletsHtml}

  <!-- Spacer -->
  ${(content.bullets?.length || content.eventDate) ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="spacer-lg" style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr></table>' : ''}

  ${galleryHtml ? dividerHtml + galleryHtml : ''}

  ${quoteHtml ? dividerHtml + quoteHtml : ''}

  ${infoBoxHtml}

  <!-- Pre-CTA text -->
  ${content.preCta ? `<p data-editor-field="preCta" class="pre-cta-text" style="margin:0 0 16px;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:16px;text-align:center;color:${primary};font-weight:700;">${content.preCta}</p>` : ''}

  ${ctaHtml}

  ${secondaryCtaHtml}

  <!-- Footer note -->
  ${content.footerNote ? `<p data-editor-field="footerNote" class="footer-note-text" style="margin:8px 0 0;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:14px;text-align:center;color:#9aa6b2;">${content.footerNote}</p>` : ''}
${V.cardSections ? `
</td>
</tr>
</table>` : ''}
</td>
</tr>

<!-- ====== FOOTER ====== -->
<tr>
<td class="footer-cell" style="background:${footerBg};padding:22px 32px;text-align:center;">
  ${brand.footer.tagline ? `<p class="footer-tagline" style="margin:0 0 4px;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:16px;color:#ffffff;font-weight:700;">${brand.footer.tagline}</p>` : ''}
  <p class="footer-subtitle" style="margin:0;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:14px;">
    ${footerLogoHtml}
    ${brand.footer.subtitle ? `<span style="color:#8ba0b8;"> · ${brand.footer.subtitle}</span>` : ''}
  </p>
</td>
</tr>

<!-- ====== DISCLAIMER ====== -->
${brand.footer.disclaimer ? `
<tr>
<td class="disclaimer-cell" style="background:${disclaimerBg};padding:18px 32px;text-align:center;">
  <p class="disclaimer-text" style="margin:0;font-family:${brand.fonts.body},Geneva,sans-serif;font-size:12px;line-height:1.6;color:#5f7089;">${brand.footer.disclaimer}</p>
</td>
</tr>` : ''}

</table>
<!-- /CONTAINER -->
<!--[if mso]>
</td></tr></table>
<![endif]-->

</td></tr>
</table>
<!-- /WRAPPER -->

</body>
</html>`;
}
