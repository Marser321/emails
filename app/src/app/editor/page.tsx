'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AssetPicker from '@/components/AssetPicker';
import CanvasEditor from '@/components/CanvasEditor';
import ExportModal from '@/components/ExportModal';
import { getAllBrands } from '@/lib/brands';
import { collectLocalAssetUrls } from '@/lib/export';
import { renderEmail } from '@/lib/templates';
import { AIEngine, Brand, Draft, EmailContent, LayoutVariant, TemplateType, TEMPLATES } from '@/lib/types';

const LAYOUT_OPTIONS: { id: LayoutVariant; name: string; icon: string; description: string }[] = [
  { id: 'classic', name: 'Clásico', icon: '📄', description: 'Header con gradiente, el layout original' },
  { id: 'minimal', name: 'Minimal', icon: '⬜', description: 'Plano, sin gradientes ni sombras' },
  { id: 'hero', name: 'Hero', icon: '🖼️', description: 'Imagen full-width arriba de todo' },
  { id: 'card', name: 'Cards', icon: '🗂️', description: 'Contenido en tarjeta sobre fondo gris' },
];

interface PublicSettings {
  hasGeminiKey: boolean;
  hasAnthropicKey: boolean;
  geminiKeyMasked: string;
  anthropicKeyMasked: string;
  defaultEngine: AIEngine;
  assetsPublicBaseUrl: string;
}

const ENGINE_LABELS: Record<AIEngine, string> = {
  gemini: '⚡ Gemini',
  claude: '🧠 Claude',
};

const DEFAULT_CONTENT: EmailContent = {
  label: '',
  headline: '',
  body: '',
  bulletsTitle: '',
  bullets: ['', '', ''],
  ctaText: '',
  ctaUrl: '',
  eventDate: '',
  eventTime: '',
  preCta: '',
  footerNote: '',
  emailBgColor: '#eef2f6',
  bodyBgColor: '#ffffff',
  textureUrl: '',
  headerTextureUrl: '',
  layout: 'classic',
};

// Preset textures
const TEXTURE_PRESETS = [
  { name: 'Ninguna', url: '' },
  { name: 'Líneas Diagonales', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop' },
  { name: 'Papel Sutil', url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=200&auto=format&fit=crop' },
  { name: 'Fibra de Carbono', url: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?q=80&w=200&auto=format&fit=crop' },
  { name: 'Gradiente Suave', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=200&auto=format&fit=crop' },
];

function EditorContent() {
  const searchParams = useSearchParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('masterclass');
  const [content, setContent] = useState<EmailContent>({ ...DEFAULT_CONTENT });
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [htmlOutput, setHtmlOutput] = useState('');

  // AI states
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [aiPromptModalOpen, setAiPromptModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [anthropicKeyInput, setAnthropicKeyInput] = useState('');
  const [selectedEngine, setSelectedEngine] = useState<AIEngine>('gemini');
  const [savingSettings, setSavingSettings] = useState(false);
  // Última generación: para rating 👍/👎 y snapshot del HTML usado
  const [lastHistory, setLastHistory] = useState<{ id: string; brandId: string; rating: 'up' | 'down' | null } | null>(null);

  // Bloques & Layout: destino del AssetPicker ('hero' | 'imageText' | 'gallery-<i>')
  const [assetPickerTarget, setAssetPickerTarget] = useState<string | null>(null);
  // Export con imágenes locales: modo pendiente (copy | download)
  const [exportMode, setExportMode] = useState<'copy' | 'download' | null>(null);

  // New States for Usability improvements
  const [history, setHistory] = useState<EmailContent[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [refineField, setRefineField] = useState<string | null>(null);

  // Advanced features states
  const [activeTab, setActiveTab] = useState<'editor' | 'canvas' | 'drafts'>('editor');
  const [savedDrafts, setSavedDrafts] = useState<Draft[]>([]);
  const [newDraftName, setNewDraftName] = useState('');
  const [abVariations, setAbVariations] = useState<{ subjects?: { type: string; text: string }[]; preheaders?: string[] } | null>(null);
  const [generatingAb, setGeneratingAb] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testMessageUrl, setTestMessageUrl] = useState<string | null>(null);
  const [simulatedDarkMode, setSimulatedDarkMode] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(600);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    brand: true,
    blocks: true,
    styles: false,
    content: true,
    health: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    setMounted(true);

    getAllBrands()
      .then(allBrands => {
        setBrands(allBrands);
        if (allBrands.length > 0) {
          setSelectedBrandId(prev => prev || allBrands[0].id);
        }
      })
      .catch(e => console.error('Error loading brands', e));

    // Load AI settings (keys enmascaradas + motor por defecto)
    fetch('/api/settings')
      .then(res => (res.ok ? res.json() : null))
      .then((s: PublicSettings | null) => {
        if (s) {
          setSettings(s);
          setSelectedEngine(s.defaultEngine);
        }
      })
      .catch(e => console.error('Error loading settings', e));

    // Load drafts from disk
    fetch('/api/drafts')
      .then(res => (res.ok ? res.json() : []))
      .then(setSavedDrafts)
      .catch(e => console.error('Error loading drafts', e));
  }, []);

  // Save history checkpoint
  const saveHistory = useCallback((newContent: EmailContent) => {
    setHistory(prev => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      if (nextHistory.length > 0 && JSON.stringify(nextHistory[nextHistory.length - 1]) === JSON.stringify(newContent)) {
        return prev;
      }
      const updated = [...nextHistory, JSON.parse(JSON.stringify(newContent))];
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  }, [historyIndex]);

  // Seed history on mount or template reset
  useEffect(() => {
    if (mounted && content.label !== '' && history.length === 0) {
      setHistory([JSON.parse(JSON.stringify(content))]);
      setHistoryIndex(0);
    }
  }, [mounted, content, history.length]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setContent({ ...history[prevIndex] });
      showToast('↩️ Deshacer completado');
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setContent({ ...history[nextIndex] });
      showToast('↪️ Rehacer completado');
    }
  }, [history, historyIndex]);

  // Keybindings for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform?.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Click-to-edit listener from Iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'focus-field') {
        const fieldName = event.data.field;
        let elementId = `content-${fieldName}`;
        
        if (fieldName.startsWith('bullet-')) {
          const index = parseInt(fieldName.split('-')[1]);
          const bulletInputs = document.querySelectorAll('.bullet-item input');
          if (bulletInputs[index]) {
            const inputEl = bulletInputs[index] as HTMLInputElement;
            inputEl.focus();
            inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputEl.style.outline = '2px dashed var(--accent)';
            setTimeout(() => { inputEl.style.outline = ''; }, 1500);
            return;
          }
        }
        
        // Bloques nuevos: hero / imageText / quote / gallery-N
        if (fieldName === 'hero') {
          elementId = 'content-hero';
        } else if (fieldName === 'imageText') {
          elementId = 'content-imageText';
        } else if (fieldName === 'quote') {
          elementId = 'content-quote';
        } else if (fieldName.startsWith('gallery-')) {
          elementId = 'content-hero'; // no hay input por imagen: enfoca la sección de bloques
          const galleryInputs = document.querySelectorAll('[placeholder^="Imagen "]');
          const index = parseInt(fieldName.split('-')[1], 10);
          if (galleryInputs[index]) {
            const inputEl = galleryInputs[index] as HTMLInputElement;
            inputEl.focus();
            inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputEl.style.outline = '2px dashed var(--accent)';
            setTimeout(() => { inputEl.style.outline = ''; }, 1500);
            return;
          }
        }

        // Custom fallbacks
        if (fieldName === 'bulletsTitle') {
          elementId = 'bullets-title';
        } else if (fieldName === 'eventDate') {
          elementId = 'event-date';
        } else if (fieldName === 'eventTime') {
          elementId = 'event-time';
        } else if (fieldName === 'preCta') {
          elementId = 'pre-cta';
        } else if (fieldName === 'footerNote') {
          elementId = 'footer-note';
        } else if (fieldName === 'ctaText') {
          elementId = 'cta-text';
        } else if (fieldName === 'secondaryCtaText') {
          elementId = 'secondary-cta-text';
        }
        
        const element = document.getElementById(elementId) as HTMLElement | null;
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.outline = '2px dashed var(--accent)';
          setTimeout(() => { element.style.outline = ''; }, 1500);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle share parameters
  useEffect(() => {
    if (!mounted) return;
    const shareData = searchParams.get('share');
    if (shareData) {
      try {
        const decodedStr = decodeURIComponent(atob(shareData).split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(decodedStr);
        if (decoded.brandId) setSelectedBrandId(decoded.brandId);
        if (decoded.template) setSelectedTemplate(decoded.template);
        if (decoded.content) {
          setContent(decoded.content);
          setHistory([JSON.parse(JSON.stringify(decoded.content))]);
          setHistoryIndex(0);
        }
        showToast('🔗 Borrador compartido cargado con éxito');
      } catch (e) {
        console.error('Error decoding share URL', e);
        showToast('❌ Error al decodificar el borrador compartido', 'error');
      }
    }
  }, [searchParams, mounted]);

  // Handle URL template param
  useEffect(() => {
    const template = searchParams.get('template') as TemplateType;
    if (template && TEMPLATES.find(t => t.type === template)) {
      setSelectedTemplate(template);
    }
  }, [searchParams]);

  // Reabrir / duplicar desde el historial (?emailId=&brandId=[&duplicate=1])
  useEffect(() => {
    if (!mounted) return;
    const emailId = searchParams.get('emailId');
    const brandId = searchParams.get('brandId');
    if (!emailId || !brandId) return;
    const isDuplicate = searchParams.get('duplicate') === '1';

    fetch(`/api/history/${emailId}?brandId=${encodeURIComponent(brandId)}`)
      .then(res => {
        if (!res.ok) throw new Error('Registro no encontrado');
        return res.json();
      })
      .then(entry => {
        setSelectedBrandId(entry.brandId);
        if (entry.templateType && TEMPLATES.find(t => t.type === entry.templateType)) {
          setSelectedTemplate(entry.templateType);
        }
        const loaded: EmailContent = { ...DEFAULT_CONTENT, ...entry.content };
        setContent(loaded);
        setHistory([JSON.parse(JSON.stringify(loaded))]);
        setHistoryIndex(0);
        if (isDuplicate) {
          setLastHistory(null);
          showToast('📄 Duplicado — al generar o copiar se guardará como email nuevo');
        } else {
          setLastHistory({ id: entry.id, brandId: entry.brandId, rating: entry.rating });
          showToast('📥 Email cargado desde el historial');
        }
      })
      .catch(() => showToast('❌ No se pudo cargar el email del historial', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, mounted]);

  // Apply template defaults when template changes
  useEffect(() => {
    const tmpl = TEMPLATES.find(t => t.type === selectedTemplate);
    if (tmpl?.defaultContent) {
      setContent(prev => {
        const next = {
          ...prev,
          label: tmpl.defaultContent.label || prev.label,
          bulletsTitle: tmpl.defaultContent.bulletsTitle || prev.bulletsTitle,
          ctaText: tmpl.defaultContent.ctaText || prev.ctaText,
          preCta: tmpl.defaultContent.preCta || prev.preCta,
          footerNote: tmpl.defaultContent.footerNote || prev.footerNote,
        };
        // Avoid overwriting on mount if history exists
        return next;
      });
    }
  }, [selectedTemplate]);

  // Generate HTML
  const generateHtml = useCallback(() => {
    const brand = brands.find(b => b.id === selectedBrandId);
    if (!brand) return '';
    return renderEmail(brand, content);
  }, [brands, selectedBrandId, content]);

  // Update preview
  useEffect(() => {
    if (!mounted) return;
    const html = generateHtml();
    setHtmlOutput(html);

    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        // Inject click listener into iframe
        let interactiveHtml = html + `
          <script>
            document.addEventListener('click', function(e) {
              let target = e.target;
              while (target && target !== document.body) {
                const field = target.getAttribute('data-editor-field');
                if (field) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.parent.postMessage({ type: 'focus-field', field: field }, '*');
                  break;
                }
                target = target.parentElement;
              }
            });
            // Highlight hover style
            const style = document.createElement('style');
            style.textContent = \`
              [data-editor-field] {
                cursor: pointer !important;
                transition: outline 0.2s ease !important;
              }
              [data-editor-field]:hover {
                outline: 2px dashed #6366f1 !important;
                outline-offset: 4px !important;
              }
            \`;
            document.head.appendChild(style);
          </script>
        `;

        if (simulatedDarkMode) {
          interactiveHtml = interactiveHtml.replace('</head>', `
            <style>
              body, table.email-bg {
                background-color: #111827 !important;
                background-image: none !important;
              }
              table.email-container {
                background-color: #1f2937 !important;
                background-image: none !important;
                box-shadow: 0 10px 30px rgba(0,0,0,0.6) !important;
              }
              td, p, h1, span, strong {
                color: #f3f4f6 !important;
              }
              .bullet-text {
                color: #d1d5db !important;
              }
              .bullet-text span {
                color: #818cf8 !important;
              }
              .pre-cta-text, .footer-note-text {
                color: #9ca3af !important;
              }
              .cta-btn, .cta-btn * {
                color: #ffffff !important;
              }
            </style>
            </head>
          `);
        }

        doc.write(interactiveHtml);
        doc.close();
        // Auto-resize iframe
        setTimeout(() => {
          if (iframeRef.current && doc.body) {
            iframeRef.current.style.height = Math.max(400, doc.body.scrollHeight + 20) + 'px';
          }
        }, 100);
      }
    }
  }, [mounted, generateHtml, simulatedDarkMode]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleCopyHtml = async () => {
    // Con imágenes locales: elegir modo de export (URL pública / ZIP / base64)
    if (collectLocalAssetUrls(htmlOutput).length > 0) {
      setExportMode('copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(htmlOutput);
      showToast('📋 HTML copiado al portapapeles');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = htmlOutput;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('📋 HTML copiado');
    }
    // El HTML copiado es "lo realmente usado" — actualiza el snapshot del historial
    syncHistorySnapshot();
  };

  const updateContent = (field: keyof EmailContent, value: string | string[]) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  const updateBullet = (index: number, value: string) => {
    const newBullets = [...content.bullets];
    newBullets[index] = value;
    setContent(prev => ({ ...prev, bullets: newBullets }));
  };

  const addBullet = () => {
    setContent(prev => {
      const next = { ...prev, bullets: [...prev.bullets, ''] };
      saveHistory(next);
      return next;
    });
  };

  const removeBullet = (index: number) => {
    if (content.bullets.length <= 1) return;
    setContent(prev => {
      const next = {
        ...prev,
        bullets: prev.bullets.filter((_, i) => i !== index),
      };
      saveHistory(next);
      return next;
    });
  };

  // ====== Bloques & Layout ======
  const setBlockValue = (patch: Partial<EmailContent>) => {
    setContent(prev => {
      const next = { ...prev, ...patch };
      saveHistory(next);
      return next;
    });
  };

  const handleAssetSelected = (url: string) => {
    if (!assetPickerTarget) return;
    if (assetPickerTarget === 'hero') {
      setBlockValue({ hero: { fullBleed: true, ...content.hero, imageUrl: url } });
    } else if (assetPickerTarget === 'imageText') {
      setBlockValue({ imageText: { text: '', imagePosition: 'left', ...content.imageText, imageUrl: url } });
    } else if (assetPickerTarget.startsWith('gallery-')) {
      const index = parseInt(assetPickerTarget.split('-')[1], 10);
      const images = [...(content.gallery?.images || [])];
      images[index] = { ...images[index], url };
      setBlockValue({ gallery: { columns: 2, ...content.gallery, images } });
    }
    setAssetPickerTarget(null);
  };

  // AI Prompt actions
  const hasKeyForEngine = (engine: AIEngine) =>
    engine === 'claude' ? Boolean(settings?.hasAnthropicKey) : Boolean(settings?.hasGeminiKey);

  const handleOpenAiModal = () => {
    if (!hasKeyForEngine(selectedEngine)) {
      setApiKeyModalOpen(true);
    } else {
      setAiPromptModalOpen(true);
    }
  };

  const handleSaveSettings = async (extra?: { defaultEngine?: AIEngine }) => {
    setSavingSettings(true);
    try {
      const body: Record<string, string> = {};
      if (geminiKeyInput.trim()) body.geminiApiKey = geminiKeyInput.trim();
      if (anthropicKeyInput.trim()) body.anthropicApiKey = anthropicKeyInput.trim();
      if (extra?.defaultEngine) body.defaultEngine = extra.defaultEngine;
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error al guardar la configuración');
      const updated: PublicSettings = await res.json();
      setSettings(updated);
      setGeminiKeyInput('');
      setAnthropicKeyInput('');
      showToast('🔑 Configuración de IA guardada');
    } catch (err) {
      showToast((err instanceof Error ? err.message : null) || 'Error al guardar la configuración', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangeDefaultEngine = async (engine: AIEngine) => {
    setSelectedEngine(engine);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultEngine: engine }),
      });
      if (res.ok) setSettings(await res.json());
    } catch {
      // la selección local sigue funcionando aunque no persista
    }
  };

  // Rating 👍/👎 del último email generado — alimenta el few-shot de la marca
  const handleRateLastEmail = async (rating: 'up' | 'down') => {
    if (!lastHistory) return;
    const next = lastHistory.rating === rating ? null : rating;
    try {
      const res = await fetch(`/api/history/${lastHistory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: lastHistory.brandId, rating: next }),
      });
      if (!res.ok) throw new Error('Error al guardar la valoración');
      setLastHistory({ ...lastHistory, rating: next });
      showToast(next === 'up' ? '👍 ¡Gracias! La IA aprenderá de este email' : next === 'down' ? '👎 Valoración guardada' : 'Valoración quitada');
    } catch (err) {
      showToast((err instanceof Error ? err.message : null) || 'Error al guardar la valoración', 'error');
    }
  };

  // Sincroniza el snapshot HTML final (con ediciones manuales) al historial
  const syncHistorySnapshot = async () => {
    if (!lastHistory) return;
    try {
      await fetch(`/api/history/${lastHistory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: lastHistory.brandId,
          htmlSnapshot: htmlOutput,
          subject: content.headline,
          content,
        }),
      });
    } catch {
      // best-effort: no bloquear el copiado
    }
  };

  const handleGenerateWithAi = async () => {
    if (!aiPrompt.trim()) return;

    setGeneratingCopy(true);
    const selectedBrand = brands.find(b => b.id === selectedBrandId);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          templateType: selectedTemplate,
          brand: selectedBrand,
          brandId: selectedBrandId,
          engine: selectedEngine,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar el copy con IA.');
      }

      const { historyId, engine: usedEngine, ...emailData } = data;

      // Merge generated copy with existing styling details
      setContent(prev => {
        const next = {
          ...prev,
          ...emailData,
          bullets: emailData.bullets || prev.bullets,
        };
        saveHistory(next);
        return next;
      });

      if (historyId) {
        setLastHistory({ id: historyId, brandId: selectedBrandId, rating: null });
      }

      setAiPromptModalOpen(false);
      setAiPrompt('');
      showToast(`🤖 Email generado con ${ENGINE_LABELS[usedEngine as AIEngine] || usedEngine}`);
    } catch (err) {
      showToast((err instanceof Error ? err.message : null) || 'Error al comunicarse con la IA', 'error');
    } finally {
      setGeneratingCopy(false);
    }
  };

  // 1. Aplicar Colores de Marca
  const applyBrandColors = () => {
    const brand = brands.find(b => b.id === selectedBrandId);
    if (!brand) return;

    const lightenHex = (color: string, percent: number) => {
      try {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * percent / 100));
        const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round((255 - ((num >> 8) & 0x00ff)) * percent / 100));
        const b = Math.min(255, (num & 0x0000ff) + Math.round((255 - (num & 0x0000ff)) * percent / 100));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
      } catch {
        return '#eef2f6';
      }
    };

    const newEmailBg = lightenHex(brand.colors.primary, 95);
    const newBodyBg = '#ffffff';

    setContent(prev => {
      const next = {
        ...prev,
        emailBgColor: newEmailBg,
        bodyBgColor: newBodyBg,
      };
      saveHistory(next);
      return next;
    });

    showToast('🎨 Colores de marca aplicados con éxito');
  };

  // 2. Micro-Acciones de IA
  const handleRefineField = async (field: keyof EmailContent, command: string, index?: number) => {
    const currentVal = index !== undefined 
      ? (content.bullets[index] || '')
      : (content[field] as string || '');
      
    if (!currentVal.trim()) {
      showToast('⚠️ Escribe algo en el campo antes de mejorarlo con IA', 'error');
      return;
    }

    setRefineField(index !== undefined ? `bullet-${index}` : field);
    
    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: currentVal,
          field,
          command,
          engine: selectedEngine,
          brandId: selectedBrandId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al refinar el texto.');
      }

      const refinedText = data.result;
      
      if (index !== undefined) {
        const newBullets = [...content.bullets];
        newBullets[index] = refinedText;
        setContent(prev => {
          const next = { ...prev, bullets: newBullets };
          saveHistory(next);
          return next;
        });
      } else {
        setContent(prev => {
          const next = { ...prev, [field]: refinedText };
          saveHistory(next);
          return next;
        });
      }
      
      showToast('🤖 Texto optimizado con éxito');
    } catch (err) {
      showToast((err instanceof Error ? err.message : null) || 'Error al comunicarse con Gemini API', 'error');
    } finally {
      setRefineField(null);
    }
  };

  const exportFileName = () => {
    const brand = brands.find(b => b.id === selectedBrandId);
    return `email-${brand?.name.toLowerCase().replace(/\s+/g, '-') || 'builder'}-${selectedTemplate}.html`;
  };

  // 5. Exportación Avanzada
  const handleDownloadHtml = () => {
    if (collectLocalAssetUrls(htmlOutput).length > 0) {
      setExportMode('download');
      return;
    }
    const blob = new Blob([htmlOutput], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName();
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 Archivo HTML descargado');
    syncHistorySnapshot();
  };

  const handleShareDraft = () => {
    try {
      const state = {
        brandId: selectedBrandId,
        template: selectedTemplate,
        content: content,
      };
      const jsonStr = JSON.stringify(state);
      const b64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }));
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${b64}`;
      
      navigator.clipboard.writeText(shareUrl);
      showToast('🔗 Enlace del borrador copiado al portapapeles');
    } catch {
      showToast('❌ Error al generar enlace de compartición', 'error');
    }
  };

  const handleSendTestEmail = () => {
    try {
      const brand = brands.find(b => b.id === selectedBrandId);
      const state = {
        brandId: selectedBrandId,
        template: selectedTemplate,
        content: content,
      };
      const jsonStr = JSON.stringify(state);
      const b64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }));
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${b64}`;
      
      const subject = encodeURIComponent(`[Borrador] Email - ${content.headline || brand?.name}`);
      const body = encodeURIComponent(
        `Hola,\n\nTe comparto el borrador del correo diseñado para la marca "${brand?.name}".\n\nPuedes abrir e importar este borrador haciendo clic en el siguiente enlace:\n${shareUrl}\n\nAD Media Solution Email Builder`
      );
      
      const mailto = `mailto:?subject=${subject}&body=${body}`;
      window.open(mailto, '_blank');
      showToast('📨 Cliente de correo abierto para enviar prueba');
    } catch {
      showToast('❌ Error al abrir cliente de correo', 'error');
    }
  };

  // Render Inline AI Actions dropdown
  const renderInlineAiActions = (field: keyof EmailContent, index?: number) => {
    const isPending = refineField === (index !== undefined ? `bullet-${index}` : field);
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {isPending ? (
          <span style={{ fontSize: 10, color: 'var(--text-accent)', animation: 'pulse 1s infinite' }}>🤖...</span>
        ) : (
          <div className="dropdown-container" style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px 8px', fontSize: 11, height: 'auto', gap: 4, opacity: 0.7 }}
              onClick={(e) => {
                const el = e.currentTarget.nextElementSibling as HTMLElement;
                if (el) el.style.display = el.style.display === 'block' ? 'none' : 'block';
              }}
              onBlur={(e) => {
                const el = e.currentTarget.nextElementSibling as HTMLElement;
                setTimeout(() => { if (el) el.style.display = 'none'; }, 200);
              }}
            >
              🤖 IA
            </button>
            <div
              className="glass-shell"
              style={{
                display: 'none',
                position: 'absolute',
                right: 0,
                top: '100%',
                zIndex: 50,
                width: 140,
                padding: 4,
                boxShadow: 'var(--shadow-lg)',
                marginTop: 4,
              }}
            >
              <div className="glass-core" style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  type="button"
                  className="sidebar-link"
                  style={{ padding: '6px 8px', fontSize: 11, borderRadius: 'var(--radius-sm)', width: '100%', textAlign: 'left' }}
                  onMouseDown={() => handleRefineField(field, 'optimize', index)}
                >
                  🪄 Optimizar
                </button>
                <button
                  type="button"
                  className="sidebar-link"
                  style={{ padding: '6px 8px', fontSize: 11, borderRadius: 'var(--radius-sm)', width: '100%', textAlign: 'left' }}
                  onMouseDown={() => handleRefineField(field, 'shorten', index)}
                >
                  📝 Acortar
                </button>
                <button
                  type="button"
                  className="sidebar-link"
                  style={{ padding: '6px 8px', fontSize: 11, borderRadius: 'var(--radius-sm)', width: '100%', textAlign: 'left' }}
                  onMouseDown={() => handleRefineField(field, 'casual', index)}
                >
                  💬 Tono Cercano
                </button>
                <button
                  type="button"
                  className="sidebar-link"
                  style={{ padding: '6px 8px', fontSize: 11, borderRadius: 'var(--radius-sm)', width: '100%', textAlign: 'left' }}
                  onMouseDown={() => handleRefineField(field, 'formal', index)}
                >
                  👔 Tono Formal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Save draft to disk (data/drafts.json)
  const handleSaveDraft = async () => {
    if (!newDraftName.trim()) {
      showToast('⚠️ Ingresa un nombre para el borrador', 'error');
      return;
    }
    const brand = brands.find(b => b.id === selectedBrandId);
    const template = TEMPLATES.find(t => t.type === selectedTemplate);
    const newDraft: Draft = {
      id: Date.now().toString(),
      name: newDraftName.trim(),
      brandName: brand?.name || 'Marca Desconocida',
      templateName: template?.name || 'Plantilla Desconocida',
      content: JSON.parse(JSON.stringify(content)),
      brandId: selectedBrandId,
      template: selectedTemplate,
      date: new Date().toLocaleString('es-ES', { hour12: false }),
    };

    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDraft),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const saved = await res.json();
      setSavedDrafts(prev => [saved, ...prev]);
      setNewDraftName('');
      showToast('💾 Borrador guardado en la biblioteca');
    } catch {
      showToast('❌ Error al guardar el borrador', 'error');
    }
  };

  // Load draft from saved list
  const handleLoadDraft = (draft: Draft) => {
    if (confirm(`¿Cargar el borrador "${draft.name}"? Se perderán los cambios actuales.`)) {
      if (draft.brandId) setSelectedBrandId(draft.brandId);
      if (draft.template) setSelectedTemplate(draft.template);
      setContent(draft.content);
      // Reset history with this loaded draft
      setHistory([JSON.parse(JSON.stringify(draft.content))]);
      setHistoryIndex(0);
      showToast('📥 Borrador cargado con éxito');
    }
  };

  // Delete draft from disk
  const handleDeleteDraft = async (id: string, name: string) => {
    if (confirm(`¿Eliminar el borrador "${name}" de la biblioteca?`)) {
      try {
        const res = await fetch(`/api/drafts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar');
        setSavedDrafts(prev => prev.filter(d => d.id !== id));
        showToast('🗑️ Borrador eliminado');
      } catch {
        showToast('❌ Error al eliminar el borrador', 'error');
      }
    }
  };

  // Generate A/B Testing subject line variants
  const handleGenerateAb = async () => {
    if (!content.headline && !content.body) {
      showToast('⚠️ Escribe el título y cuerpo del correo antes de generar variantes A/B', 'error');
      return;
    }

    setGeneratingAb(true);
    try {
      const response = await fetch('/api/ab-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headline: content.headline,
          body: content.body,
          engine: selectedEngine,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al generar variantes.');
      }

      setAbVariations(data);
      showToast(`🧪 Variantes A/B generadas con ${ENGINE_LABELS[selectedEngine]}`);
    } catch (err) {
      showToast((err instanceof Error ? err.message : null) || 'Error al conectar con la IA', 'error');
    } finally {
      setGeneratingAb(false);
    }
  };

  // Send real SMTP or Ethereal email test
  const handleSendTestEmailReal = async () => {
    if (!testEmail.trim()) {
      showToast('⚠️ Ingresa un correo electrónico destinatario', 'error');
      return;
    }

    setSendingTest(true);
    setTestMessageUrl(null);
    const brand = brands.find(b => b.id === selectedBrandId);

    try {
      const response = await fetch('/api/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmail: testEmail.trim(),
          subject: `[Prueba] - ${content.headline || brand?.name}`,
          html: htmlOutput,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar prueba.');
      }

      if (data.isVirtual) {
        setTestMessageUrl(data.previewUrl);
        showToast('✉️ Correo enviado a la bandeja virtual');
      } else {
        showToast('✉️ Correo de prueba real enviado');
      }
    } catch (err) {
      showToast((err instanceof Error ? err.message : null) || 'Error al enviar el correo de prueba', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  if (!mounted) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 24, color: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}>Cargando...</div>
        </main>
      </div>
    );
  }

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content fade-up-reveal">
        {/* Header */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ 
                fontSize: '10px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.2em', 
                color: 'var(--accent-light)', 
                fontWeight: 700,
                marginBottom: 8
              }}>
                Creador de Emails
              </p>
              <h1 style={{ textWrap: 'balance' }}>Email Editor</h1>
              <p style={{ fontSize: '15px' }}>Selecciona una marca y plantilla, edita y exporta código listo para campañas</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setApiKeyModalOpen(true)} style={{ gap: 6 }}>
                <span aria-hidden="true">🔑</span> Configurar IA
              </button>
              <button className="btn btn-primary btn-sm group" onClick={handleOpenAiModal} style={{ gap: 6, paddingRight: 10 }}>
                <span aria-hidden="true">🤖</span> Generar con IA
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/15 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" style={{ fontSize: 10 }} aria-hidden="true">
                  ↗
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="page-body">
          <div className="editor-layout">
            
            {/* ====== LEFT PANEL: Config + Content ====== */}
            <div className="glass-shell">
              <div className="glass-core" style={{ height: '100%', padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
                
                {/* Tab Switcher */}
                <div style={{ 
                  display: 'flex', 
                  background: 'rgba(5, 5, 10, 0.4)', 
                  borderRadius: '100px', 
                  padding: 4, 
                  border: '1px solid var(--border-subtle)',
                  marginBottom: 20
                }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      border: 'none',
                      borderRadius: '100px',
                      background: activeTab === 'editor' ? 'var(--accent-gradient)' : 'transparent',
                      color: activeTab === 'editor' ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    ✏️ Contenido
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('canvas')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      border: 'none',
                      borderRadius: '100px',
                      background: activeTab === 'canvas' ? 'var(--accent-gradient)' : 'transparent',
                      color: activeTab === 'canvas' ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    🧱 Canvas
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('drafts')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      border: 'none',
                      borderRadius: '100px',
                      background: activeTab === 'drafts' ? 'var(--accent-gradient)' : 'transparent',
                      color: activeTab === 'drafts' ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    📁 Biblioteca
                  </button>
                </div>

                {/* TAB 1: CONTENT EDITOR */}
                {activeTab === 'editor' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10, margin: '0 0 8px 0' }}>
                      ⚙️ Configuración & Contenido
                    </h3>

                    {/* Módulo 1: Marca & Plantilla */}
                    <div className={`accordion-module ${expandedSections.brand ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="accordion-header"
                        onClick={() => toggleSection('brand')}
                        aria-expanded={expandedSections.brand}
                      >
                        <span className="accordion-title">🏢 Marca & Plantilla Base</span>
                        <span className="accordion-icon" aria-hidden="true">{expandedSections.brand ? '▲' : '▼'}</span>
                      </button>
                      {expandedSections.brand && (
                        <div className="accordion-content">
                          {/* Brand Selector */}
                          <div className="form-group">
                            <label htmlFor="brand-selector" className="form-label">Marca</label>
                            <select
                              id="brand-selector"
                              className="form-select"
                              value={selectedBrandId}
                              onChange={e => setSelectedBrandId(e.target.value)}
                            >
                              {brands.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.isFavorite ? '★ ' : ''}{b.name} — {b.category}
                                </option>
                              ))}
                            </select>
                            {selectedBrand && (
                              <>
                                <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}>
                                  <div style={{ flex: 1, background: selectedBrand.colors.primary }} />
                                  <div style={{ flex: 1, background: selectedBrand.colors.accent }} />
                                  <div style={{ flex: 1, background: `linear-gradient(90deg, ${selectedBrand.colors.gradientStart}, ${selectedBrand.colors.gradientEnd})` }} />
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={applyBrandColors}
                                  style={{ marginTop: 10, width: '100%', gap: 6, fontSize: 11, padding: '6px 12px' }}
                                >
                                  🎨 Aplicar colores de marca
                                </button>
                              </>
                            )}
                          </div>

                          {/* Template Selector */}
                          <div className="form-group" style={{ marginTop: 4 }}>
                            <label className="form-label">Plantilla Base</label>
                            <div className="template-grid">
                              {TEMPLATES.map(t => (
                                <div
                                  key={t.type}
                                  className={`template-card ${selectedTemplate === t.type ? 'selected' : ''}`}
                                  onClick={() => setSelectedTemplate(t.type)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedTemplate(t.type); }}
                                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 10px', borderRadius: 'var(--radius-md)' }}
                                >
                                  <div className="template-icon" style={{ fontSize: 24 }} aria-hidden="true">{t.icon}</div>
                                  <div className="template-name" style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Módulo 2: Estructura & Bloques */}
                    <div className={`accordion-module ${expandedSections.blocks ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="accordion-header"
                        onClick={() => toggleSection('blocks')}
                        aria-expanded={expandedSections.blocks}
                      >
                        <span className="accordion-title">🧱 Estructura & Bloques</span>
                        <span className="accordion-icon" aria-hidden="true">{expandedSections.blocks ? '▲' : '▼'}</span>
                      </button>
                      {expandedSections.blocks && (
                        <div className="accordion-content">
                          {/* Selector de layout */}
                          <div className="form-group">
                            <label className="form-label">Diseño del email</label>
                            <div className="template-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                              {LAYOUT_OPTIONS.map(l => (
                                <div
                                  key={l.id}
                                  className={`template-card ${(content.layout || 'classic') === l.id ? 'selected' : ''}`}
                                  onClick={() => setBlockValue({ layout: l.id })}
                                  role="button"
                                  tabIndex={0}
                                  title={l.description}
                                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setBlockValue({ layout: l.id }); }}
                                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 6px', borderRadius: 'var(--radius-md)' }}
                                >
                                  <div style={{ fontSize: 18 }} aria-hidden="true">{l.icon}</div>
                                  <div style={{ fontSize: 10, fontWeight: 600 }}>{l.name}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Bloque: Hero */}
                          <div className="form-group">
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(content.hero)}
                                onChange={e => setBlockValue({ hero: e.target.checked ? { imageUrl: '', fullBleed: true } : undefined })}
                              />
                              🖼️ Imagen Hero {content.layout === 'hero' ? '(arriba de todo)' : '(bajo el header)'}
                            </label>
                            {content.hero && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <input
                                    id="content-hero"
                                    className="form-input"
                                    value={content.hero.imageUrl}
                                    onChange={e => setBlockValue({ hero: { ...content.hero!, imageUrl: e.target.value } })}
                                    placeholder="URL de la imagen hero…"
                                    spellCheck={false}
                                    style={{ flex: 1, fontSize: 12 }}
                                  />
                                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAssetPickerTarget('hero')} style={{ fontSize: 11, flexShrink: 0 }}>
                                    🖼️ Elegir
                                  </button>
                                </div>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                  <input
                                    className="form-input"
                                    value={content.hero.href || ''}
                                    onChange={e => setBlockValue({ hero: { ...content.hero!, href: e.target.value } })}
                                    placeholder="Link al hacer clic (opcional)…"
                                    spellCheck={false}
                                    style={{ flex: 1, fontSize: 12 }}
                                  />
                                  <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                                    <input
                                      type="checkbox"
                                      checked={content.hero.fullBleed !== false}
                                      onChange={e => setBlockValue({ hero: { ...content.hero!, fullBleed: e.target.checked } })}
                                    />
                                    Sin margen
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Bloque: Imagen + Texto */}
                          <div className="form-group">
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(content.imageText)}
                                onChange={e => setBlockValue({ imageText: e.target.checked ? { imageUrl: '', text: '', imagePosition: 'left' } : undefined })}
                              />
                              📰 Imagen + Texto
                            </label>
                            {content.imageText && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <input
                                    id="content-imageText"
                                    className="form-input"
                                    value={content.imageText.imageUrl}
                                    onChange={e => setBlockValue({ imageText: { ...content.imageText!, imageUrl: e.target.value } })}
                                    placeholder="URL de la imagen…"
                                    spellCheck={false}
                                    style={{ flex: 1, fontSize: 12 }}
                                  />
                                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAssetPickerTarget('imageText')} style={{ fontSize: 11, flexShrink: 0 }}>
                                    🖼️ Elegir
                                  </button>
                                </div>
                                <input
                                  className="form-input"
                                  value={content.imageText.title || ''}
                                  onChange={e => setBlockValue({ imageText: { ...content.imageText!, title: e.target.value } })}
                                  placeholder="Título del bloque (opcional)…"
                                  style={{ fontSize: 12 }}
                                />
                                <textarea
                                  className="form-textarea"
                                  value={content.imageText.text}
                                  onChange={e => setBlockValue({ imageText: { ...content.imageText!, text: e.target.value } })}
                                  placeholder="Texto que acompaña a la imagen…"
                                  rows={3}
                                  style={{ fontSize: 12 }}
                                />
                                <select
                                  aria-label="Posición de la imagen"
                                  className="form-select"
                                  value={content.imageText.imagePosition}
                                  onChange={e => setBlockValue({ imageText: { ...content.imageText!, imagePosition: e.target.value as 'left' | 'right' } })}
                                  style={{ fontSize: 12, width: 180 }}
                                >
                                  <option value="left">Imagen a la izquierda</option>
                                  <option value="right">Imagen a la derecha</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Bloque: Galería / Adset */}
                          <div className="form-group">
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(content.gallery)}
                                onChange={e => setBlockValue({ gallery: e.target.checked ? { images: [{ url: '' }, { url: '' }], columns: 2 } : undefined })}
                              />
                              🎞️ Galería de imágenes (adsets)
                            </label>
                            {content.gallery && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--border-subtle)' }}>
                                {content.gallery.images.map((img, i) => (
                                  <div key={i} style={{ display: 'flex', gap: 6 }}>
                                    <input
                                      className="form-input"
                                      value={img.url}
                                      onChange={e => {
                                        const images = content.gallery!.images.map((im, j) => (j === i ? { ...im, url: e.target.value } : im));
                                        setBlockValue({ gallery: { ...content.gallery!, images } });
                                      }}
                                      placeholder={`Imagen ${i + 1}…`}
                                      spellCheck={false}
                                      style={{ flex: 1, fontSize: 12 }}
                                    />
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAssetPickerTarget(`gallery-${i}`)} style={{ fontSize: 11, flexShrink: 0 }}>
                                      🖼️
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-icon"
                                      onClick={() => {
                                        const images = content.gallery!.images.filter((_, j) => j !== i);
                                        setBlockValue({ gallery: images.length ? { ...content.gallery!, images } : undefined });
                                      }}
                                      aria-label={`Quitar imagen ${i + 1}`}
                                      style={{ fontSize: 12, height: 36, flexShrink: 0 }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setBlockValue({ gallery: { ...content.gallery!, images: [...content.gallery!.images, { url: '' }] } })}
                                    style={{ fontSize: 11 }}
                                  >
                                    + Agregar imagen
                                  </button>
                                  <select
                                    aria-label="Columnas de la galería"
                                    className="form-select"
                                    value={content.gallery.columns}
                                    onChange={e => setBlockValue({ gallery: { ...content.gallery!, columns: parseInt(e.target.value, 10) === 3 ? 3 : 2 } })}
                                    style={{ fontSize: 12, width: 130 }}
                                  >
                                    <option value={2}>2 columnas</option>
                                    <option value={3}>3 columnas</option>
                                  </select>
                                </div>
                                <input
                                  className="form-input"
                                  value={content.gallery.caption || ''}
                                  onChange={e => setBlockValue({ gallery: { ...content.gallery!, caption: e.target.value } })}
                                  placeholder="Pie de galería (opcional)…"
                                  style={{ fontSize: 12 }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Bloque: Testimonio */}
                          <div className="form-group">
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(content.quote)}
                                onChange={e => setBlockValue({ quote: e.target.checked ? { text: '' } : undefined })}
                              />
                              💬 Testimonio / Cita
                            </label>
                            {content.quote && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--border-subtle)' }}>
                                <textarea
                                  id="content-quote"
                                  className="form-textarea"
                                  value={content.quote.text}
                                  onChange={e => setBlockValue({ quote: { ...content.quote!, text: e.target.value } })}
                                  placeholder="Texto del testimonio…"
                                  rows={2}
                                  style={{ fontSize: 12 }}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                  <input
                                    className="form-input"
                                    value={content.quote.author || ''}
                                    onChange={e => setBlockValue({ quote: { ...content.quote!, author: e.target.value } })}
                                    placeholder="Autor (opcional)…"
                                    style={{ fontSize: 12 }}
                                  />
                                  <input
                                    className="form-input"
                                    value={content.quote.role || ''}
                                    onChange={e => setBlockValue({ quote: { ...content.quote!, role: e.target.value } })}
                                    placeholder="Cargo / detalle…"
                                    style={{ fontSize: 12 }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Separadores */}
                          <div className="form-group">
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(content.showDividers)}
                                onChange={e => setBlockValue({ showDividers: e.target.checked })}
                              />
                              ➖ Separadores sutiles entre secciones
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Módulo 3: Estilos & Fondos */}
                    <div className={`accordion-module ${expandedSections.styles ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="accordion-header"
                        onClick={() => toggleSection('styles')}
                        aria-expanded={expandedSections.styles}
                      >
                        <span className="accordion-title">🎨 Estilos & Fondos</span>
                        <span className="accordion-icon" aria-hidden="true">{expandedSections.styles ? '▲' : '▼'}</span>
                      </button>
                      {expandedSections.styles && (
                        <div className="accordion-content">
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                              <label htmlFor="email-bg-color" className="form-label">Fondo Email</label>
                              <div className="form-color-group">
                                <input
                                  id="email-bg-color"
                                  type="color"
                                  className="form-color-input"
                                  value={content.emailBgColor || '#eef2f6'}
                                  onChange={e => updateContent('emailBgColor', e.target.value)}
                                  spellCheck={false}
                                />
                                <input
                                  type="text"
                                  className="form-input form-color-hex"
                                  value={content.emailBgColor || '#eef2f6'}
                                  onChange={e => updateContent('emailBgColor', e.target.value)}
                                  placeholder="#eef2f6"
                                  maxLength={7}
                                  spellCheck={false}
                                />
                              </div>
                            </div>
                            <div className="form-group">
                              <label htmlFor="body-bg-color" className="form-label">Fondo Body</label>
                              <div className="form-color-group">
                                <input
                                  id="body-bg-color"
                                  type="color"
                                  className="form-color-input"
                                  value={content.bodyBgColor || '#ffffff'}
                                  onChange={e => updateContent('bodyBgColor', e.target.value)}
                                  spellCheck={false}
                                />
                                <input
                                  type="text"
                                  className="form-input form-color-hex"
                                  value={content.bodyBgColor || '#ffffff'}
                                  onChange={e => updateContent('bodyBgColor', e.target.value)}
                                  placeholder="#ffffff"
                                  maxLength={7}
                                  spellCheck={false}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="form-group">
                            <label htmlFor="email-texture" className="form-label">Textura del Email</label>
                            <select
                              id="email-texture"
                              className="form-select"
                              value={content.textureUrl || ''}
                              onChange={e => updateContent('textureUrl', e.target.value)}
                            >
                              {TEXTURE_PRESETS.map(p => (
                                <option key={p.name} value={p.url}>{p.name}</option>
                              ))}
                            </select>
                            {content.textureUrl && (
                              <input
                                className="form-input"
                                value={content.textureUrl}
                                onChange={e => updateContent('textureUrl', e.target.value)}
                                placeholder="URL de textura customizada…"
                                style={{ marginTop: 8 }}
                                spellCheck={false}
                              />
                            )}
                          </div>

                          <div className="form-group">
                            <label htmlFor="header-texture" className="form-label">Textura del Header (Opcional)</label>
                            <select
                              id="header-texture"
                              className="form-select"
                              value={content.headerTextureUrl || ''}
                              onChange={e => updateContent('headerTextureUrl', e.target.value)}
                            >
                              {TEXTURE_PRESETS.map(p => (
                                <option key={p.name} value={p.url}>{p.name}</option>
                              ))}
                            </select>
                            {content.headerTextureUrl && (
                              <input
                                className="form-input"
                                value={content.headerTextureUrl}
                                onChange={e => updateContent('headerTextureUrl', e.target.value)}
                                placeholder="URL de textura para el header…"
                                style={{ marginTop: 8 }}
                                spellCheck={false}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Módulo 4: Contenido del Correo */}
                    <div className={`accordion-module ${expandedSections.content ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="accordion-header"
                        onClick={() => toggleSection('content')}
                        aria-expanded={expandedSections.content}
                      >
                        <span className="accordion-title">📝 Contenido del Correo</span>
                        <span className="accordion-icon" aria-hidden="true">{expandedSections.content ? '▲' : '▼'}</span>
                      </button>
                      {expandedSections.content && (
                        <div className="accordion-content">
                          {/* Content Form */}
                          <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label htmlFor="content-label" className="form-label" style={{ margin: 0 }}>Etiqueta superior</label>
                              {renderInlineAiActions('label')}
                            </div>
                            <input
                              id="content-label"
                              className="form-input"
                              value={content.label}
                              onChange={e => updateContent('label', e.target.value)}
                              onBlur={() => saveHistory(content)}
                              placeholder="Ej: Masterclass gratuita…"
                            />
                          </div>

                          <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label htmlFor="content-headline" className="form-label" style={{ margin: 0 }}>Título principal</label>
                              {renderInlineAiActions('headline')}
                            </div>
                            <input
                              id="content-headline"
                              className="form-input"
                              value={content.headline}
                              onChange={e => updateContent('headline', e.target.value)}
                              onBlur={() => saveHistory(content)}
                              placeholder="Ej: Aprende a reparar tu crédito…"
                            />
                          </div>

                          <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label htmlFor="content-body" className="form-label" style={{ margin: 0 }}>Texto del cuerpo</label>
                              {renderInlineAiActions('body')}
                            </div>
                            <textarea
                              id="content-body"
                              className="form-textarea"
                              value={content.body}
                              onChange={e => updateContent('body', e.target.value)}
                              onBlur={() => saveHistory(content)}
                              placeholder="Texto principal del email. Puedes usar {{contact.first_name}} para personalizar…"
                              rows={6}
                            />
                          </div>

                          <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label htmlFor="bullets-title" className="form-label" style={{ margin: 0 }}>Título de bullets</label>
                              {renderInlineAiActions('bulletsTitle')}
                            </div>
                            <input
                              id="bullets-title"
                              className="form-input"
                              value={content.bulletsTitle}
                              onChange={e => updateContent('bulletsTitle', e.target.value)}
                              onBlur={() => saveHistory(content)}
                              placeholder="Ej: En esta clase vas a descubrir…"
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Bullets</label>
                            <div className="bullet-list">
                              {content.bullets.map((bullet, i) => (
                                <div key={i} className="bullet-item" style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 12 }}>
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Punto {i + 1}</span>
                                      {renderInlineAiActions('bullets', i)}
                                    </div>
                                    <input
                                      className="form-input"
                                      value={bullet}
                                      onChange={e => updateBullet(i, e.target.value)}
                                      onBlur={() => saveHistory(content)}
                                      placeholder={`Punto clave ${i + 1}…`}
                                    />
                                  </div>
                                  <button
                                    className="btn btn-ghost btn-icon"
                                    onClick={() => removeBullet(i)}
                                    title="Eliminar"
                                    aria-label={`Eliminar punto ${i + 1}`}
                                    style={{ fontSize: 13, height: 40 }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <button className="btn btn-ghost btn-sm" onClick={addBullet} style={{ alignSelf: 'flex-start', fontSize: 12, marginTop: 4 }}>
                                + Agregar bullet
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                              <label htmlFor="event-date" className="form-label">📅 Fecha del evento</label>
                              <input
                                id="event-date"
                                className="form-input"
                                value={content.eventDate}
                                onChange={e => updateContent('eventDate', e.target.value)}
                                onBlur={() => saveHistory(content)}
                                placeholder="Ej: 18 de julio…"
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="event-time" className="form-label">🕐 Hora</label>
                              <input
                                id="event-time"
                                className="form-input"
                                value={content.eventTime}
                                onChange={e => updateContent('eventTime', e.target.value)}
                                onBlur={() => saveHistory(content)}
                                placeholder="Ej: 11:00 AM…"
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label htmlFor="pre-cta" className="form-label" style={{ margin: 0 }}>Texto pre-CTA</label>
                              {renderInlineAiActions('preCta')}
                            </div>
                            <input
                              id="pre-cta"
                              className="form-input"
                              value={content.preCta}
                              onChange={e => updateContent('preCta', e.target.value)}
                              onBlur={() => saveHistory(content)}
                              placeholder="Ej: Únete para recibir el acceso 👇…"
                            />
                          </div>

                          <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label className="form-label" style={{ margin: 0 }}>Botón CTA</label>
                              {renderInlineAiActions('ctaText')}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              <input
                                id="cta-text"
                                aria-label="Texto del botón"
                                className="form-input"
                                value={content.ctaText}
                                onChange={e => updateContent('ctaText', e.target.value)}
                                onBlur={() => saveHistory(content)}
                                placeholder="Texto del botón…"
                              />
                              <input
                                id="cta-url"
                                aria-label="URL de destino"
                                className="form-input"
                                value={content.ctaUrl}
                                onChange={e => updateContent('ctaUrl', e.target.value)}
                                onBlur={() => saveHistory(content)}
                                placeholder="URL destino (GHL/Link)…"
                                spellCheck={false}
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label htmlFor="footer-note" className="form-label" style={{ margin: 0 }}>Nota al pie</label>
                              {renderInlineAiActions('footerNote')}
                            </div>
                            <input
                              id="footer-note"
                              className="form-input"
                              value={content.footerNote}
                              onChange={e => updateContent('footerNote', e.target.value)}
                              onBlur={() => saveHistory(content)}
                              placeholder="Ej: Cupos limitados · Reserva tu lugar ahora…"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Módulo 5: Salud & Métricas */}
                    <div className={`accordion-module ${expandedSections.health ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="accordion-header"
                        onClick={() => toggleSection('health')}
                        aria-expanded={expandedSections.health}
                      >
                        <span className="accordion-title">🩺 Salud & Métricas</span>
                        <span className="accordion-icon" aria-hidden="true">{expandedSections.health ? '▲' : '▼'}</span>
                      </button>
                      {expandedSections.health && (
                        <div className="accordion-content">
                          {(() => {
                            const getWordsCount = () => {
                              const text = `${content.label} ${content.headline} ${content.body} ${content.bulletsTitle} ${content.bullets.join(' ')} ${content.preCta} ${content.ctaText} ${content.footerNote}`;
                              return text.trim().split(/\s+/).filter(Boolean).length;
                            };
                            const words = getWordsCount();
                            const readingTimeSeconds = Math.round(words / 3.3);
                            const readingTimeStr = readingTimeSeconds < 60
                              ? `${readingTimeSeconds} seg`
                              : `${Math.round(readingTimeSeconds / 60)} min`;

                            const SPAM_WORDS = [
                              'GRATIS', '100% LIBRE', 'DINERO RAPIDO', 'URGENTE', 'COMPRAR AHORA',
                              'GANAR', 'OFERTA ESPECIAL', 'SIN COSTO', 'INGRESO EXTRA', 'INVERSION',
                              'GARANTIZADO', 'HAZLO HOY', 'ACCESO INMEDIATO', 'OFERTA UNICA'
                            ];

                            const textForSpam = `${content.headline} ${content.body}`.toUpperCase();
                            const spamMatches = SPAM_WORDS.filter(word => textForSpam.includes(word));
                            const isCtaValid = content.ctaUrl && content.ctaUrl !== '#' && content.ctaText.trim().length > 0;
                            const hasPersonalization = content.body.includes('{{contact.first_name}}');

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                                {/* Reading time */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>⏱️ Tiempo de lectura:</span>
                                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{readingTimeStr} ({words} palabras)</span>
                                </div>

                                {/* Personalization */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>👤 Personalización:</span>
                                  {hasPersonalization ? (
                                    <span style={{ color: '#34d399', fontWeight: 600 }}>🟢 Activa (first_name)</span>
                                  ) : (
                                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>🟡 Añade variables</span>
                                  )}
                                </div>

                                {/* CTA valid */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>🔗 Botón CTA:</span>
                                  {isCtaValid ? (
                                    <span style={{ color: '#34d399', fontWeight: 600 }}>🟢 Configurado</span>
                                  ) : (
                                    <span style={{ color: '#f87171', fontWeight: 600 }}>🔴 Enlace ausente</span>
                                  )}
                                </div>

                                {/* Spam matches */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border-subtle)', paddingTop: 8, marginTop: 4 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>🛡️ Detección de Spam:</span>
                                    {spamMatches.length === 0 ? (
                                      <span style={{ color: '#34d399', fontWeight: 600 }}>🟢 0 palabras de riesgo</span>
                                    ) : (
                                      <span style={{ color: '#f87171', fontWeight: 600 }}>🔴 {spamMatches.length} detectadas</span>
                                    )}
                                  </div>
                                  {spamMatches.length > 0 && (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(239, 68, 68, 0.05)', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.1)', marginTop: 4 }}>
                                      Evita: {spamMatches.join(', ')} para mejorar entregabilidad.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}



                {/* TAB 2: CANVAS BUILDER */}
                {activeTab === 'canvas' && (
                  <CanvasEditor
                    content={content}
                    brand={selectedBrand || null}
                    onContentChange={(updates) => setContent(prev => ({ ...prev, ...updates }))}
                  />
                )}

                {/* TAB 3: LIBRARY (DRAFTS & SMTP TEST) */}
                {activeTab === 'drafts' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10, margin: 0 }}>
                      📁 Biblioteca & Envío de Prueba
                    </h3>
                    
                    {/* Send Test Email widget inside drafts for clean accessibility */}
                    <div className="glass-shell" style={{ padding: 4, marginBottom: 8 }}>
                      <div className="glass-core" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)' }}>📨 Enviar Prueba Real</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="email"
                            className="form-input"
                            placeholder="tu-correo@ejemplo.com"
                            value={testEmail}
                            onChange={e => setTestEmail(e.target.value)}
                            style={{ fontSize: 12, padding: '8px 10px', flex: 1 }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleSendTestEmailReal}
                            disabled={sendingTest}
                            style={{ fontSize: 11, padding: '6px 12px' }}
                          >
                            {sendingTest ? 'Enviando...' : 'Enviar'}
                          </button>
                        </div>
                        {testMessageUrl && (
                          <div style={{ marginTop: 4, background: 'rgba(99, 102, 241, 0.05)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-accent)', textAlign: 'center' }}>
                            <a href={testMessageUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-accent)', fontSize: 11, fontWeight: 700, textDecoration: 'underline' }}>
                              👉 Clic aquí para abrir Bandeja de Entrada Virtual ↗
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Save Current Draft */}
                    <div className="glass-shell" style={{ padding: 4 }}>
                      <div className="glass-core" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)' }}>💾 Guardar diseño actual</div>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Nombre del borrador (ej: Promo Julio v2)..."
                          value={newDraftName}
                          onChange={e => setNewDraftName(e.target.value)}
                          style={{ fontSize: 12, padding: '8px 10px' }}
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleSaveDraft}
                          style={{ width: '100%', fontSize: 11, padding: '6px 12px' }}
                        >
                          Guardar borrador
                        </button>
                      </div>
                    </div>

                    {/* Saved Drafts List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
                        Borradores Guardados ({savedDrafts.length})
                      </h4>
                      
                      {savedDrafts.length === 0 ? (
                        <div className="empty-state" style={{ padding: '30px 10px' }}>
                          <div className="empty-icon" style={{ fontSize: 32 }}>📁</div>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
                            Aún no has guardado borradores. Nombra tu diseño actual arriba para guardarlo.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {savedDrafts.map((draft) => (
                            <div key={draft.id} className="glass-shell" style={{ padding: 4 }}>
                              <div className="glass-core" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-all', flex: 1, paddingRight: 8 }}>{draft.name}</div>
                                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleLoadDraft(draft)}
                                      title="Cargar borrador"
                                      style={{ padding: '2px 6px', fontSize: 10, height: 'auto' }}
                                    >
                                      Cargar
                                    </button>
                                    <button
                                      className="btn btn-danger btn-sm"
                                      onClick={() => handleDeleteDraft(draft.id, draft.name)}
                                      title="Eliminar borrador"
                                      style={{ padding: '2px 6px', fontSize: 10, height: 'auto' }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                                  <span>🏢 {draft.brandName}</span>
                                  <span>·</span>
                                  <span>🎓 {draft.templateName}</span>
                                </div>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'right', borderTop: '1px solid var(--border-subtle)', paddingTop: 4 }}>
                                  📅 {draft.date}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ====== RIGHT PANEL: Preview ====== */}
            <div className="glass-shell">
              <div className="glass-core" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                <div className="preview-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(10, 14, 23, 0.4)', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 12 }}>
                  
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* Premium sliding switcher */}
                    <div style={{ 
                      display: 'flex', 
                      background: 'rgba(5, 5, 10, 0.6)', 
                      borderRadius: '100px', 
                      padding: 4, 
                      border: '1px solid var(--border-subtle)',
                      position: 'relative'
                    }}>
                      <button
                        className={viewMode === 'desktop' ? 'active' : ''}
                        onClick={() => setViewMode('desktop')}
                        style={{
                          padding: '6px 16px',
                          border: 'none',
                          borderRadius: '100px',
                          background: viewMode === 'desktop' ? 'var(--accent-gradient)' : 'transparent',
                          color: viewMode === 'desktop' ? '#ffffff' : 'var(--text-secondary)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        🖥️ Desktop
                      </button>
                      <button
                        className={viewMode === 'mobile' ? 'active' : ''}
                        onClick={() => setViewMode('mobile')}
                        style={{
                          padding: '6px 16px',
                          border: 'none',
                          borderRadius: '100px',
                          background: viewMode === 'mobile' ? 'var(--accent-gradient)' : 'transparent',
                          color: viewMode === 'mobile' ? '#ffffff' : 'var(--text-secondary)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        📱 Mobile
                      </button>
                    </div>

                    {/* Undo / Redo */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        title="Deshacer (Ctrl+Z)"
                        style={{ padding: '6px 12px', fontSize: 12, minWidth: 36, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ↩️
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                        title="Rehacer (Ctrl+Y)"
                        style={{ padding: '6px 12px', fontSize: 12, minWidth: 36, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ↪️
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSimulatedDarkMode(prev => !prev)}
                        title="Simular Modo Oscuro"
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: 12, 
                          minWidth: 36, 
                          height: 32, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          background: simulatedDarkMode ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                          borderColor: simulatedDarkMode ? 'transparent' : 'var(--border-default)',
                          color: '#ffffff'
                        }}
                      >
                        🌓 {simulatedDarkMode ? 'Claro' : 'Oscuro'}
                      </button>
                    </div>

                    {/* Rating del último email generado — entrena el estilo de la marca */}
                    {lastHistory && (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', paddingLeft: 8, borderLeft: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>¿Te gustó?</span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRateLastEmail('up')}
                          title="Me gustó — la IA aprenderá de este email"
                          style={{
                            padding: '4px 8px', fontSize: 13, height: 28,
                            background: lastHistory.rating === 'up' ? 'rgba(52, 211, 153, 0.15)' : undefined,
                            borderColor: lastHistory.rating === 'up' ? 'rgba(52, 211, 153, 0.4)' : undefined,
                          }}
                        >
                          👍
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRateLastEmail('down')}
                          title="No me gustó"
                          style={{
                            padding: '4px 8px', fontSize: 13, height: 28,
                            background: lastHistory.rating === 'down' ? 'rgba(248, 113, 113, 0.15)' : undefined,
                            borderColor: lastHistory.rating === 'down' ? 'rgba(248, 113, 113, 0.4)' : undefined,
                          }}
                        >
                          👎
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-sm group" onClick={handleCopyHtml} style={{ padding: '6px 12px', height: 32, fontSize: 12 }}>
                      <span>📋 Copiar HTML</span>
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleDownloadHtml} title="Descargar archivo HTML" style={{ padding: '6px 12px', height: 32, fontSize: 12 }}>
                      <span>📥 Descargar</span>
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleShareDraft} title="Copiar enlace del borrador" style={{ padding: '6px 12px', height: 32, fontSize: 12 }}>
                      <span>🔗 Compartir</span>
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleSendTestEmail} title="Enviar prueba por email" style={{ padding: '6px 12px', height: 32, fontSize: 12 }}>
                      <span>📨 Probar</span>
                    </button>
                  </div>
                </div>

                {viewMode === 'desktop' && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12, 
                    background: 'rgba(5, 5, 10, 0.2)', 
                    padding: '8px 20px', 
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: 11,
                    color: 'var(--text-secondary)'
                  }}>
                    <span>Ancho del correo:</span>
                    <input
                      type="range"
                      min="320"
                      max="800"
                      value={previewWidth}
                      onChange={e => setPreviewWidth(parseInt(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{previewWidth}px</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setPreviewWidth(600)}
                      style={{ padding: '2px 6px', fontSize: 10, height: 'auto' }}
                    >
                      Reset (600px)
                    </button>
                  </div>
                )}

                <div className={`preview-frame ${viewMode}`} style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  padding: 24,
                  background: 'rgba(5, 5, 10, 0.4)',
                  overflowY: 'auto',
                  borderTop: 'none',
                  minHeight: 500
                }}>
                  <iframe
                    ref={iframeRef}
                    title="Email Preview"
                    sandbox="allow-same-origin"
                    style={{
                      width: viewMode === 'desktop' ? previewWidth : 390,
                      maxWidth: '100%',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      background: '#ffffff',
                      transition: 'width 100ms ease, height var(--transition-base)',
                    }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* AI SETTINGS MODAL — keys de ambos motores + motor por defecto */}
        {apiKeyModalOpen && (
          <div className="modal-overlay" onClick={() => setApiKeyModalOpen(false)}>
            <div className="glass-shell" onClick={e => e.stopPropagation()} style={{ width: 520, maxWidth: '90vw', animation: 'slideUp 0.4s ease-out' }}>
              <div className="glass-core" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>🔑 Configurar IA</h2>
                  <button className="btn btn-ghost btn-icon" onClick={() => setApiKeyModalOpen(false)} aria-label="Cerrar modal" style={{ width: 30, height: 30 }}>✕</button>
                </div>
                <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="gemini-key-input" className="form-label">
                      ⚡ Gemini API Key{' '}
                      {settings?.hasGeminiKey && (
                        <span style={{ color: '#34d399', fontWeight: 400, fontSize: 11 }}>
                          — configurada ({settings.geminiKeyMasked})
                        </span>
                      )}
                    </label>
                    <input
                      id="gemini-key-input"
                      type="password"
                      className="form-input"
                      value={geminiKeyInput}
                      onChange={e => setGeminiKeyInput(e.target.value)}
                      placeholder={settings?.hasGeminiKey ? 'Ingresar nueva key para reemplazar…' : 'AIzaSy…'}
                      spellCheck={false}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Gratuita en{' '}
                      <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--text-accent)' }}>
                        Google AI Studio
                      </a>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="anthropic-key-input" className="form-label">
                      🧠 Anthropic API Key (Claude){' '}
                      {settings?.hasAnthropicKey && (
                        <span style={{ color: '#34d399', fontWeight: 400, fontSize: 11 }}>
                          — configurada ({settings.anthropicKeyMasked})
                        </span>
                      )}
                    </label>
                    <input
                      id="anthropic-key-input"
                      type="password"
                      className="form-input"
                      value={anthropicKeyInput}
                      onChange={e => setAnthropicKeyInput(e.target.value)}
                      placeholder={settings?.hasAnthropicKey ? 'Ingresar nueva key para reemplazar…' : 'sk-ant-…'}
                      spellCheck={false}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Se obtiene en{' '}
                      <a href="https://platform.claude.com/" target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--text-accent)' }}>
                        platform.claude.com
                      </a>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Motor por defecto</label>
                    <div style={{ display: 'flex', background: 'rgba(5, 5, 10, 0.4)', borderRadius: '100px', padding: 4, border: '1px solid var(--border-subtle)' }}>
                      {(['gemini', 'claude'] as AIEngine[]).map(engine => (
                        <button
                          key={engine}
                          type="button"
                          onClick={() => handleChangeDefaultEngine(engine)}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            border: 'none',
                            borderRadius: '100px',
                            background: selectedEngine === engine ? 'var(--accent-gradient)' : 'transparent',
                            color: selectedEngine === engine ? '#ffffff' : 'var(--text-secondary)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          {ENGINE_LABELS[engine]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(99, 102, 241, 0.05)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-accent)' }}>
                    Las keys se guardan en <code>data/settings.json</code> de este proyecto (solo local, nunca se muestran completas).
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setApiKeyModalOpen(false)}>Cerrar</button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSaveSettings()}
                    disabled={savingSettings || (!geminiKeyInput.trim() && !anthropicKeyInput.trim())}
                  >
                    {savingSettings ? 'Guardando…' : 'Guardar keys'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI PROMPT MODAL */}
        {aiPromptModalOpen && (
          <div className="modal-overlay" onClick={() => !generatingCopy && setAiPromptModalOpen(false)}>
            <div className="glass-shell" onClick={e => e.stopPropagation()} style={{ width: 550, animation: 'slideUp 0.4s ease-out' }}>
              <div className="glass-core" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>🤖 Generar Copy con IA</h2>
                  <button className="btn btn-ghost btn-icon" onClick={() => !generatingCopy && setAiPromptModalOpen(false)} disabled={generatingCopy} aria-label="Cerrar modal" style={{ width: 30, height: 30 }}>✕</button>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Describe brevemente de qué se trata el email. La IA generará toda la estructura adaptada al template de tipo <strong>{selectedTemplate.toUpperCase()}</strong> y a la marca <strong>{selectedBrand?.name}</strong>.
                  </p>

                  {/* Selector de motor */}
                  <div className="form-group">
                    <label className="form-label">Motor de IA</label>
                    <div style={{ display: 'flex', background: 'rgba(5, 5, 10, 0.4)', borderRadius: '100px', padding: 4, border: '1px solid var(--border-subtle)', maxWidth: 300 }}>
                      {(['gemini', 'claude'] as AIEngine[]).map(engine => (
                        <button
                          key={engine}
                          type="button"
                          disabled={generatingCopy}
                          onClick={() => handleChangeDefaultEngine(engine)}
                          title={hasKeyForEngine(engine) ? undefined : 'Falta configurar la API key de este motor'}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            border: 'none',
                            borderRadius: '100px',
                            background: selectedEngine === engine ? 'var(--accent-gradient)' : 'transparent',
                            color: selectedEngine === engine ? '#ffffff' : 'var(--text-secondary)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            opacity: hasKeyForEngine(engine) ? 1 : 0.5,
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          {ENGINE_LABELS[engine]}
                        </button>
                      ))}
                    </div>
                    {!hasKeyForEngine(selectedEngine) && (
                      <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 6 }}>
                        ⚠️ Falta la API key de {ENGINE_LABELS[selectedEngine]} — configúrala en «Configurar IA».
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="ai-prompt-input" className="form-label">¿De qué trata este correo?</label>
                    <textarea
                      id="ai-prompt-input"
                      className="form-textarea"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="Ej: Invitación a una clase de reparación de crédito este 18 de julio a las 11:00 AM para ayudar a hispanos en USA a comprar su casa. El botón debe unirlos al grupo de WhatsApp…"
                      rows={4}
                      disabled={generatingCopy}
                      autoFocus
                    />
                  </div>
                  {generatingCopy && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-accent)', fontSize: 14, fontWeight: 600, marginTop: 16, background: 'rgba(99, 102, 241, 0.05)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-accent)', animation: 'pulse 1.5s infinite' }}>
                      <div style={{ width: 18, height: 18, border: '2.5px solid transparent', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} aria-hidden="true"></div>
                      Escribiendo copy persuasivo con {ENGINE_LABELS[selectedEngine]}…
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setAiPromptModalOpen(false)} disabled={generatingCopy}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleGenerateWithAi} disabled={generatingCopy || !aiPrompt.trim()}>
                    Generar Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EXPORT MODAL — el HTML tiene imágenes locales */}
        {exportMode && (
          <ExportModal
            html={htmlOutput}
            fileName={exportFileName()}
            mode={exportMode}
            initialBaseUrl={settings?.assetsPublicBaseUrl || ''}
            onClose={() => setExportMode(null)}
            onDone={message => {
              showToast(message);
              syncHistorySnapshot();
            }}
            onBaseUrlSaved={baseUrl => setSettings(prev => (prev ? { ...prev, assetsPublicBaseUrl: baseUrl } : prev))}
          />
        )}

        {/* ASSET PICKER para bloques (hero / imagen+texto / galería) */}
        {assetPickerTarget && (
          <AssetPicker
            brandId={selectedBrandId}
            title="Elegir imagen del bloque"
            onClose={() => setAssetPickerTarget(null)}
            onSelect={asset => handleAssetSelected(asset.url)}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className={`toast ${toast.type === 'error' ? 'error' : 'success'}`} aria-live="polite">
            <span aria-hidden="true">{toast.type === 'error' ? '❌' : '✅'}</span>
            <span>{toast.message}</span>
          </div>
        )}
      </main>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 24, color: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}>Cargando editor…</div>
        </main>
      </div>
    }>
      <EditorContent />
    </Suspense>
  );
}
