'use client';

import { useState, useEffect, useRef } from 'react';
import { Brand, BRAND_CATEGORIES } from '@/lib/types';
import { createBrand, updateBrand } from '@/lib/brands';
import { uploadAsset } from '@/lib/assets';
import AssetPicker from '@/components/AssetPicker';

interface BrandModalProps {
  brand: Brand | null;
  onClose: () => void;
  onSaved: () => void;
}

function generateBrandId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

export default function BrandModal({ brand, onClose, onSaved }: BrandModalProps) {
  const isEditing = brand !== null;
  // Para marcas nuevas: id generado al abrir el modal, así el logo puede subirse
  // a data/assets/<id>/ antes de guardar la marca (createBrand respeta el id)
  const [brandId] = useState(() => brand?.id || generateBrandId());
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    category: 'General',
    colorPrimary: '#0B2A4A',
    colorAccent: '#29ABE2',
    colorGradientStart: '#29ABE2',
    colorGradientEnd: '#1B6FC4',
    fontHeading: 'Montserrat',
    fontBody: 'Verdana',
    logoType: 'text' as 'text' | 'image',
    logoValue: '',
    logoImageWidth: 180,
    logoShowName: false,
    logoNamePosition: 'right' as 'right' | 'below',
    footerTagline: '',
    footerSubtitle: '',
    footerDisclaimer: '',
    voiceTone: '',
    voiceAudience: '',
    voiceStyleNotes: '',
  });
  const [samplePhrases, setSamplePhrases] = useState<string[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);

  useEffect(() => {
    if (brand) {
      setForm({
        name: brand.name,
        category: brand.category,
        colorPrimary: brand.colors.primary,
        colorAccent: brand.colors.accent,
        colorGradientStart: brand.colors.gradientStart,
        colorGradientEnd: brand.colors.gradientEnd,
        fontHeading: brand.fonts.heading,
        fontBody: brand.fonts.body,
        logoType: brand.logo.type,
        logoValue: brand.logo.value,
        logoImageWidth: brand.logo.imageWidth || 180,
        logoShowName: brand.logo.showName || false,
        logoNamePosition: brand.logo.namePosition || 'right',
        footerTagline: brand.footer.tagline,
        footerSubtitle: brand.footer.subtitle,
        footerDisclaimer: brand.footer.disclaimer,
        voiceTone: brand.voice?.toneOfVoice || '',
        voiceAudience: brand.voice?.audience || '',
        voiceStyleNotes: brand.voice?.styleNotes || '',
      });
      setSamplePhrases(brand.voice?.samplePhrases || []);
      setVoiceOpen(Boolean(brand.voice?.toneOfVoice || brand.voice?.audience || brand.voice?.styleNotes || brand.voice?.samplePhrases?.length));
    }
  }, [brand]);

  const handleSave = async () => {
    if (!form.name.trim()) return;

    const data: Partial<Brand> = {
      name: form.name.trim(),
      category: form.category,
      colors: {
        primary: form.colorPrimary,
        accent: form.colorAccent,
        gradientStart: form.colorGradientStart,
        gradientEnd: form.colorGradientEnd,
      },
      fonts: {
        heading: form.fontHeading,
        body: form.fontBody,
      },
      logo: {
        type: form.logoType,
        value: form.logoValue,
        imageWidth: form.logoImageWidth,
        showName: form.logoShowName,
        namePosition: form.logoNamePosition,
      },
      footer: {
        tagline: form.footerTagline,
        subtitle: form.footerSubtitle,
        disclaimer: form.footerDisclaimer,
      },
      voice: {
        toneOfVoice: form.voiceTone.trim(),
        audience: form.voiceAudience.trim(),
        styleNotes: form.voiceStyleNotes.trim(),
        samplePhrases: samplePhrases.map(p => p.trim()).filter(Boolean),
      },
    };

    try {
      if (isEditing) {
        await updateBrand(brand.id, data);
      } else {
        // Usa el id pre-generado: los assets de logo ya viven en data/assets/<id>/
        await createBrand({ ...data, id: brandId });
      }
      onSaved();
    } catch (err) {
      console.error('Error saving brand', err);
      alert('Error al guardar la marca. Revisa que el servidor esté corriendo.');
    }
  };

  const updateField = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Logo preview
  const logoPreview = () => {
    if (form.logoType === 'image' && form.logoValue) {
      return (
        <div style={{
          padding: '16px', background: form.colorPrimary, borderRadius: 'var(--radius-md)', textAlign: 'center',
          display: 'flex', flexDirection: form.logoShowName && form.logoNamePosition === 'below' ? 'column' : 'row',
          alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={form.logoValue} alt="Logo preview" style={{ maxWidth: form.logoImageWidth, height: 'auto' }} />
          {form.logoShowName && form.name && (
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>{form.name}</span>
          )}
        </div>
      );
    }
    if (form.logoType === 'text' && form.logoValue) {
      const parts = form.logoValue.split('|');
      return (
        <div style={{ padding: '16px', background: form.colorPrimary, borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: 22, fontWeight: 700 }}>
          <span style={{ color: '#fff' }}>{parts[0]}</span>
          {parts[1] && <span style={{ color: form.colorAccent }}> {parts[1]}</span>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-shell" onClick={e => e.stopPropagation()} style={{ width: 620, animation: 'slideUp 0.4s ease-out' }}>
        <div className="glass-core" style={{ padding: 0 }}>
          
          <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{isEditing ? '✏️ Editar marca' : '➕ Nueva marca'}</h2>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar modal" style={{ width: 30, height: 30 }}>✕</button>
          </div>

          <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '24px' }}>
            {/* Name & Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="brand-name-input" className="form-label">Nombre de la marca *</label>
                <input
                  id="brand-name-input"
                  className="form-input"
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="Ej: AMO Managements…"
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="brand-category-select" className="form-label">Categoría</label>
                <select 
                  id="brand-category-select"
                  className="form-select" 
                  value={form.category} 
                  onChange={e => updateField('category', e.target.value)}
                >
                  {BRAND_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Colors */}
            <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Colores de la Marca
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { key: 'colorPrimary', label: 'Primario', id: 'col-primary' },
                { key: 'colorAccent', label: 'Acento', id: 'col-accent' },
                { key: 'colorGradientStart', label: 'Gradiente Inicio', id: 'col-grad-start' },
                { key: 'colorGradientEnd', label: 'Gradiente Fin', id: 'col-grad-end' },
              ].map(({ key, label, id }) => (
                <div key={key} style={{ textAlign: 'center' }}>
                  <input
                    id={id}
                    type="color"
                    className="form-color-input"
                    value={form[key as keyof typeof form] as string}
                    onChange={e => updateField(key, e.target.value)}
                    style={{ width: '100%', height: 44, borderRadius: 'var(--radius-sm)' }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 6 }}>{label}</div>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {(form[key as keyof typeof form] as string).toUpperCase()}
                  </div>
                </div>
              ))}
            </div>

            {/* Color Preview Bar */}
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 24, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)' }}>
              <div style={{ flex: 1, background: form.colorPrimary }} />
              <div style={{ flex: 1, background: form.colorAccent }} />
              <div style={{ flex: 1, background: `linear-gradient(90deg, ${form.colorGradientStart}, ${form.colorGradientEnd})` }} />
            </div>

            {/* Logo */}
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Tipo de Logo</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${form.logoType === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => updateField('logoType', 'text')}
                >
                  🔤 Texto
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${form.logoType === 'image' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => updateField('logoType', 'image')}
                >
                  🖼️ Imagen
                </button>
              </div>

              {form.logoType === 'text' ? (
                <div>
                  <input
                    aria-label="Texto del logo"
                    className="form-input"
                    value={form.logoValue}
                    onChange={e => updateField('logoValue', e.target.value)}
                    placeholder="PARTE1|PARTE2 (usa | para separar colores)…"
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
                    Usa el carácter <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>|</code> para separar el texto: la primera parte se mostrará blanca y la segunda del color acento.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12 }}>
                    <input
                      aria-label="URL del logo"
                      className="form-input"
                      value={form.logoValue}
                      onChange={e => updateField('logoValue', e.target.value)}
                      placeholder="URL o imagen subida del logo…"
                      spellCheck={false}
                    />
                    <input
                      type="number"
                      aria-label="Ancho en píxeles"
                      className="form-input"
                      value={form.logoImageWidth}
                      onChange={e => updateField('logoImageWidth', parseInt(e.target.value) || 180)}
                      placeholder="Ancho px"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => logoFileRef.current?.click()}
                      disabled={uploadingLogo}
                      style={{ fontSize: 11 }}
                    >
                      {uploadingLogo ? '⏳ Subiendo…' : '📤 Subir logo'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setLogoPickerOpen(true)}
                      style={{ fontSize: 11 }}
                    >
                      🖼️ Elegir de la biblioteca
                    </button>
                    <input
                      ref={logoFileRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.gif,.webp"
                      hidden
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        setUploadingLogo(true);
                        try {
                          const asset = await uploadAsset(file, brandId);
                          updateField('logoValue', asset.url);
                        } catch (err) {
                          console.error('Error uploading logo', err);
                          alert('Error al subir el logo');
                        } finally {
                          setUploadingLogo(false);
                        }
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.logoShowName}
                        onChange={e => setForm(prev => ({ ...prev, logoShowName: e.target.checked }))}
                      />
                      Mostrar nombre del negocio junto al logo
                    </label>
                    {form.logoShowName && (
                      <select
                        aria-label="Posición del nombre"
                        className="form-select"
                        value={form.logoNamePosition}
                        onChange={e => setForm(prev => ({ ...prev, logoNamePosition: e.target.value as 'right' | 'below' }))}
                        style={{ width: 140, fontSize: 12, padding: '6px 10px' }}
                      >
                        <option value="right">A la derecha</option>
                        <option value="below">Debajo</option>
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logo Preview */}
            {logoPreview() && (
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Vista Previa del Logo</label>
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  {logoPreview()}
                </div>
              </div>
            )}

            {/* Fonts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="font-heading-select" className="form-label">Fuente Títulos</label>
                <select 
                  id="font-heading-select"
                  className="form-select" 
                  value={form.fontHeading} 
                  onChange={e => updateField('fontHeading', e.target.value)}
                >
                  {['Montserrat', 'Open Sans', 'Roboto', 'Poppins', 'Lato', 'Oswald', 'Playfair Display', 'Raleway'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="font-body-select" className="form-label">Fuente Cuerpo</label>
                <select 
                  id="font-body-select"
                  className="form-select" 
                  value={form.fontBody} 
                  onChange={e => updateField('fontBody', e.target.value)}
                >
                  {['Verdana', 'Arial', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Helvetica'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Voz y estilo (IA) — alimenta los prompts de generación */}
            <div style={{ marginBottom: 24, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setVoiceOpen(prev => !prev)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', background: 'rgba(99, 102, 241, 0.05)', border: 'none',
                  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
                  textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                <span>🎙️ Voz y Estilo (IA)</span>
                <span style={{ fontSize: 11 }}>{voiceOpen ? '▲' : '▼'}</span>
              </button>
              {voiceOpen && (
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    La IA usa este perfil (junto con los emails que califiques con 👍) para escribir cada vez más al estilo de la marca.
                  </p>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="voice-tone-input" className="form-label">Tono de voz</label>
                    <textarea
                      id="voice-tone-input"
                      className="form-textarea"
                      value={form.voiceTone}
                      onChange={e => updateField('voiceTone', e.target.value)}
                      placeholder="Ej: Cercano y motivador, habla de tú, transmite urgencia sin sonar agresivo…"
                      rows={2}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="voice-audience-input" className="form-label">Audiencia</label>
                    <input
                      id="voice-audience-input"
                      className="form-input"
                      value={form.voiceAudience}
                      onChange={e => updateField('voiceAudience', e.target.value)}
                      placeholder="Ej: Hispanos en USA, 30-55 años, que quieren mejorar su crédito…"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="voice-style-input" className="form-label">Notas de estilo</label>
                    <textarea
                      id="voice-style-input"
                      className="form-textarea"
                      value={form.voiceStyleNotes}
                      onChange={e => updateField('voiceStyleNotes', e.target.value)}
                      placeholder="Ej: Nunca prometer resultados garantizados. Usar preguntas retóricas. Evitar tecnicismos…"
                      rows={2}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Frases típicas de la marca</label>
                    {samplePhrases.map((phrase, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <input
                          className="form-input"
                          value={phrase}
                          onChange={e => setSamplePhrases(prev => prev.map((p, j) => (j === i ? e.target.value : p)))}
                          placeholder={`Frase ${i + 1}…`}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon"
                          onClick={() => setSamplePhrases(prev => prev.filter((_, j) => j !== i))}
                          aria-label={`Eliminar frase ${i + 1}`}
                          style={{ fontSize: 13, height: 40 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSamplePhrases(prev => [...prev, ''])}
                      style={{ fontSize: 12 }}
                    >
                      + Agregar frase
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Pie de Página (Footer)
            </div>
            <div className="form-group">
              <label htmlFor="footer-tagline-input" className="form-label">Eslogan / Tagline</label>
              <input
                id="footer-tagline-input"
                className="form-input"
                value={form.footerTagline}
                onChange={e => updateField('footerTagline', e.target.value)}
                placeholder="Ej: Mandy, la Chica del Crédito…"
              />
            </div>
            <div className="form-group">
              <label htmlFor="footer-subtitle-input" className="form-label">Subtítulo</label>
              <input
                id="footer-subtitle-input"
                className="form-input"
                value={form.footerSubtitle}
                onChange={e => updateField('footerSubtitle', e.target.value)}
                placeholder="Ej: Restauración de crédito y finanzas…"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="footer-disclaimer-input" className="form-label">Disclaimer Legal</label>
              <textarea
                id="footer-disclaimer-input"
                className="form-textarea"
                value={form.footerDisclaimer}
                onChange={e => updateField('footerDisclaimer', e.target.value)}
                placeholder="Declaración legal o disclaimer del pie de página…"
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(10, 14, 23, 0.2)' }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ marginRight: 8 }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>
              {isEditing ? '💾 Guardar cambios' : '➕ Crear marca'}
            </button>
          </div>
          </div>
      </div>

      {logoPickerOpen && (
        <AssetPicker
          brandId={brandId}
          title="Elegir logo"
          onClose={() => setLogoPickerOpen(false)}
          onSelect={asset => {
            updateField('logoValue', asset.url);
            setLogoPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
