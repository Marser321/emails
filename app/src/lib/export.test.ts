import { describe, expect, it } from 'vitest';
import { collectLocalAssetUrls, rewriteAssetUrls } from './export';

describe('asset export', () => {
  const html = '<img src="/api/assets/brand/a.jpg"><img src="/email-assets/amo/hero.jpg"><td background="/email-assets/bg.jpg">';

  it('collects API and starter pack assets', () => {
    expect(collectLocalAssetUrls(html)).toEqual(['/api/assets/brand/a.jpg', '/email-assets/amo/hero.jpg', '/email-assets/bg.jpg']);
  });

  it('rewrites every local URL to an absolute public URL', () => {
    const output = rewriteAssetUrls(html, 'https://cdn.example.com/');
    expect(output).toContain('https://cdn.example.com/brand/a.jpg');
    expect(output).toContain('https://cdn.example.com/email-assets/amo/hero.jpg');
    expect(output).not.toMatch(/=["']\//);
  });
});
