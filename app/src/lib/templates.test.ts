import { describe, expect, it } from 'vitest';
import { renderEmail } from './templates';
import { DEFAULT_BRAND, TEMPLATES, type Brand, type EmailContent } from './types';

const brands: Brand[] = [
  { ...DEFAULT_BRAND, id: 'ad', name: 'AD Media Solution', logo: { type: 'image', value: 'https://cdn.example.com/ad.png', imageWidth: 200 }, createdAt: '', updatedAt: '' },
  { ...DEFAULT_BRAND, id: 'amo', name: 'AMO Managements', logo: { type: 'image', value: 'https://cdn.example.com/amo.png', imageWidth: 240 }, createdAt: '', updatedAt: '' },
];

function contentFor(name: string): EmailContent {
  return {
    subject: `${name} — asunto`, preheader: 'Resumen breve del contenido', label: 'Información', headline: `Titular ${name}`,
    body: 'Contenido profesional\nSegunda línea', bulletsTitle: 'Puntos clave', bullets: ['Primero', 'Segundo'],
    ctaText: 'Conocer más', ctaUrl: 'https://example.com/action', eventDate: '18 de julio', eventTime: '11:00 AM',
    preCta: 'Siguiente paso', footerNote: 'Gracias por tu tiempo',
  };
}

describe('email renderer compatibility contract', () => {
  for (const brand of brands) {
    for (const template of TEMPLATES) {
      it(`renders ${brand.name} / ${template.type}`, () => {
        const html = renderEmail(brand, contentFor(template.name));
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('mso');
        expect(html).toContain('{{unsubscribe}}');
        expect(html).toContain('{{location.full_address}}');
        expect(html).toMatch(/display:\s*none/);
        expect(html).not.toMatch(/<script\b/i);
        expect(html).not.toMatch(/javascript:/i);
        expect(html).not.toMatch(/(?:src|href)=["']\/(?!\/)/i);
        expect(Buffer.byteLength(html, 'utf8')).toBeLessThan(200_000);
        for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
          expect(tag).toMatch(/\balt=["'][^"']*["']/i);
          expect(tag).toMatch(/\bwidth=["']?\d+/i);
        }
      });
    }
  }

  it('escapes malicious generated copy', () => {
    const html = renderEmail(brands[0], { ...contentFor('malicioso'), headline: '<script>alert(1)</script>', ctaUrl: 'javascript:alert(1)' });
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toContain('javascript:');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('image block style fields', () => {
  const IMG = 'https://cdn.example.com/adset.png';

  it('hero sin campos nuevos rinde como antes (regresión)', () => {
    const html = renderEmail(brands[0], { ...contentFor('hero'), hero: { imageUrl: IMG, alt: 'Adset' } });
    const heroTag = (html.match(/<img[^>]*class="hero-img"[^>]*>/) || [''])[0];
    expect(heroTag).toContain('width="568"');
    expect(heroTag).not.toContain('border-radius');
  });

  it('hero con borderRadius y widthPercent los aplica', () => {
    const html = renderEmail(brands[0], {
      ...contentFor('hero'),
      hero: { imageUrl: IMG, alt: 'Adset', borderRadius: 16, widthPercent: 50 },
    });
    const heroTag = (html.match(/<img[^>]*class="hero-img"[^>]*>/) || [''])[0];
    expect(heroTag).toContain('border-radius:16px');
    expect(heroTag).toContain('width="284"'); // 568 × 50%
    expect(html).toContain('align="center" width="284"'); // tabla de centrado Outlook-safe
  });

  it('image-text mantiene defaults 252px / 8px y acepta overrides', () => {
    const base = { imageUrl: IMG, alt: 'Foto', text: 'Texto lateral', imagePosition: 'left' as const };
    const htmlDefault = renderEmail(brands[0], { ...contentFor('it'), imageText: base });
    const defTag = (htmlDefault.match(/<img[^>]*data-editor-field="imageText"[^>]*>/) || [''])[0];
    expect(defTag).toContain('width="252"');
    expect(defTag).toContain('border-radius:8px');

    const htmlCustom = renderEmail(brands[0], { ...contentFor('it'), imageText: { ...base, imageWidth: 180, borderRadius: 0 } });
    const customTag = (htmlCustom.match(/<img[^>]*data-editor-field="imageText"[^>]*>/) || [''])[0];
    expect(customTag).toContain('width="180"');
    expect(customTag).toContain('border-radius:0px');
  });

  it('gallery mantiene default 8px y acepta borderRadius', () => {
    const gallery = { images: [{ url: IMG, alt: 'a' }, { url: IMG, alt: 'b' }], columns: 2 as const };
    const htmlDefault = renderEmail(brands[0], { ...contentFor('gal'), gallery });
    expect(htmlDefault).toContain('border-radius:8px');

    const htmlCustom = renderEmail(brands[0], { ...contentFor('gal'), gallery: { ...gallery, borderRadius: 20 } });
    const tags = htmlCustom.match(/<img[^>]*data-editor-field="gallery-\d+"[^>]*>/g) || [];
    expect(tags.length).toBe(2);
    for (const tag of tags) expect(tag).toContain('border-radius:20px');
  });

  it('bloques canvas (content.blocks) propagan los campos de estilo', () => {
    const html = renderEmail(brands[0], {
      ...contentFor('canvas'),
      blocks: [
        { id: 'b1', type: 'hero', imageUrl: IMG, alt: 'Adset', borderRadius: 12, widthPercent: 70 },
        { id: 'b2', type: 'gallery', images: [{ url: IMG, alt: 'g' }], columns: 2, borderRadius: 24 },
      ],
    });
    expect(html).toContain('border-radius:12px');
    expect(html).toContain(`width="${Math.round(568 * 0.7)}"`);
    expect(html).toContain('border-radius:24px');
  });
});
