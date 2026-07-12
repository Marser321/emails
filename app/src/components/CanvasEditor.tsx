'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  BlockConfig,
  CanvasBlockType,
  CANVAS_BLOCK_CATALOG,
  createDefaultBlock,
  generateBlockId,
  EmailContent,
  Brand,
} from '@/lib/types';
import { moveBlock as moveBlockInArray } from '@/lib/email-document';
import { listAssets, uploadAsset } from '@/lib/assets';
import { EmailAsset } from '@/lib/types';
import { Palette } from 'lucide-react';
import BlockIcon from './BlockIcon';
import EmojiPicker, { insertEmojiAtFocusedField } from './EmojiPicker';
import { EMAIL_SAFE_FONTS } from '@/lib/email-safety';

// ============ Helpers ============

function lightenHexColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round((255 - ((num >> 8) & 0x00ff)) * percent / 100));
  const b = Math.min(255, (num & 0x0000ff) + Math.round((255 - (num & 0x0000ff)) * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// ============ Props ============

interface CanvasEditorProps {
  content: EmailContent;
  brand: Brand | null;
  onContentChange: (updates: Partial<EmailContent>) => void;
  onOpenDesignHub?: (tab?: 'colors' | 'banners') => void;
  selectedBlockId?: string | null;
  onBlockSelect?: (blockId: string | null) => void;
}

// ============ Component ============

export default function CanvasEditor({ content, brand, onContentChange, onOpenDesignHub, selectedBlockId, onBlockSelect }: CanvasEditorProps) {
  const blocks = useMemo(() => content.blocks || [], [content.blocks]);
  const emailWidth = content.emailWidth || 600;

  const [canvasTab, setCanvasTab] = useState<'blocks' | 'adsets'>('blocks');
  const [localActiveBlockId, setLocalActiveBlockId] = useState<string | null>(null);
  const activeBlockId = selectedBlockId ?? localActiveBlockId;
  const [showPalette, setShowPalette] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Adsets library state
  const [adsetAssets, setAdsetAssets] = useState<EmailAsset[]>([]);
  const [adsetLoading, setAdsetLoading] = useState(false);
  const [adsetUploading, setAdsetUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const brandId = brand?.id || '';

  const selectBlock = useCallback((id: string | null) => {
    setLocalActiveBlockId(id);
    onBlockSelect?.(id);
  }, [onBlockSelect]);

  // Load assets for the adsets library
  const refreshAdsets = useCallback(() => {
    if (!brandId) return;
    setAdsetLoading(true);
    listAssets(brandId)
      .then(setAdsetAssets)
      .catch(() => {})
      .finally(() => setAdsetLoading(false));
  }, [brandId]);

  // ============ Block manipulation ============

  const setBlocks = useCallback((newBlocks: BlockConfig[]) => {
    onContentChange({ blocks: newBlocks });
  }, [onContentChange]);

  const addBlock = useCallback((type: CanvasBlockType) => {
    const block = createDefaultBlock(type);
    setBlocks([...blocks, block]);
    selectBlock(block.id);
    setShowPalette(false);
  }, [blocks, setBlocks, selectBlock]);

  const removeBlock = useCallback((id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (activeBlockId === id) selectBlock(null);
  }, [blocks, setBlocks, activeBlockId, selectBlock]);

  const moveBlock = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setBlocks(moveBlockInArray(blocks, fromIdx, toIdx));
  }, [blocks, setBlocks]);

  const duplicateBlock = useCallback((id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const clone: BlockConfig = { ...blocks[idx], id: generateBlockId() } as BlockConfig;
    const updated = [...blocks];
    updated.splice(idx + 1, 0, clone);
    setBlocks(updated);
    selectBlock(clone.id);
  }, [blocks, setBlocks, selectBlock]);

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
    selectBlock(newBlock.id);
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

    const fieldGroup = (label: string, children: React.ReactNode, withEmoji = false) => (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <label style={labelStyle}>{label}</label>
          {withEmoji ? <EmojiPicker onSelect={insertEmojiAtFocusedField} /> : null}
        </div>
        {children}
      </div>
    );

    // Slider numérico con valor visible (para radios/anchos de imagen)
    const styleSlider = (label: string, value: number, min: number, max: number, unit: string, onChange: (v: number) => void) =>
      fieldGroup(label,
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={e => {
              const v = parseInt(e.target.value);
              if (!Number.isNaN(v)) onChange(v);
            }}
            style={{ flex: 1, accentColor: 'var(--accent)' }}
          />
          <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-secondary)', minWidth: 46, textAlign: 'right' }}>
            {value}{unit}
          </span>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={activeBlock.fullBleed || false} onChange={e => updateBlock(activeBlock.id, { fullBleed: e.target.checked })} />
              Full bleed (sin padding)
            </label>
            {styleSlider('Radio de esquinas', activeBlock.borderRadius ?? 0, 0, 32, 'px', v => updateBlock(activeBlock.id, { borderRadius: v }))}
            {styleSlider('Ancho de la imagen', activeBlock.widthPercent ?? 100, 30, 100, '%', v => updateBlock(activeBlock.id, { widthPercent: v }))}
          </div>
        );

      case 'text':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Etiqueta', <input className="form-input" value={activeBlock.label || ''} onChange={e => updateBlock(activeBlock.id, { label: e.target.value })} placeholder="MASTERCLASS" />, true)}
            {fieldGroup('Título', <input className="form-input" value={activeBlock.headline || ''} onChange={e => updateBlock(activeBlock.id, { headline: e.target.value })} placeholder="Gran título" />, true)}
            {fieldGroup('Cuerpo', <textarea className="form-input" style={{ minHeight: 80, resize: 'vertical' }} value={activeBlock.body || ''} onChange={e => updateBlock(activeBlock.id, { body: e.target.value })} placeholder="Texto del cuerpo..." />, true)}
          </div>
        );

      case 'image-text':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('URL de Imagen', <input className="form-input" value={activeBlock.imageUrl} onChange={e => updateBlock(activeBlock.id, { imageUrl: e.target.value })} placeholder="https://..." />)}
            {fieldGroup('Título', <input className="form-input" value={activeBlock.title || ''} onChange={e => updateBlock(activeBlock.id, { title: e.target.value })} />, true)}
            {fieldGroup('Texto', <textarea className="form-input" style={{ minHeight: 60, resize: 'vertical' }} value={activeBlock.text} onChange={e => updateBlock(activeBlock.id, { text: e.target.value })} />, true)}
            {fieldGroup('Posición Imagen',
              <div style={{ display: 'flex', gap: 8 }}>
                {(['left', 'right'] as const).map(pos => (
                  <button key={pos} type="button" onClick={() => updateBlock(activeBlock.id, { imagePosition: pos })} style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--border-subtle)', borderRadius: 6, background: activeBlock.imagePosition === pos ? 'var(--accent)' : 'var(--bg-tertiary)', color: activeBlock.imagePosition === pos ? '#fff' : 'var(--text-secondary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {pos === 'left' ? '⬅️ Izquierda' : '➡️ Derecha'}
                  </button>
                ))}
              </div>
            )}
            {styleSlider('Radio de esquinas', activeBlock.borderRadius ?? 8, 0, 32, 'px', v => updateBlock(activeBlock.id, { borderRadius: v }))}
            {styleSlider('Ancho de la imagen', activeBlock.imageWidth ?? 252, 120, 252, 'px', v => updateBlock(activeBlock.id, { imageWidth: v }))}
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
            {styleSlider('Radio de esquinas', activeBlock.borderRadius ?? 8, 0, 32, 'px', v => updateBlock(activeBlock.id, { borderRadius: v }))}
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
            {fieldGroup('Título Bullets', <input className="form-input" value={activeBlock.bulletsTitle || ''} onChange={e => updateBlock(activeBlock.id, { bulletsTitle: e.target.value })} placeholder="Lo que vas a aprender" />, true)}
            {fieldGroup('Marcador general', <input className="form-input" value={activeBlock.marker || ''} onChange={e => updateBlock(activeBlock.id, { marker: e.target.value })} placeholder="•  ✅  ›" />, true)}
            {activeBlock.bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                <input className="form-input" style={{ flex: 1 }} value={b} onChange={e => {
                  const newBullets = [...activeBlock.bullets];
                  newBullets[i] = e.target.value;
                  updateBlock(activeBlock.id, { bullets: newBullets });
                }} placeholder={`Bullet ${i + 1}`} />
                <EmojiPicker onSelect={insertEmojiAtFocusedField} label={`Insertar emoji en bullet ${i + 1}`} />
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <label style={labelStyle}>Fondo del botón<input type="color" value={activeBlock.ctaBgColor || content.accentColor || brand?.colors.accent || '#2979b8'} onChange={e => updateBlock(activeBlock.id, { ctaBgColor: e.target.value })} style={{ display: 'block', width: '100%', height: 34, marginTop: 5 }} /></label>
              <label style={labelStyle}>Texto del botón<input type="color" value={activeBlock.ctaTextColor || '#ffffff'} onChange={e => updateBlock(activeBlock.id, { ctaTextColor: e.target.value })} style={{ display: 'block', width: '100%', height: 34, marginTop: 5 }} /></label>
            </div>
            {styleSlider('Radio del botón', activeBlock.ctaRadius ?? 8, 0, 28, 'px', v => updateBlock(activeBlock.id, { ctaRadius: v }))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={activeBlock.ctaFullWidth || false} onChange={e => updateBlock(activeBlock.id, { ctaFullWidth: e.target.checked })} />
              Botón a ancho completo
            </label>
            {fieldGroup('Tamaño',
              <select className="form-select" value={activeBlock.ctaSize || 'md'} onChange={e => updateBlock(activeBlock.id, { ctaSize: e.target.value as 'sm' | 'md' | 'lg' })}>
                <option value="sm">Pequeño</option>
                <option value="md">Mediano</option>
                <option value="lg">Grande</option>
              </select>
            )}
          </div>
        );

      case 'band':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Texto (opcional)', <input className="form-input" value={activeBlock.text || ''} onChange={e => updateBlock(activeBlock.id, { text: e.target.value })} placeholder="ENVÍO GRATIS HOY" />)}
            {fieldGroup('Emoji (opcional)', <input className="form-input" value={activeBlock.emoji || ''} onChange={e => updateBlock(activeBlock.id, { emoji: e.target.value })} placeholder="🎁" />)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <label style={labelStyle}>Color de fondo<input type="color" value={activeBlock.bgColor || '#29abe2'} onChange={e => updateBlock(activeBlock.id, { bgColor: e.target.value })} style={{ display: 'block', width: '100%', height: 34, marginTop: 5 }} /></label>
              <label style={labelStyle}>Color de texto<input type="color" value={activeBlock.textColor || '#ffffff'} onChange={e => updateBlock(activeBlock.id, { textColor: e.target.value })} style={{ display: 'block', width: '100%', height: 34, marginTop: 5 }} /></label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={activeBlock.useGradient || false} onChange={e => updateBlock(activeBlock.id, { useGradient: e.target.checked })} />
              Usar gradiente
            </label>
            {activeBlock.useGradient && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <label style={labelStyle}>Inicio<input type="color" value={activeBlock.gradientStart || '#29abe2'} onChange={e => updateBlock(activeBlock.id, { gradientStart: e.target.value })} style={{ display: 'block', width: '100%', height: 34, marginTop: 5 }} /></label>
                <label style={labelStyle}>Fin<input type="color" value={activeBlock.gradientEnd || '#1b6fc4'} onChange={e => updateBlock(activeBlock.id, { gradientEnd: e.target.value })} style={{ display: 'block', width: '100%', height: 34, marginTop: 5 }} /></label>
              </div>
            )}
            {styleSlider('Altura sin texto', activeBlock.height ?? 20, 4, 80, 'px', v => updateBlock(activeBlock.id, { height: v }))}
          </div>
        );

      case 'badge':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Texto', <input className="form-input" value={activeBlock.text} onChange={e => updateBlock(activeBlock.id, { text: e.target.value })} placeholder="OFERTA" />)}
            {fieldGroup('Emoji (opcional)', <input className="form-input" value={activeBlock.emoji || ''} onChange={e => updateBlock(activeBlock.id, { emoji: e.target.value })} placeholder="🔥" />)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <label style={labelStyle}>Color de fondo<input type="color" value={activeBlock.bgColor || content.accentColor || brand?.colors.accent || '#2979b8'} onChange={e => updateBlock(activeBlock.id, { bgColor: e.target.value })} style={{ display: 'block', width: '100%', height: 34, marginTop: 5 }} /></label>
              <label style={labelStyle}>Color de texto<input type="color" value={activeBlock.textColor || '#ffffff'} onChange={e => updateBlock(activeBlock.id, { textColor: e.target.value })} style={{ display: 'block', width: '100%', height: 34, marginTop: 5 }} /></label>
            </div>
            {fieldGroup('Alineación',
              <select className="form-select" value={activeBlock.align || 'center'} onChange={e => updateBlock(activeBlock.id, { align: e.target.value as 'left' | 'center' | 'right' })}>
                <option value="left">Izquierda</option>
                <option value="center">Centro</option>
                <option value="right">Derecha</option>
              </select>
            )}
          </div>
        );

      case 'callout': {
        const defaultAccent = content.accentColor || brand?.colors.accent || '#2979b8';
        const selectedAccent = activeBlock.accentColor || defaultAccent;
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Emoji (opcional)', <input className="form-input" value={activeBlock.emoji || ''} onChange={e => updateBlock(activeBlock.id, { emoji: e.target.value })} placeholder="💡" />)}
            {fieldGroup('Título', <input className="form-input" value={activeBlock.title || ''} onChange={e => updateBlock(activeBlock.id, { title: e.target.value })} placeholder="Consejo importante" />)}
            {fieldGroup('Contenido', <textarea className="form-input" style={{ minHeight: 70, resize: 'vertical' }} value={activeBlock.body || ''} onChange={e => updateBlock(activeBlock.id, { body: e.target.value })} placeholder="Texto del aviso, tip o garantía..." />)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <label style={labelStyle}>Color de fondo<input type="color" value={activeBlock.bgColor || lightenHexColor(selectedAccent, 85)} onChange={e => updateBlock(activeBlock.id, { bgColor: e.target.value })} style={{ display: 'block', width: '100%', height: 34, marginTop: 5 }} /></label>
              <label style={labelStyle}>Color de acento<input type="color" value={selectedAccent} onChange={e => updateBlock(activeBlock.id, { accentColor: e.target.value })} style={{ display: 'block', width: '100%', height: 34, marginTop: 5 }} /></label>
            </div>
          </div>
        );
      }

      case 'divider':
        return (
          <div style={{ padding: '8px 0' }}>
            {fieldGroup('Color de la línea', <input type="color" value={activeBlock.color || '#e5eaf0'} onChange={e => updateBlock(activeBlock.id, { color: e.target.value })} style={{ display: 'block', width: '100%', height: 34 }} />)}
            {styleSlider('Grosor', activeBlock.thickness ?? 1, 1, 8, 'px', v => updateBlock(activeBlock.id, { thickness: v }))}
            {fieldGroup('Estilo',
              <select className="form-select" value={activeBlock.lineStyle || 'solid'} onChange={e => updateBlock(activeBlock.id, { lineStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })}>
                <option value="solid">Sólido</option>
                <option value="dashed">Trazos</option>
                <option value="dotted">Puntos</option>
              </select>
            )}
            {fieldGroup('Ornamento (opcional)', <input className="form-input" value={activeBlock.ornament || ''} onChange={e => updateBlock(activeBlock.id, { ornament: e.target.value })} placeholder="✦  ●  ✂" />)}
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

  const renderStyleEditor = () => {
    if (!activeBlock) return null;
    const style = activeBlock.style || {};
    const text = style.text || {};
    const heading = style.heading || {};
    const updateStyle = (patch: NonNullable<BlockConfig['style']>) => updateBlock(activeBlock.id, { style: { ...style, ...patch } });
    const updateText = (patch: NonNullable<NonNullable<BlockConfig['style']>['text']>) => updateStyle({ text: { ...text, ...patch } });
    const updateHeading = (patch: NonNullable<NonNullable<BlockConfig['style']>['heading']>) => updateStyle({ heading: { ...heading, ...patch } });

    return (
      <section className="inspector-style-section" aria-label="Estilo del bloque">
        <div className="inspector-section-title">Estilo del bloque</div>
        <div className="inspector-control-grid">
          <label className="inspector-control">Fondo<input type="color" value={style.backgroundColor || content.bodyBgColor || '#ffffff'} onChange={event => updateStyle({ backgroundColor: event.target.value })} /></label>
          <label className="inspector-control">Texto<input type="color" value={text.color || content.typography?.bodyColor || '#425466'} onChange={event => updateText({ color: event.target.value })} /></label>
          <label className="inspector-control">Título<input type="color" value={heading.color || content.typography?.headingColor || '#10263a'} onChange={event => updateHeading({ color: event.target.value })} /></label>
        </div>
        <label className="inspector-field">Tipografía
          <select className="form-select" value={text.fontFamily || content.typography?.bodyFont || 'Verdana'} onChange={event => updateText({ fontFamily: event.target.value })}>
            {EMAIL_SAFE_FONTS.map(font => <option key={font} value={font}>{font}</option>)}
          </select>
        </label>
        <label className="inspector-field">Tipografía de títulos
          <select className="form-select" value={heading.fontFamily || content.typography?.headingFont || 'Arial'} onChange={event => updateHeading({ fontFamily: event.target.value })}>
            {EMAIL_SAFE_FONTS.map(font => <option key={font} value={font}>{font}</option>)}
          </select>
        </label>
        <div className="inspector-control-grid two">
          <label className="inspector-field">Tamaño<input className="form-input" type="number" min={10} max={48} value={text.fontSize || 16} onChange={event => updateText({ fontSize: Number(event.target.value) })} /></label>
          <label className="inspector-field">Tamaño título<input className="form-input" type="number" min={16} max={48} value={heading.fontSize || 26} onChange={event => updateHeading({ fontSize: Number(event.target.value) })} /></label>
          <label className="inspector-field">Peso<select className="form-select" value={text.fontWeight || 400} onChange={event => updateText({ fontWeight: Number(event.target.value) as 400 | 500 | 600 | 700 | 800 })}>{[400, 500, 600, 700, 800].map(weight => <option key={weight}>{weight}</option>)}</select></label>
          <label className="inspector-field">Alineación<select className="form-select" value={text.textAlign || 'left'} onChange={event => updateText({ textAlign: event.target.value as 'left' | 'center' | 'right' })}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></label>
          <label className="inspector-field">Interlineado<input className="form-input" type="number" min={1} max={2} step={0.1} value={text.lineHeight || 1.6} onChange={event => updateText({ lineHeight: Number(event.target.value) })} /></label>
        </div>
        <div className="inspector-section-title compact">Espaciado</div>
        <div className="inspector-control-grid four">
          {(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const).map((key, index) => (
            <label className="inspector-field" key={key}>{['Arriba', 'Der.', 'Abajo', 'Izq.'][index]}<input className="form-input" type="number" min={0} max={80} value={style[key] ?? 8} onChange={event => updateStyle({ [key]: Number(event.target.value) })} /></label>
          ))}
        </div>
      </section>
    );
  };

  // ============ Catalog info for labels ============

  const blockLabel = (type: CanvasBlockType) => {
    const item = CANVAS_BLOCK_CATALOG.find(c => c.type === type);
    return item ? item.label : type;
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
          onClick={() => { setCanvasTab('adsets'); refreshAdsets(); }}
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
                onClick={() => selectBlock(block.id === activeBlockId ? null : block.id)}
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
                    {renderStyleEditor()}
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
                  <span className="palette-icon"><BlockIcon type={item.type} size={20} /></span>
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
          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn-primary group w-full"
              onClick={() => onOpenDesignHub?.('banners')}
              style={{ padding: '8px 12px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Palette size={14} /> ✨ Crear Banner / Adset
            </button>
          </div>

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
