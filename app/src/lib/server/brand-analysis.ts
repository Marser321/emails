import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_HTML = 1_000_000;
const PAGE_KEYWORDS = /about|nosotros|servic|product|ofert|promo|testimonial|casos|faq|preguntas|contact/i;

export function isPrivateAddress(address: string): boolean {
  if (address === '::1' || address === '0:0:0:0:0:0:0:1') return true;
  if (address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:')) return true;
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) || (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) || parts[0] >= 224;
}

export async function assertSafePublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Solo se permiten URLs públicas http/https.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('No se permiten hosts privados.');
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some(item => isPrivateAddress(item.address))) throw new Error('La URL resuelve a una red privada o reservada.');
  return url;
}

async function fetchHtml(raw: string): Promise<{ url: string; html: string }> {
  let url = await assertSafePublicUrl(raw);
  for (let redirect = 0; redirect <= 3; redirect++) {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8_000), headers: { 'User-Agent': 'ADMediaBrandAnalyzer/1.0', Accept: 'text/html,application/xhtml+xml' } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirección sin destino.');
      url = await assertSafePublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`El sitio respondió ${response.status}.`);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html') && !type.includes('application/xhtml+xml')) throw new Error('La URL no contiene una página HTML.');
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_HTML) throw new Error('La página supera el tamaño permitido.');
    const html = (await response.text()).slice(0, MAX_HTML);
    return { url: url.toString(), html };
  }
  throw new Error('Demasiadas redirecciones.');
}

function cleanText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim().slice(0, 16_000);
}

function candidates(html: string, base: URL): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(match[1], base);
      if (url.origin === base.origin && PAGE_KEYWORDS.test(`${url.pathname} ${cleanText(match[2])}`)) found.push(url.toString());
    } catch { /* ignore invalid links */ }
  }
  return [...new Set(found)].slice(0, 7);
}

function logoCandidates(html: string, base: URL): string[] {
  const result: string[] = [];
  for (const match of html.matchAll(/<(?:img|link)[^>]+(?:src|href)=["']([^"']+)["'][^>]*>/gi)) {
    if (!/logo|brand|icon/i.test(match[0])) continue;
    try { result.push(new URL(match[1], base).toString()); } catch { /* ignore */ }
  }
  return [...new Set(result)].slice(0, 8);
}

export interface CrawledBrandSite { pages: { url: string; title: string; description: string; text: string }[]; logos: string[]; colors: string[]; warnings: string[]; }

export async function crawlBrandWebsite(root: string, additional: string[] = []): Promise<CrawledBrandSite> {
  const home = await fetchHtml(root);
  const base = new URL(home.url);
  const urls = [...new Set([home.url, ...candidates(home.html, base), ...additional])].slice(0, 8);
  const warnings: string[] = [];
  const pages = (await Promise.all(urls.map(async url => {
    try {
      const page = url === home.url ? home : await fetchHtml(url);
      const title = page.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
      const description = page.html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']/i)?.[1] || '';
      return { url: page.url, title, description, text: cleanText(page.html) };
    } catch (error) { warnings.push(`${url}: ${error instanceof Error ? error.message : 'no disponible'}`); return null; }
  }))).filter((page): page is NonNullable<typeof page> => Boolean(page));
  const colors = [...new Set(home.html.match(/#[0-9a-f]{6}\b/gi) || [])].slice(0, 20);
  return { pages, logos: logoCandidates(home.html, base), colors, warnings };
}
