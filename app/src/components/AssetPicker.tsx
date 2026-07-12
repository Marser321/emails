'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Check, FolderOpen, ImageIcon, Link2, Pencil, Search, Trash2, Upload, X } from 'lucide-react';
import { deleteAsset, listAssets, updateAssetMetadata, uploadAsset } from '@/lib/assets';
import type { EmailAsset } from '@/lib/types';

type AssetSelection = Pick<EmailAsset, 'url' | 'altText'> & Partial<Omit<EmailAsset, 'url' | 'altText'>>;

interface AssetPickerProps {
  brandId: string;
  onSelect: (asset: AssetSelection) => void;
  onClose: () => void;
  title?: string;
  initialKind?: EmailAsset['kind'];
}

const kinds: { value: 'all' | NonNullable<EmailAsset['kind']>; label: string }[] = [
  { value: 'all', label: 'Todos' }, { value: 'hero', label: 'Heroes' }, { value: 'tile', label: 'Tiles' },
  { value: 'logo', label: 'Logos' }, { value: 'icon', label: 'Iconos' }, { value: 'other', label: 'Otros' },
];

export default function AssetPicker({ brandId, onSelect, onClose, title, initialKind }: AssetPickerProps) {
  const [tab, setTab] = useState<'brand' | 'shared'>(brandId && brandId !== '_shared' ? 'brand' : 'shared');
  const [kind, setKind] = useState<(typeof kinds)[number]['value']>(initialKind || 'all');
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<EmailAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmailAsset | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editKind, setEditKind] = useState<NonNullable<EmailAsset['kind']>>('other');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeBrandId = tab === 'brand' ? brandId : '_shared';

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    listAssets(activeBrandId, { kind: kind === 'all' ? undefined : kind, query })
      .then(setAssets)
      .catch(reason => setError(reason.message))
      .finally(() => setLoading(false));
  }, [activeBrandId, kind, query]);

  useEffect(() => {
    let active = true;
    listAssets(activeBrandId, { kind: kind === 'all' ? undefined : kind, query })
      .then(items => { if (active) setAssets(items); })
      .catch(reason => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeBrandId, kind, query]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  async function handleFiles(files: FileList | File[]) {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadAsset(file, activeBrandId, { kind: kind === 'all' ? 'other' : kind });
      }
      refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(asset: EmailAsset) {
    if (!window.confirm(`¿Eliminar "${asset.filename}"?`)) return;
    try {
      await deleteAsset(asset);
      refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Error al eliminar');
    }
  }

  function startEditing(asset: EmailAsset) {
    setEditing(asset);
    setEditAlt(asset.altText || '');
    setEditKind(asset.kind || 'other');
  }

  async function saveMetadata() {
    if (!editing?.id || !editAlt.trim()) return;
    try {
      await updateAssetMetadata(editing.id, { kind: editKind, altText: editAlt.trim(), author: editing.author, intendedUse: editing.intendedUse });
      setEditing(null);
      refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Error al editar');
    }
  }

  const externalValid = /^https?:\/\//i.test(externalUrl.trim());

  return (
    <div className="modal-overlay asset-picker-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="asset-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="asset-picker-title">
        <header className="asset-picker-header">
          <div><span className="eyebrow"><ImageIcon size={15} /> Biblioteca visual</span><h2 id="asset-picker-title">{title || 'Elegir imagen'}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </header>

        <div className="asset-picker-filters">
          <div className="asset-tabs" aria-label="Origen de assets">
            <button className={tab === 'brand' ? 'active' : ''} disabled={!brandId || brandId === '_shared'} onClick={() => { setLoading(true); setTab('brand'); }}><Building2 size={16} /> Marca</button>
            <button className={tab === 'shared' ? 'active' : ''} onClick={() => { setLoading(true); setTab('shared'); }}><FolderOpen size={16} /> Compartidos</button>
          </div>
          <label className="asset-search"><Search size={17} /><input value={query} onChange={event => { setLoading(true); setQuery(event.target.value); }} placeholder="Buscar por nombre o alt text" /></label>
          <select value={kind} onChange={event => { setLoading(true); setKind(event.target.value as typeof kind); }} aria-label="Filtrar por tipo">
            {kinds.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>

        <div className={`asset-dropzone ${dragOver ? 'drag-over' : ''}`} onDragOver={event => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={event => { event.preventDefault(); setDragOver(false); if (event.dataTransfer.files.length) void handleFiles(event.dataTransfer.files); }}>
          <Upload size={20} />
          <span>{uploading ? 'Procesando imagen…' : 'Arrastra una imagen o'}</span>
          {!uploading && <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>Seleccionar archivo</button>}
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden multiple onChange={event => { if (event.target.files?.length) void handleFiles(event.target.files); event.target.value = ''; }} />
          <small>JPEG, PNG, WebP o GIF · máximo 8 MB · validación real con Sharp</small>
        </div>

        {error && <div className="asset-error" role="alert">{error}</div>}

        <div className="asset-grid" aria-busy={loading}>
          {loading ? <div className="asset-empty">Cargando biblioteca…</div> : assets.length === 0 ? <div className="asset-empty"><ImageIcon size={32} /><strong>No hay assets para este filtro</strong><span>Prueba otro tipo o sube una imagen.</span></div> : assets.map(asset => {
            const starter = asset.url.startsWith('/email-assets/');
            return (
              <article className="asset-card" key={asset.id || `${asset.brandId}-${asset.filename}`}>
                <button className="asset-select" onClick={() => onSelect(asset)} aria-label={`Usar ${asset.altText || asset.filename}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.thumbnailUrl || asset.url} alt={asset.altText || asset.filename} loading="lazy" />
                  <span><strong>{asset.filename}</strong><small>{asset.kind || 'other'} · {asset.width || '?'}×{asset.height || '?'}</small></span>
                </button>
                {!starter && <div className="asset-card-actions"><button onClick={() => startEditing(asset)} aria-label="Editar metadatos"><Pencil size={15} /></button><button onClick={() => void handleDelete(asset)} aria-label="Eliminar asset"><Trash2 size={15} /></button></div>}
              </article>
            );
          })}
        </div>

        <footer className="asset-picker-footer">
          <label><Link2 size={17} /><input value={externalUrl} onChange={event => setExternalUrl(event.target.value)} placeholder="https://… URL externa absoluta" /></label>
          <button className="btn btn-secondary" disabled={!externalValid} onClick={() => onSelect({ filename: externalUrl.trim(), brandId: '', url: externalUrl.trim(), size: 0, modifiedAt: '', kind: initialKind || 'other', altText: 'Imagen externa' })}>Usar URL</button>
        </footer>

        {editing && <div className="asset-edit-panel">
          <div><h3>Editar metadatos</h3><button className="icon-button" onClick={() => setEditing(null)} aria-label="Cancelar edición"><X size={18} /></button></div>
          <label>Texto alternativo<input value={editAlt} onChange={event => setEditAlt(event.target.value)} maxLength={240} /></label>
          <label>Tipo<select value={editKind} onChange={event => setEditKind(event.target.value as typeof editKind)}>{kinds.filter(item => item.value !== 'all').map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <button className="btn btn-primary" onClick={() => void saveMetadata()} disabled={!editAlt.trim()}><Check size={17} /> Guardar</button>
        </div>}
      </section>
    </div>
  );
}
