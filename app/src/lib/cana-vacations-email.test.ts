import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeEmailHtml, listEmailIssues } from './email-checks';
import { rewriteAssetUrls } from './export';
import { renderEmail } from './templates';
import type { Brand, Draft } from './types';

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), relativePath), 'utf8')) as T;
}

describe('Cana Vacations guide delivery email', () => {
  const brands = readJson<Brand[]>('data/brands.json');
  const drafts = readJson<Draft[]>('data/drafts.json');
  const brand = brands.find(item => item.id === 'cana-vacations');
  const draft = drafts.find(item => item.id === 'cana-vacations-guia-turistica-entrega');

  it('ships the brand identity and a GHL-ready guide CTA', () => {
    expect(brand).toMatchObject({
      name: 'Cana Vacations',
      colors: { primary: '#12203D', accent: '#FFAB53', gradientStart: '#00C1CF' },
      fonts: { heading: 'Poppins', body: 'Poppins' },
      logo: { type: 'image', value: '/email-assets/cana-vacations/logos/cana-vacations-logo-on-dark.png' },
    });
    expect(draft).toMatchObject({
      brandId: 'cana-vacations',
      template: 'registration',
      content: {
        subject: 'Tu guía de Punta Cana ya está lista ✈️',
      },
    });

    const html = renderEmail(brand!, draft!.content);
    const checks = analyzeEmailHtml(html);

    expect(html).toContain('href="https://fjqrrqvyydhabqkendpb.supabase.co/storage/v1/object/public/lead-magnets/cana-vacations/guia-turistica-punta-cana.pdf"');
    expect(draft!.content.blocks?.map(block => block.type)).toEqual(['header', 'text', 'cta', 'footer']);
    expect(html).toContain('DESCARGAR MI GUÍA');
    expect(html).toContain('<v:roundrect');
    expect(checks.images.missingAlt).toBe(0);
    expect(checks.links.empty).toBe(0);
    expect(checks.links.insecure).toBe(0);
    expect(checks.mergeFields.unknown).toEqual([]);

    const exportedHtml = rewriteAssetUrls(html, 'https://assets.example.com');
    expect(exportedHtml).toContain('https://assets.example.com/email-assets/cana-vacations/logos/cana-vacations-logo-on-dark.png');
    expect(analyzeEmailHtml(exportedHtml).images.local).toBe(0);
    expect(listEmailIssues(analyzeEmailHtml(exportedHtml))).toEqual([]);
  });
});
