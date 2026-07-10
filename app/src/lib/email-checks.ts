// Chequeos de entregabilidad sobre el HTML final renderizado.
// Puro (regex sobre el markup que genera templates.ts) para poder testearlo sin DOM.

export type GmailClipStatus = 'ok' | 'warning' | 'clipped';

export interface EmailHtmlChecks {
  /** Peso del HTML en KB (UTF-8), sin contar imágenes externas */
  weightKB: number;
  /** Gmail recorta mensajes de más de ~102 KB ("[Mensaje recortado]") */
  gmailClip: GmailClipStatus;
  images: {
    total: number;
    /** Imágenes sin alt o con alt vacío — se ven como huecos con bloqueo de imágenes */
    missingAlt: number;
    /** Imágenes locales (/api/assets/, /email-assets/) que no existen fuera de esta máquina */
    local: number;
  };
  links: {
    total: number;
    /** href vacío o "#" — botones que no llevan a ningún lado */
    empty: number;
    /** http:// sin TLS — algunos clientes lo marcan como inseguro */
    insecure: number;
  };
}

// Gmail recorta alrededor de 102 KB; avisamos desde 90 para dejar margen.
const GMAIL_CLIP_KB = 102;
const GMAIL_WARN_KB = 90;

const LOCAL_URL_REGEX = /^(\/api\/assets\/|\/email-assets\/)/;
const MERGE_TAG_REGEX = /^{{\s*[a-zA-Z0-9_.-]+\s*}}$/;

function getAttr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? match[1] : null;
}

export function analyzeEmailHtml(html: string): EmailHtmlChecks {
  const bytes = new TextEncoder().encode(html).length;
  const weightKB = Math.round((bytes / 1024) * 10) / 10;
  const gmailClip: GmailClipStatus =
    weightKB > GMAIL_CLIP_KB ? 'clipped' : weightKB > GMAIL_WARN_KB ? 'warning' : 'ok';

  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  let missingAlt = 0;
  let localImages = 0;
  for (const tag of imgTags) {
    const alt = getAttr(tag, 'alt');
    if (alt === null || alt.trim() === '') missingAlt++;
    const src = getAttr(tag, 'src');
    if (src && LOCAL_URL_REGEX.test(src)) localImages++;
  }

  const anchorTags = html.match(/<a\b[^>]*>/gi) || [];
  let emptyLinks = 0;
  let insecureLinks = 0;
  let totalLinks = 0;
  for (const tag of anchorTags) {
    const href = getAttr(tag, 'href');
    if (href === null) continue;
    totalLinks++;
    const value = href.trim();
    if (MERGE_TAG_REGEX.test(value)) continue; // {{unsubscribe}} y similares son válidos
    if (value === '' || value === '#') emptyLinks++;
    else if (/^http:\/\//i.test(value)) insecureLinks++;
  }

  return {
    weightKB,
    gmailClip,
    images: { total: imgTags.length, missingAlt, local: localImages },
    links: { total: totalLinks, empty: emptyLinks, insecure: insecureLinks },
  };
}

/** Resumen de problemas accionables, ordenado por severidad. Vacío = todo OK. */
export function listEmailIssues(checks: EmailHtmlChecks): string[] {
  const issues: string[] = [];
  if (checks.gmailClip === 'clipped') {
    issues.push(`El HTML pesa ${checks.weightKB} KB — Gmail lo va a recortar (límite ~${GMAIL_CLIP_KB} KB).`);
  } else if (checks.gmailClip === 'warning') {
    issues.push(`El HTML pesa ${checks.weightKB} KB — cerca del límite de recorte de Gmail (~${GMAIL_CLIP_KB} KB).`);
  }
  if (checks.links.empty > 0) {
    issues.push(`${checks.links.empty} ${checks.links.empty === 1 ? 'enlace' : 'enlaces'} sin destino (href vacío o "#").`);
  }
  if (checks.images.missingAlt > 0) {
    issues.push(`${checks.images.missingAlt} ${checks.images.missingAlt === 1 ? 'imagen' : 'imágenes'} sin texto alt.`);
  }
  if (checks.images.local > 0) {
    issues.push(`${checks.images.local} ${checks.images.local === 1 ? 'imagen local' : 'imágenes locales'} — reescribí a URL pública al exportar.`);
  }
  if (checks.links.insecure > 0) {
    issues.push(`${checks.links.insecure} ${checks.links.insecure === 1 ? 'enlace' : 'enlaces'} http:// sin TLS.`);
  }
  return issues;
}
