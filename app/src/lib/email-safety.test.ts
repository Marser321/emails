import { describe, expect, it } from 'vitest';
import { escapeHtml, escapeTextWithBreaks, sanitizeContentForEmail, sanitizeEmailUrl } from './email-safety';
import type { EmailContent } from './types';

const content: EmailContent = {
  label: '', headline: '', body: '', bulletsTitle: '', bullets: [], ctaText: '', ctaUrl: '',
  eventDate: '', eventTime: '', preCta: '', footerNote: '',
};

describe('email safety', () => {
  it('escapes markup and preserves controlled line breaks', () => {
    expect(escapeHtml('<script>"x"</script>')).toBe('&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
    expect(escapeTextWithBreaks('uno\ndos')).toBe('uno<br>dos');
  });

  it('rejects dangerous and relative URLs while allowing documented merge fields', () => {
    expect(sanitizeEmailUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeEmailUrl('data:text/html,test')).toBe('');
    expect(sanitizeEmailUrl('../image.jpg')).toBe('');
    expect(sanitizeEmailUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(sanitizeEmailUrl('{{unsubscribe}}')).toBe('{{unsubscribe}}');
    expect(sanitizeEmailUrl('{{location.full_address}}')).toBe('{{location.full_address}}');
  });

  it('sanitizes AI and user content recursively', () => {
    const safe = sanitizeContentForEmail({
      ...content,
      headline: '<img src=x onerror=alert(1)>',
      body: '<script>alert(1)</script>\ntexto',
      ctaUrl: 'javascript:alert(1)',
      blocks: [{ id: 'x', type: 'text', headline: '<b>unsafe</b>', body: '<script>x</script>' }],
    });
    expect(safe.headline).not.toContain('<img');
    expect(safe.body).not.toContain('<script>');
    expect(safe.body).toContain('<br>');
    expect(safe.ctaUrl).toBe('');
    expect(JSON.stringify(safe.blocks)).not.toContain('<script>');
  });

  it('clamps image style fields and preserves undefined', () => {
    const safe = sanitizeContentForEmail({
      ...content,
      hero: { imageUrl: 'https://x.com/a.png', borderRadius: 999, widthPercent: 5 },
      imageText: { imageUrl: 'https://x.com/b.png', text: 't', imagePosition: 'left', borderRadius: -5, imageWidth: 9999 },
      gallery: { images: [{ url: 'https://x.com/c.png' }], columns: 2, borderRadius: NaN as unknown as number },
      blocks: [
        { id: 'h', type: 'hero', imageUrl: 'https://x.com/d.png', borderRadius: 100, widthPercent: 55 },
        { id: 'g', type: 'gallery', images: [{ url: 'https://x.com/e.png' }], columns: 2 },
      ],
    });
    expect(safe.hero?.borderRadius).toBe(32);       // 999 → max 32
    expect(safe.hero?.widthPercent).toBe(30);       // 5 → min 30
    expect(safe.imageText?.borderRadius).toBe(0);   // -5 → min 0
    expect(safe.imageText?.imageWidth).toBe(252);   // 9999 → max 252
    expect(safe.gallery?.borderRadius).toBeUndefined(); // NaN → undefined
    const heroBlock = safe.blocks?.[0] as { borderRadius?: number; widthPercent?: number };
    expect(heroBlock.borderRadius).toBe(32);
    expect(heroBlock.widthPercent).toBe(55);
    const galleryBlock = safe.blocks?.[1] as { borderRadius?: number };
    expect(galleryBlock.borderRadius).toBeUndefined(); // ausente → sigue ausente
  });
});
