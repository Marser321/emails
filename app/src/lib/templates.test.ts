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
