'use client';

import { useState, useCallback, useRef } from 'react';
import {
  BlockConfig,
  CanvasBlockType,
  CANVAS_BLOCK_CATALOG,
  generateBlockId,
  EmailContent,
  Brand,
} from '@/lib/types';
import { listAssets, uploadAsset } from '@/lib/assets';
import { EmailAsset } from '@/lib/types';
import { useEffect } from 'react';

// ============ Default block factories ============

function createDefaultBlock(type: CanvasBlockType): BlockConfig {
  const id = generateBlockId();
  switch (type) {
    case 'header':     return { id, type };
    case 'hero':       return { id, type, imageUrl: '', alt: '' };
    case 'text':       return { id, type, label: '', headline: '', body: '' };
    case 'image-text': return { id, type, imageUrl: '', text: '', imagePosition: 'left' as const };
    case 'gallery':    return { id, type, images: [], columns: 2 as const };
    case 'bullets':    return { id, type, bullets: ['', '', ''] };
    case 'infobox':    return { id, type, eventDate: '', eventTime: '' };
    case 'quote':      return { id, type, text: '', author: '' };
    case 'cta':        return { id, type, ctaText: '', ctaUrl: '' };
    case 'divider':    return { id, type };
    case 'spacer':     return { id, type, height: 20 };
    case 'footer':     return { id, type, footerNote: '' };
  }
}

// ============ Props ============

interface CanvasEditorProps {
  content: EmailContent;
  brand: Brand | null;
  onContentChange: (updates: Partial<EmailContent>) => void;
}

// ============ Component ============

export default function CanvasEditor({ content, brand, onContentChange }: CanvasEditorProps) {
  const blocks = content.blocks || [];
  const emailWidth = content.emailWidth || 600;

  const [canvasTab, setCanvasTab] = useState<'blocks' | 'adsets'>('blocks');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Adsets library state
  const [adsetAssets, setAdsetAssets] = useState<EmailAsset[]>([]);
  const [adsetLoading, setAdsetLoading] = useState(false);
  const [adsetUploading, setAdsetUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const brandId = brand?.id || '';

  // Load assets for the adsets library
  const refreshAdsets = useCallback(() => {
    if (!brandId) return;
    setAdsetLoading(true);
    listAssets(brandId)
      .then(setAdsetAssets)
      .catch(() => {})
      .finally(() => setAdsetLoading(false));
  }, [brandId]);

  useEffect(() => {
    refreshAdsets();
  }, [refreshAdsets]);

  // ============ Block manipulation ============

  const setBlocks = useCallback((newBlocks: BlockConfig[]) => {
    onContentChange({ blocks: newBlocks });
  }, [onContentChange]);

  const addBlock = useCallback((type: CanvasBlockType) => {
    const block = createDefaultBlock(type);
    setBlocks([...blocks, block]);
    setActiveBlockId(block.id);
    setShowPalette(false);
  }, [blocks, setBlocks]);

  const removeBlock = useCallback((id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  }, [blocks, setBlocks, activeBlockId]);

  const moveBlock = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const updated = [...blocks];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setBlocks(updated);
  }, [blocks, setBlocks]);

  const duplicateBlock = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const clone: BlockConfig = { ...blocks[idx], id: generateBlockId() } as BlockConfig;
    const updated = [...blocks];
    updated.splice(idx + 1, 0, clone);
    setBlocks(updated);
    setActiveBlockId(clone.id);
  }, [blocks, setBlocks]);

  const updateBlock = useCallback((id: string, updates: Partial<BlockConfig>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } as BlockConfig : b));
  }, [blocks, setBlocks]);

  // ============ Drag & Drop ============

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx.toString());
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDropIndex(idx);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex !== null && dropIndex !== null) {
      moveBlock(dragIndex, dropIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  // ============ Adset upload ============

  const handleAdsetUpload = async (files: FileList | File[]) => {
    if (!brandId) return;
    setAdsetUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadAsset(file, brandId);
      }
      refreshAdsets();
    } catch {
      // Silently fail
    } finally {
      setAdsetUploading(false);
    }
  };

  const injectAdsetImage = (url: string) => {
    // If there's an active block, inject the URL there if supported
    if (activeBlockId) {
      const block = blocks.find(b => b.id === activeBlockId);
      if (block) {
        if (block.type === 'hero' || block.type === 'image-text') {
          updateBlock(activeBlockId, { imageUrl: url });
          return;
        } else if (block.type === 'gallery') {
          // Find first empty image slot or push new
          const images = [...block.images];
          const emptyIdx = images.findIndex(img => !img.url);
          if (emptyIdx !== -1) {
            images[emptyIdx] = { ...images[emptyIdx], url };
          } else {
            images.push({ url });
          }
          updateBlock(activeBlockId, { images });
          return;
        }
      }
    }
    // Otherwise, add a new hero block with this image
    const newBlock = createDefaultBlock('hero');
    (newBlock as { imageUrl: string }).imageUrl = url;
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  // ============ Block editor form ============

  const activeBlock = blocks.find(b => b.id === activeBlockId) || null;



  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 4,
    display: 'block',
  };

  const renderBlockEditor = () => {
    if (!activeBlock) {
      return (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Seleccioná un bloque para editarlo
        </div>
      );
    }

    const fieldGroup = (label: string, children: React.ReactNode) => (
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>{label}</label>
        {children}
      </div>
    );

    switch (activeBlock.type) {
      case 'header':
        return (
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              El header usa el logo y nombre de la marca seleccionada automáticamente.
            </p>
          </div>
        );

      case 'hero':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('URL de Imagen', <input className="form-input" value={activeBlock.imageUrl} onChange={e => updateBlock(activeBlock.id, { imageUrl: e.target.value })} placeholder="https://..." />)}
            {fieldGroup('Alt Text', <input className="form-input" value={activeBlock.alt || ''} onChange={e => updateBlock(activeBlock.id, { alt: e.target.value })} placeholder="Descripción de imagen" />)}
            {fieldGroup('Link (opcional)', <input className="form-input" value={activeBlock.href || ''} onChange={e => updateBlock(activeBlock.id, { href: e.target.value })} placeholder="https://..." />)}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={activeBlock.fullBleed || false} onChange={e => updateBlock(activeBlock.id, { fullBleed: e.target.checked })} />
              Full bleed (sin padding)
            </label>
          </div>
        );

      case 'text':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Etiqueta', <input className="form-input" value={activeBlock.label || ''} onChange={e => updateBlock(activeBlock.id, { label: e.target.value })} placeholder="MASTERCLASS" />)}
            {fieldGroup('Título', <input className="form-input" value={activeBlock.headline || ''} onChange={e => updateBlock(activeBlock.id, { headline: e.target.value })} placeholder="Gran título" />)}
            {fieldGroup('Cuerpo', <textarea className="form-input" style={{ minHeight: 80, resize: 'vertical' }} value={activeBlock.body || ''} onChange={e => updateBlock(activeBlock.id, { body: e.target.value })} placeholder="Texto del cuerpo..." />)}
          </div>
        );

      case 'image-text':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('URL de Imagen', <input className="form-input" value={activeBlock.imageUrl} onChange={e => updateBlock(activeBlock.id, { imageUrl: e.target.value })} placeholder="https://..." />)}
            {fieldGroup('Título', <input className="form-input" value={activeBlock.title || ''} onChange={e => updateBlock(activeBlock.id, { title: e.target.value })} />)}
            {fieldGroup('Texto', <textarea className="form-input" style={{ minHeight: 60, resize: 'vertical' }} value={activeBlock.text} onChange={e => updateBlock(activeBlock.id, { text: e.target.value })} />)}
            {fieldGroup('Posición Imagen', 
              <div style={{ display: 'flex', gap: 8 }}>
                {(['left', 'right'] as const).map(pos => (
                  <button key={pos} type="button" onClick={() => updateBlock(activeBlock.id, { imagePosition: pos })} style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--border-subtle)', borderRadius: 6, background: activeBlock.imagePosition === pos ? 'var(--accent)' : 'var(--bg-tertiary)', color: activeBlock.imagePosition === pos ? '#fff' : 'var(--text-secondary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {pos === 'left' ? '⬅️ Izquierda' : '➡️ Derecha'}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'gallery':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Columnas', 
              <div style={{ display: 'flex', gap: 8 }}>
                {([2, 3] as const).map(n => (
                  <button key={n} type="button" onClick={() => updateBlock(activeBlock.id, { columns: n })} style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--border-subtle)', borderRadius: 6, background: activeBlock.columns === n ? 'var(--accent)' : 'var(--bg-tertiary)', color: activeBlock.columns === n ? '#fff' : 'var(--text-secondary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {n} columnas
                  </button>
                ))}
              </div>
            )}
            {fieldGroup('Caption', <input className="form-input" value={activeBlock.caption || ''} onChange={e => updateBlock(activeBlock.id, { caption: e.target.value })} />)}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              📸 Usá la pestaña Adsets para agregar imágenes a la galería.
            </div>
            {activeBlock.images.map((img, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                <input className="form-input" style={{ flex: 1 }} value={img.url} onChange={e => {
                  const newImages = [...activeBlock.images];
                  newImages[i] = { ...newImages[i], url: e.target.value };
                  updateBlock(activeBlock.id, { images: newImages });
                }} placeholder={`Imagen ${i + 1} URL`} />
                <button type="button" onClick={() => {
                  const newImages = activeBlock.images.filter((_, j) => j !== i);
                  updateBlock(activeBlock.id, { images: newImages });
                }} style={{ width: 28, height: 28, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            ))}
            <button type="button" onClick={() => {
              updateBlock(activeBlock.id, { images: [...activeBlock.images, { url: '' }] });
            }} style={{ marginTop: 6, padding: '6px 12px', border: '1px dashed var(--border-hover)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, width: '100%' }}>+ Agregar Imagen</button>
          </div>
        );

      case 'bullets':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Título Bullets', <input className="form-input" value={activeBlock.bulletsTitle || ''} onChange={e => updateBlock(activeBlock.id, { bulletsTitle: e.target.value })} placeholder="Lo que vas a aprender" />)}
            {activeBlock.bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                <input className="form-input" style={{ flex: 1 }} value={b} onChange={e => {
                  const newBullets = [...activeBlock.bullets];
                  newBullets[i] = e.target.value;
                  updateBlock(activeBlock.id, { bullets: newBullets });
                }} placeholder={`Bullet ${i + 1}`} />
                <button type="button" onClick={() => {
                  const newBullets = activeBlock.bullets.filter((_, j) => j !== i);
                  updateBlock(activeBlock.id, { bullets: newBullets });
                }} style={{ width: 28, height: 28, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            ))}
            <button type="button" onClick={() => {
              updateBlock(activeBlock.id, { bullets: [...activeBlock.bullets, ''] });
            }} style={{ marginTop: 6, padding: '6px 12px', border: '1px dashed var(--border-hover)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, width: '100%' }}>+ Agregar Bullet</button>
          </div>
        );

      case 'infobox':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Fecha', <input className="form-input" value={activeBlock.eventDate || ''} onChange={e => updateBlock(activeBlock.id, { eventDate: e.target.value })} placeholder="15 de Julio, 2025" />)}
            {fieldGroup('Hora', <input className="form-input" value={activeBlock.eventTime || ''} onChange={e => updateBlock(activeBlock.id, { eventTime: e.target.value })} placeholder="7:00 PM (Hora Colombia)" />)}
          </div>
        );

      case 'quote':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Cita', <textarea className="form-input" style={{ minHeight: 60, resize: 'vertical' }} value={activeBlock.text} onChange={e => updateBlock(activeBlock.id, { text: e.target.value })} placeholder="El texto del testimonio..." />)}
            {fieldGroup('Autor', <input className="form-input" value={activeBlock.author || ''} onChange={e => updateBlock(activeBlock.id, { author: e.target.value })} placeholder="Nombre" />)}
            {fieldGroup('Cargo', <input className="form-input" value={activeBlock.role || ''} onChange={e => updateBlock(activeBlock.id, { role: e.target.value })} placeholder="CEO, Empresa" />)}
          </div>
        );

      case 'cta':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Texto del Botón', <input className="form-input" value={activeBlock.ctaText} onChange={e => updateBlock(activeBlock.id, { ctaText: e.target.value })} placeholder="RESERVAR MI LUGAR" />)}
            {fieldGroup('URL del Botón', <input className="form-input" value={activeBlock.ctaUrl} onChange={e => updateBlock(activeBlock.id, { ctaUrl: e.target.value })} placeholder="https://..." />)}
            {fieldGroup('Pre-CTA (opcional)', <input className="form-input" value={activeBlock.preCta || ''} onChange={e => updateBlock(activeBlock.id, { preCta: e.target.value })} placeholder="¿Listo para comenzar?" />)}
            {fieldGroup('CTA Secundario (texto)', <input className="form-input" value={activeBlock.secondaryCtaText || ''} onChange={e => updateBlock(activeBlock.id, { secondaryCtaText: e.target.value })} />)}
            {fieldGroup('CTA Secundario (url)', <input className="form-input" value={activeBlock.secondaryCtaUrl || ''} onChange={e => updateBlock(activeBlock.id, { secondaryCtaUrl: e.target.value })} />)}
          </div>
        );

      case 'divider':
        return (
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Línea separadora sutil. Sin configuración extra.
            </p>
          </div>
        );

      case 'spacer':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Altura (px)', <input type="number" className="form-input" value={activeBlock.height || 20} onChange={e => updateBlock(activeBlock.id, { height: parseInt(e.target.value) || 20 })} min={4} max={120} />)}
          </div>
        );

      case 'footer':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Nota de pie', <textarea className="form-input" style={{ minHeight: 50, resize: 'vertical' }} value={activeBlock.footerNote || ''} onChange={e => updateBlock(activeBlock.id, { footerNote: e.target.value })} placeholder="Si no deseas recibir más correos..." />)}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
              El tagline, logo y disclaimer se toman de la marca.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // ============ Catalog info for labels ============

  const blockLabel = (type: CanvasBlockType) => {
    const item = CANVAS_BLOCK_CATALOG.find(c => c.type === type);
    return item ? `${item.icon} ${item.label}` : type;
  };

  // ============ Render ============

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto', paddingRight: 4 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10, margin: '0 0 8px 0' }}>
        🧱 Canvas Visual
      </h3>

      {/* Email width control */}
      <div className="email-width-control">
        <label>Ancho:</label>
        <input
          type="range"
          min={400}
          max={800}
          step={10}
          value={emailWidth}
          onChange={e => onContentChange({ emailWidth: parseInt(e.target.value) })}
        />
        <span className="width-value">{emailWidth}px</span>
      </div>

      {/* Canvas sub-tabs */}
      <div className="canvas-tabs">
        <button
          type="button"
          className={`canvas-tab ${canvasTab === 'blocks' ? 'active' : ''}`}
          onClick={() => setCanvasTab('blocks')}
        >
          🧱 Bloques
        </button>
        <button
          type="button"
          className={`canvas-tab ${canvasTab === 'adsets' ? 'active' : ''}`}
          onClick={() => setCanvasTab('adsets')}
        >
          🎨 Adsets
        </button>
      </div>

      {/* TAB: Blocks */}
      {canvasTab === 'blocks' && (
        <div>
          {/* Block list */}
          {blocks.length === 0 && (
            <div style={{
              padding: 24,
              textAlign: 'center',
              border: '2px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)',
              fontSize: 13,
              marginBottom: 12
            }}>
              <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>🧱</span>
              Sin bloques aún. Agregá tu primer bloque para armar el email.
            </div>
          )}

          {blocks.map((block, index) => (
            <div key={block.id}>
              {/* Drop zone indicator */}
              <div
                className={`drop-zone-indicator ${dropIndex === index && dragIndex !== null && dragIndex !== index ? 'visible' : ''}`}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={handleDrop}
              />
              <div
                className={`canvas-block-card ${activeBlockId === block.id ? 'is-active' : ''} ${dragIndex === index ? 'is-dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onClick={() => setActiveBlockId(block.id === activeBlockId ? null : block.id)}
              >
                <span className="block-handle">⠿</span>
                <div className="block-header" style={{ paddingLeft: 16 }}>
                  <span className="block-type-badge">{blockLabel(block.type)}</span>
                  <div className="block-actions">
                    <button
                      type="button"
                      className="block-action-btn"
                      title="Mover arriba"
                      onClick={e => { e.stopPropagation(); if (index > 0) moveBlock(index, index - 1); }}
                      disabled={index === 0}
                    >↑</button>
                    <button
                      type="button"
                      className="block-action-btn"
                      title="Mover abajo"
                      onClick={e => { e.stopPropagation(); if (index < blocks.length - 1) moveBlock(index, index + 1); }}
                      disabled={index === blocks.length - 1}
                    >↓</button>
                    <button
                      type="button"
                      className="block-action-btn"
                      title="Duplicar"
                      onClick={e => { e.stopPropagation(); duplicateBlock(block.id); }}
                    >⧉</button>
                    <button
                      type="button"
                      className="block-action-btn danger"
                      title="Eliminar"
                      onClick={e => { e.stopPropagation(); removeBlock(block.id); }}
                    >✕</button>
                  </div>
                </div>

                {/* Inline editor for active block */}
                {activeBlockId === block.id && (
                  <div onClick={e => e.stopPropagation()}>
                    {renderBlockEditor()}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Drop zone at the end */}
          <div
            className={`drop-zone-indicator ${dropIndex === blocks.length && dragIndex !== null ? 'visible' : ''}`}
            onDragOver={e => handleDragOver(e, blocks.length)}
            onDrop={handleDrop}
          />

          {/* Add block button / palette toggle */}
          <button
            type="button"
            onClick={() => setShowPalette(!showPalette)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: showPalette ? 'var(--accent-glow)' : 'var(--bg-card)',
              border: `1px ${showPalette ? 'solid var(--accent)' : 'dashed var(--border-hover)'}`,
              borderRadius: 'var(--radius-sm)',
              color: showPalette ? 'var(--accent-light)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              marginTop: 8,
            }}
          >
            {showPalette ? '✕ Cerrar paleta' : '+ Agregar Bloque'}
          </button>

          {/* Block palette */}
          {showPalette && (
            <div className="block-palette">
              {CANVAS_BLOCK_CATALOG.map(item => (
                <button
                  key={item.type}
                  type="button"
                  className="block-palette-btn"
                  onClick={() => addBlock(item.type)}
                >
                  <span className="palette-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Adsets Library */}
      {canvasTab === 'adsets' && (
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Subí imágenes y hacé clic en &quot;Usar&quot; para inyectarlas en el bloque activo.
          </p>

          {/* Upload area */}
          <div
            style={{
              padding: 16,
              border: '2px dashed var(--border-hover)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              marginBottom: 12,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: 12,
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              if (e.dataTransfer.files.length) handleAdsetUpload(e.dataTransfer.files);
            }}
          >
            {adsetUploading ? '⏳ Subiendo...' : '📁 Arrastrá o hacé clic para subir imágenes'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={e => {
                if (e.target.files) handleAdsetUpload(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {adsetLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 16, fontSize: 13 }}>
              Cargando assets...
            </div>
          ) : adsetAssets.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>
              Sin assets aún. Subí imágenes para tu biblioteca visual.
            </div>
          ) : (
            <div className="adsets-grid">
              {adsetAssets.map(asset => (
                <div key={asset.filename} className="adset-thumb" onClick={() => injectAdsetImage(asset.url)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.filename} />
                  <div className="adset-overlay">
                    <button type="button" className="adset-use-btn">Usar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
