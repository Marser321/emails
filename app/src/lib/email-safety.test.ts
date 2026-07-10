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
});
