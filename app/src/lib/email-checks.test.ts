import { describe, expect, it } from 'vitest';
import { analyzeEmailHtml, listEmailIssues } from './email-checks';

const baseHtml = (body: string) => `<!DOCTYPE html><html><head></head><body>${body}</body></html>`;

describe('analyzeEmailHtml', () => {
  it('reporta peso y estado ok para un email chico', () => {
    const checks = analyzeEmailHtml(baseHtml('<p>Hola</p>'));
    expect(checks.gmailClip).toBe('ok');
    expect(checks.weightKB).toBeGreaterThan(0);
  });

  it('marca warning cerca del límite de Gmail y clipped al pasarlo', () => {
    const warning = analyzeEmailHtml('x'.repeat(95 * 1024));
    expect(warning.gmailClip).toBe('warning');
    const clipped = analyzeEmailHtml('x'.repeat(110 * 1024));
    expect(clipped.gmailClip).toBe('clipped');
  });

  it('cuenta imágenes sin alt y locales', () => {
    const checks = analyzeEmailHtml(baseHtml(`
      <img src="https://cdn.com/a.png" alt="Con alt">
      <img src="https://cdn.com/b.png" alt="">
      <img src="/api/assets/brand/logo.png">
      <img src="/email-assets/hero.jpg" alt="Hero">
    `));
    expect(checks.images.total).toBe(4);
    expect(checks.images.missingAlt).toBe(2);
    expect(checks.images.local).toBe(2);
  });

  it('cuenta enlaces vacíos e inseguros, ignorando merge tags', () => {
    const checks = analyzeEmailHtml(baseHtml(`
      <a href="https://ok.com">ok</a>
      <a href="#">vacío</a>
      <a href="">vacío</a>
      <a href="http://inseguro.com">http</a>
      <a href="{{unsubscribe}}">baja</a>
      <a name="ancla">sin href</a>
    `));
    expect(checks.links.total).toBe(5);
    expect(checks.links.empty).toBe(2);
    expect(checks.links.insecure).toBe(1);
    expect(checks.links.total - checks.links.empty - checks.links.insecure).toBe(2);
  });

  it('detecta variables GHL desconocidas y fondos negros accidentales', () => {
    const checks = analyzeEmailHtml(baseHtml('<div style="background:#000000">{{contact.first_name}} {{contact.magic}}</div>'));
    expect(checks.mergeFields.unknown).toEqual(['contact.magic']);
    expect(checks.suspiciousBlackBackgrounds).toBe(1);
  });

  it('acepta una URL HTTPS directa para descargar la guía Cana Vacations', () => {
    const checks = analyzeEmailHtml(baseHtml('<a href="https://fjqrrqvyydhabqkendpb.supabase.co/storage/v1/object/public/lead-magnets/cana-vacations/guia-turistica-punta-cana.pdf">Descargar guía</a>'));
    expect(checks.mergeFields.unknown).toEqual([]);
    expect(listEmailIssues(checks)).toEqual([]);
  });
});

describe('listEmailIssues', () => {
  it('devuelve vacío cuando todo está bien', () => {
    const checks = analyzeEmailHtml(baseHtml('<a href="https://ok.com"><img src="https://cdn.com/a.png" alt="a"></a>'));
    expect(listEmailIssues(checks)).toEqual([]);
  });

  it('lista los problemas encontrados', () => {
    const checks = analyzeEmailHtml(baseHtml('<a href="#">x</a><img src="/api/assets/b/l.png">'));
    const issues = listEmailIssues(checks);
    expect(issues.some(i => i.includes('enlace'))).toBe(true);
    expect(issues.some(i => i.includes('alt'))).toBe(true);
    expect(issues.some(i => i.includes('local'))).toBe(true);
  });
});
