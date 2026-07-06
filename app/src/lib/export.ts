// Exportación pragmática: las imágenes locales (/api/assets/...) no existen fuera
// de esta máquina. Tres modos: rewrite a URL pública, ZIP con imágenes, o base64.
import JSZip from 'jszip';

const LOCAL_ASSET_REGEX = /(?:src|background)=["'](\/api\/assets\/[^"']+)["']/g;

// URLs locales únicas presentes en el HTML
export function collectLocalAssetUrls(html: string): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(LOCAL_ASSET_REGEX)) {
    urls.add(match[1]);
  }
  return Array.from(urls);
}

// Nombre de archivo plano y único para el ZIP / rewrite: <brandId>-<filename>
function flatName(localUrl: string): string {
  const parts = localUrl.replace('/api/assets/', '').split('/');
  return decodeURIComponent(parts.join('-'));
}

// Reemplaza /api/assets/<brand>/<file> por <baseUrl>/<brand>/<file>
export function rewriteAssetUrls(html: string, publicBaseUrl: string): string {
  const base = publicBaseUrl.replace(/\/+$/, '');
  return html.replace(/(\/api\/assets\/)([^"']+)/g, (_m, _prefix, rest) => `${base}/${rest}`);
}

// ZIP con email.html (rutas relativas images/<file>) + las imágenes
export async function buildZip(html: string, assetUrls: string[]): Promise<Blob> {
  const zip = new JSZip();
  const images = zip.folder('images')!;

  let rewritten = html;
  for (const url of assetUrls) {
    const name = flatName(url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo leer ${url}`);
    images.file(name, await res.arrayBuffer());
    rewritten = rewritten.split(url).join(`images/${name}`);
  }

  zip.file('email.html', rewritten);
  return zip.generateAsync({ type: 'blob' });
}

// Incrusta las imágenes como data URIs (solo para archivo/preview offline:
// Gmail y Outlook de escritorio bloquean base64, e infla el HTML ~33%)
export async function inlineAsBase64(html: string, assetUrls: string[]): Promise<string> {
  let result = html;
  for (const url of assetUrls) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo leer ${url}`);
    const blob = await res.blob();
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    result = result.split(url).join(dataUri);
  }
  return result;
}
