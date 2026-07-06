'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteAsset, listAssets, uploadAsset } from '@/lib/assets';
import { EmailAsset } from '@/lib/types';

interface AssetPickerProps {
  brandId: string;
  onSelect: (asset: EmailAsset) => void;
  onClose: () => void;
  title?: string;
}

// Picker de imágenes locales (data/assets/): tabs Marca/Compartidos, drag & drop,
// subida y URL externa como escape. También se puede soltar archivos en Finder
// directamente en data/assets/<brandId>/ — aparecen acá sin reiniciar.
export default function AssetPicker({ brandId, onSelect, onClose, title }: AssetPickerProps) {
  const [tab, setTab] = useState<'brand' | 'shared'>(brandId && brandId !== '_shared' ? 'brand' : 'shared');
  const [assets, setAssets] = useState<EmailAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeBrandId = tab === 'brand' ? brandId : '_shared';

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    listAssets(activeBrandId)
      .then(setAssets)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeBrandId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFiles = async (files: FileList | File[]) => {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadAsset(file, activeBrandId);
      }
      refresh();
    } catch (e) {
      setError((e instanceof Error ? e.message : null) || 'Error al subir');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (asset: EmailAsset) => {
    if (!confirm(`¿Eliminar "${asset.filename}"?`)) return;
    try {
      await deleteAsset(asset.brandId, asset.filename);
      refresh();
    } catch (e) {
      setError((e instanceof Error ? e.message : null) || 'Error al eliminar');
    }
  };

  const formatSize = (bytes: number) =>
    bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="glass-shell" onClick={e => e.stopPropagation()} style={{ width: 640, animation: 'slideUp 0.4s ease-out' }}>
        <div className="glass-core" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>🖼️ {title || 'Elegir imagen'}</h2>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar" style={{ width: 30, height: 30 }}>✕</button>
          </div>

          {/* Tabs Marca / Compartidos */}
          <div style={{ display: 'flex', background: 'rgba(5, 5, 10, 0.4)', borderRadius: '100px', padding: 4, border: '1px solid var(--border-subtle)', marginBottom: 14, maxWidth: 320 }}>
            {([
              { id: 'brand' as const, label: '🏢 De la marca', disabled: !brandId || brandId === '_shared' },
              { id: 'shared' as const, label: '📂 Compartidos', disabled: false },
            ]).map(t => (
              <button
                key={t.id}
                type="button"
                disabled={t.disabled}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  border: 'none',
                  borderRadius: '100px',
                  background: tab === t.id ? 'var(--accent-gradient)' : 'transparent',
                  color: tab === t.id ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: t.disabled ? 'not-allowed' : 'pointer',
                  opacity: t.disabled ? 0.4 : 1,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Zona de drop / subida */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
            }}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              textAlign: 'center',
              marginBottom: 14,
              background: dragOver ? 'rgba(99, 102, 241, 0.08)' : 'rgba(5, 5, 10, 0.2)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {uploading ? '⏳ Subiendo…' : 'Arrastra imágenes aquí, o '}
            </span>
            {!uploading && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: 11, padding: '4px 10px', marginLeft: 4 }}
              >
                📤 Subir archivo
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.webp"
              multiple
              hidden
              onChange={e => {
                if (e.target.files?.length) handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
              PNG/JPG recomendado (WebP no se ve en Outlook de escritorio) · También puedes soltar archivos en <code>data/assets/</code> desde Finder
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#f87171', marginBottom: 10, background: 'rgba(239, 68, 68, 0.08)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
              ❌ {error}
            </div>
          )}

          {/* Grid de thumbnails */}
          <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 14 }}>
            {loading ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, animation: 'pulse 1.5s infinite' }}>
                Cargando imágenes…
              </div>
            ) : assets.length === 0 ? (
              <div className="empty-state" style={{ padding: '26px 10px' }}>
                <div className="empty-icon" style={{ fontSize: 30 }}>🖼️</div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
                  No hay imágenes todavía. Sube una o suelta archivos en la carpeta del proyecto.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                {assets.map(asset => (
                  <div
                    key={asset.filename}
                    onClick={() => onSelect(asset)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') onSelect(asset); }}
                    style={{
                      position: 'relative',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.03)',
                      transition: 'border-color var(--transition-fast)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.filename}
                      loading="lazy"
                      style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block', background: '#ffffff' }}
                    />
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {asset.filename}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{formatSize(asset.size)}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={e => { e.stopPropagation(); handleDelete(asset); }}
                      title="Eliminar imagen"
                      aria-label={`Eliminar ${asset.filename}`}
                      style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, padding: 0, fontSize: 10, borderRadius: 6 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Escape hatch: URL externa */}
          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            <input
              className="form-input"
              value={externalUrl}
              onChange={e => setExternalUrl(e.target.value)}
              placeholder="…o pega una URL externa (https://…)"
              spellCheck={false}
              style={{ flex: 1, fontSize: 12 }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!externalUrl.trim().startsWith('http')}
              onClick={() =>
                onSelect({
                  filename: externalUrl.trim(),
                  brandId: '',
                  url: externalUrl.trim(),
                  size: 0,
                  modifiedAt: '',
                })
              }
              style={{ fontSize: 11 }}
            >
              Usar URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
