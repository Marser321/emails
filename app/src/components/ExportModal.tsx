'use client';

import { useState } from 'react';
import { AlertCircle, Archive, Clipboard, CodeXml, Download, Globe2, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import { buildZip, collectLocalAssetUrls, inlineAsBase64, rewriteAssetUrls } from '@/lib/export';

interface ExportModalProps {
  html: string;
  fileName: string;
  mode: 'copy' | 'download';
  initialBaseUrl: string;
  /** Base pública del bucket de Supabase Storage, detectada por el servidor. */
  autoBaseUrl?: string;
  onClose: () => void;
  onDone: (message: string) => void;
  onBaseUrlSaved?: (baseUrl: string) => void;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

function downloadText(text: string, fileName: string) {
  const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// Aparece SOLO cuando el HTML contiene imágenes locales (/api/assets/...):
// esas URLs no funcionan fuera de esta máquina y hay que decidir cómo exportarlas.
export default function ExportModal({ html, fileName, mode, initialBaseUrl, autoBaseUrl, onClose, onDone, onBaseUrlSaved }: ExportModalProps) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assetUrls = collectLocalAssetUrls(html);

  const finish = (message: string) => {
    onDone(message);
    onClose();
  };

  const handlePublicUrl = async () => {
    if (!baseUrl.trim().startsWith('http')) {
      setError('Ingresa la URL base pública (ej: https://tucdn.com/emails)');
      return;
    }
    setBusy('public');
    setError(null);
    try {
      const clean = baseUrl.trim();
      // Persistir la base para la próxima vez (la de Supabase se detecta sola, no hace falta guardarla)
      if (clean !== autoBaseUrl) {
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetsPublicBaseUrl: clean }),
        }).then(() => onBaseUrlSaved?.(clean)).catch(() => {});
      }

      const rewritten = rewriteAssetUrls(html, clean);
      if (mode === 'copy') {
        await copyToClipboard(rewritten);
        finish('HTML copiado con URLs públicas');
      } else {
        downloadText(rewritten, fileName);
        finish('HTML descargado con URLs públicas');
      }
    } catch (e) {
      setError((e instanceof Error ? e.message : null) || 'Error al exportar');
    } finally {
      setBusy(null);
    }
  };

  const handleZip = async () => {
    setBusy('zip');
    setError(null);
    try {
      const blob = await buildZip(html, assetUrls);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.html?$/, '') + '.zip';
      a.click();
      URL.revokeObjectURL(url);
      finish('ZIP descargado (email.html + imágenes)');
    } catch (e) {
      setError((e instanceof Error ? e.message : null) || 'Error al generar el ZIP');
    } finally {
      setBusy(null);
    }
  };

  const handleBase64 = async () => {
    setBusy('base64');
    setError(null);
    try {
      const inlined = await inlineAsBase64(html, assetUrls);
      const sizeKb = Math.round(inlined.length / 1024);
      if (mode === 'copy') {
        await copyToClipboard(inlined);
        finish(`HTML copiado con imágenes embebidas (${sizeKb} KB)`);
      } else {
        downloadText(inlined, fileName);
        finish(`HTML descargado con imágenes embebidas (${sizeKb} KB)`);
      }
    } catch (e) {
      setError((e instanceof Error ? e.message : null) || 'Error al embeber imágenes');
    } finally {
      setBusy(null);
    }
  };

  const handleAsIs = async () => {
    if (mode === 'copy') {
      await copyToClipboard(html);
      finish('HTML copiado (con rutas locales)');
    } else {
      downloadText(html, fileName);
      finish('HTML descargado (con rutas locales)');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="glass-shell" onClick={e => e.stopPropagation()} style={{ width: 560, animation: 'slideUp 0.4s ease-out' }}>
        <div className="glass-core" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {mode === 'copy' ? <Clipboard size={18} /> : <Download size={18} />}
              {mode === 'copy' ? 'Copiar HTML' : 'Descargar HTML'} con imágenes locales
            </h2>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar" style={{ width: 30, height: 30 }}><X size={17} /></button>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 16, lineHeight: 1.5 }}>
            <TriangleAlert size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />
            Este email usa <strong>{assetUrls.length}</strong> {assetUrls.length === 1 ? 'imagen local' : 'imágenes locales'} que solo existen en este equipo. Elige cómo exportarlas:
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#f87171', marginBottom: 12, background: 'rgba(239, 68, 68, 0.08)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
              <AlertCircle size={15} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 5 }} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Opción 1: URL pública */}
            <div className="glass-shell" style={{ padding: 4 }}>
              <div className="glass-core" style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                  <Globe2 size={15} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} /> Reescribir a URL pública <span className="badge badge-accent" style={{ fontSize: 9, padding: '2px 6px', marginLeft: 6 }}>Recomendado</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                  {autoBaseUrl && baseUrl === autoBaseUrl ? (
                    <>💡 Tus imágenes ya viven en <strong>Supabase Storage</strong> — esta URL pública se detectó automáticamente. Solo hacé clic en {mode === 'copy' ? 'Copiar' : 'Descargar'}.</>
                  ) : (
                    <>Sube la carpeta <code>data/assets/</code> a tu hosting/CDN o a la media library de tu plataforma de envío, y las rutas se reescriben. Funciona en todos los clientes de correo.</>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    placeholder="https://tucdn.com/emails"
                    spellCheck={false}
                    style={{ flex: 1, fontSize: 12 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handlePublicUrl} disabled={busy !== null} style={{ fontSize: 11, flexShrink: 0 }}>
                    {busy === 'public' ? <LoaderCircle size={15} className="spin" /> : mode === 'copy' ? 'Copiar' : 'Descargar'}
                  </button>
                </div>
                {autoBaseUrl && baseUrl !== autoBaseUrl && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setBaseUrl(autoBaseUrl)}
                    style={{ fontSize: 10, marginTop: 6, padding: '2px 6px', height: 'auto' }}
                  >
                    ↺ Usar la URL de Supabase Storage detectada
                  </button>
                )}
              </div>
            </div>

            {/* Opción 2: ZIP */}
            <div className="glass-shell" style={{ padding: 4 }}>
              <div className="glass-core" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}><Archive size={15} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />Descargar ZIP</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    <code>email.html</code> + carpeta <code>images/</code>. Sube las imágenes a tu plataforma y ajusta las rutas allí.
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleZip} disabled={busy !== null} style={{ fontSize: 11, flexShrink: 0 }}>
                  {busy === 'zip' ? <LoaderCircle size={15} className="spin" /> : 'Descargar ZIP'}
                </button>
              </div>
            </div>

            {/* Opción 3: Base64 */}
            <div className="glass-shell" style={{ padding: 4 }}>
              <div className="glass-core" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}><CodeXml size={15} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />Embeber en base64</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Solo para archivo o preview offline: <strong>Gmail y Outlook de escritorio lo bloquean</strong>, e infla el HTML ~33% (Gmail recorta &gt;102 KB).
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleBase64} disabled={busy !== null} style={{ fontSize: 11, flexShrink: 0 }}>
                  {busy === 'base64' ? <LoaderCircle size={15} className="spin" /> : mode === 'copy' ? 'Copiar' : 'Descargar'}
                </button>
              </div>
            </div>

            {/* Opción 4: tal cual */}
            <button className="btn btn-ghost btn-sm" onClick={handleAsIs} disabled={busy !== null} style={{ fontSize: 11, alignSelf: 'center' }}>
              {mode === 'copy' ? 'Copiar tal cual' : 'Descargar tal cual'} (solo funciona en tu máquina)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
