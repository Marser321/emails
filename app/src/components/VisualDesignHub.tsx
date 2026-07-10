'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Palette, CheckCircle2, AlertTriangle, X, Sparkles, Image as ImageIcon, 
  Download, RefreshCw, Check, Eye, Sliders, Type, Layers 
} from 'lucide-react';
import { Brand, EmailContent } from '@/lib/types';
import { uploadAsset } from '@/lib/assets';

interface VisualDesignHubProps {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand | null;
  content: EmailContent;
  onUpdateColors: (updates: { 
    brandColors?: { primary: string; accent: string; gradientStart: string; gradientEnd: string };
    contentColors?: { emailBgColor: string; bodyBgColor: string };
  }) => void;
  onInjectAdset: (imageUrl: string) => void;
  brandId: string;
}

// Preset color palettes (highly curated, beautiful & readable)
const COLOR_PALETTES = [
  {
    name: 'Midnight Indigo (Premium Dark)',
    description: 'Estética tecnológica premium, ideal para lanzamientos de software y productos digitales.',
    colors: {
      primary: '#f4f4f5',      // headings (light on dark)
      accent: '#6366f1',       // button CTA (indigo)
      gradientStart: '#6366f1',
      gradientEnd: '#4f46e5',
      emailBgColor: '#09090b', // page body wrapper bg
      bodyBgColor: '#18181b',  // container main card bg
    }
  },
  {
    name: 'Elegant Warm Editorial',
    description: 'Estética editorial clásica y cálida. Ideal para consultorías, marcas personales y moda.',
    colors: {
      primary: '#2e251d',      // headings
      accent: '#c2410c',       // button CTA (terracota)
      gradientStart: '#c2410c',
      gradientEnd: '#ea580c',
      emailBgColor: '#fbfaf8',
      bodyBgColor: '#f7f2ea',
    }
  },
  {
    name: 'Sleek Corporate Slate',
    description: 'Limpio, profesional y corporativo. Perfecto para finanzas, seguros y real estate.',
    colors: {
      primary: '#0f172a',      // headings
      accent: '#2563eb',       // button CTA (royal blue)
      gradientStart: '#2563eb',
      gradientEnd: '#1d4ed8',
      emailBgColor: '#f1f5f9',
      bodyBgColor: '#ffffff',
    }
  },
  {
    name: 'Forest Health & Wellness',
    description: 'Orgánico, limpio y relajante. Diseñado para clínicas, cosméticos y marcas ecológicas.',
    colors: {
      primary: '#14532d',      // headings (dark forest)
      accent: '#15803d',       // button CTA (green)
      gradientStart: '#16a34a',
      gradientEnd: '#15803d',
      emailBgColor: '#f4f6f4',
      bodyBgColor: '#ffffff',
    }
  },
  {
    name: 'Luxury Dark Gold',
    description: 'Estética exclusiva de alta gama. Para marcas premium, clubs de inversores o real estate de lujo.',
    colors: {
      primary: '#f1e1c6',      // gold text
      accent: '#c5a880',       // gold accent button
      gradientStart: '#c5a880',
      gradientEnd: '#9a7f5a',
      emailBgColor: '#0c0c0c',
      bodyBgColor: '#161616',
    }
  },
  {
    name: 'Vibrant Tech Orange',
    description: 'Enérgico, moderno y directo. Ideal para eventos de marketing, ofertas flash y newsletters.',
    colors: {
      primary: '#1e293b',      // headings
      accent: '#f97316',       // orange
      gradientStart: '#f97316',
      gradientEnd: '#ea580c',
      emailBgColor: '#f8fafc',
      bodyBgColor: '#ffffff',
    }
  }
];

// Preset background image suggestions for the Adset Generator (Unsplash premium curations)
const BANNER_BG_PRESETS = [
  { name: 'Finanzas & Crecimiento', url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80' },
  { name: 'Oficina & Productividad', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80' },
  { name: 'Real Estate / Casas', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&auto=format&fit=crop&q=80' },
  { name: 'Educación & Libros', url: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&auto=format&fit=crop&q=80' },
  { name: 'Abstracto / Gradiente', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=80' },
];

// WCAG Contrast utilities
function getRelativeLuminance(hex: string): number {
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  if (color.length !== 6) return 0;
  
  const r = parseInt(color.substring(0, 2), 16) / 255;
  const g = parseInt(color.substring(2, 4), 16) / 255;
  const b = parseInt(color.substring(4, 6), 16) / 255;

  const R = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const G = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const B = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function mixColors(color1: string, color2: string, weight: number): string {
  let c1 = color1.replace('#', '');
  let c2 = color2.replace('#', '');
  if (c1.length === 3) c1 = c1[0]+c1[0]+c1[1]+c1[1]+c1[2]+c1[2];
  if (c2.length === 3) c2 = c2[0]+c2[0]+c2[1]+c2[1]+c2[2]+c2[2];
  
  const r1 = parseInt(c1.substring(0, 2), 16);
  const g1 = parseInt(c1.substring(2, 4), 16);
  const b1 = parseInt(c1.substring(4, 6), 16);

  const r2 = parseInt(c2.substring(0, 2), 16);
  const g2 = parseInt(c2.substring(2, 4), 16);
  const b2 = parseInt(c2.substring(4, 6), 16);

  const r = Math.round(r1 * (1 - weight) + r2 * weight);
  const g = Math.round(g1 * (1 - weight) + g2 * weight);
  const b = Math.round(b1 * (1 - weight) + b2 * weight);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function adjustContrast(textHex: string, bgHex: string, minRatio: number = 4.5): string {
  let ratio = getContrastRatio(textHex, bgHex);
  if (ratio >= minRatio) return textHex;

  const isBgDark = getRelativeLuminance(bgHex) < 0.5;
  let currentHex = textHex;
  
  for (let i = 0; i < 20; i++) {
    currentHex = mixColors(currentHex, isBgDark ? '#ffffff' : '#000000', 0.15);
    ratio = getContrastRatio(currentHex, bgHex);
    if (ratio >= minRatio) return currentHex;
  }
  return isBgDark ? '#ffffff' : '#000000';
}

export default function VisualDesignHub({
  isOpen,
  onClose,
  brand,
  content,
  onUpdateColors,
  onInjectAdset,
  brandId
}: VisualDesignHubProps) {
  const [activeTab, setActiveTab] = useState<'colors' | 'banners'>('colors');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // === COLOR STATES ===
  const [primaryColor, setPrimaryColor] = useState(brand?.colors.primary || '#0B2A4A');
  const [accentColor, setAccentColor] = useState(brand?.colors.accent || '#29ABE2');
  const [gradientStart, setGradientStart] = useState(brand?.colors.gradientStart || '#29ABE2');
  const [gradientEnd, setGradientEnd] = useState(brand?.colors.gradientEnd || '#1B6FC4');
  const [emailBgColor, setEmailBgColor] = useState(content.emailBgColor || '#eef2f6');
  const [bodyBgColor, setBodyBgColor] = useState(content.bodyBgColor || '#ffffff');
  const [textColor, setTextColor] = useState('#4a5568'); // default render color for bodies

  // === BANNER CREATOR STATES ===
  const [bannerLayout, setBannerLayout] = useState<'minimal' | 'promo' | 'coupon'>('promo');
  const [bannerTitle, setBannerTitle] = useState('¡ÚLTIMA OPORTUNIDAD!');
  const [bannerSubtitle, setBannerSubtitle] = useState('Aprende a reparar tu crédito e impulsa tus finanzas hoy.');
  const [bannerCtaText, setBannerCtaText] = useState('Reservar Cupo Gratis');
  const [bannerBadgeText, setBannerBadgeText] = useState('30% OFF');
  const [bannerBgType, setBannerBgType] = useState<'gradient' | 'image' | 'solid'>('gradient');
  const [bannerBgUrl, setBannerBgUrl] = useState(BANNER_BG_PRESETS[0].url);
  const [unsplashKeyword, setUnsplashKeyword] = useState('');
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);

  // Sincronizar colores cuando cambia la marca o el contenido
  useEffect(() => {
    if (brand) {
      setPrimaryColor(brand.colors.primary);
      setAccentColor(brand.colors.accent);
      setGradientStart(brand.colors.gradientStart);
      setGradientEnd(brand.colors.gradientEnd);
    }
  }, [brand]);

  useEffect(() => {
    setEmailBgColor(content.emailBgColor || '#eef2f6');
    setBodyBgColor(content.bodyBgColor || '#ffffff');
  }, [content]);

  // Contraste calculado en tiempo real
  const contrastPrimaryToBody = getContrastRatio(primaryColor, bodyBgColor);
  const contrastTextToBody = getContrastRatio(textColor, bodyBgColor);
  const contrastCtaTextToAccent = getContrastRatio('#ffffff', accentColor); // Botón CTA fondo vs texto blanco
  const contrastCtaTextToAccentBlack = getContrastRatio('#000000', accentColor); // Botón CTA fondo vs texto negro

  const isPrimaryReadable = contrastPrimaryToBody >= 4.5;
  const isTextReadable = contrastTextToBody >= 4.5;
  const isCtaReadable = Math.max(contrastCtaTextToAccent, contrastCtaTextToAccentBlack) >= 4.5;

  const handleApplyPalette = (palette: typeof COLOR_PALETTES[0]) => {
    setPrimaryColor(palette.colors.primary);
    setAccentColor(palette.colors.accent);
    setGradientStart(palette.colors.gradientStart);
    setGradientEnd(palette.colors.gradientEnd);
    setEmailBgColor(palette.colors.emailBgColor);
    setBodyBgColor(palette.colors.bodyBgColor);
  };

  const handleApplyColors = () => {
    onUpdateColors({
      brandColors: {
        primary: primaryColor,
        accent: accentColor,
        gradientStart: gradientStart,
        gradientEnd: gradientEnd,
      },
      contentColors: {
        emailBgColor: emailBgColor,
        bodyBgColor: bodyBgColor,
      }
    });
  };

  const handleAutoFixContrast = () => {
    // Corregir texto primario (títulos) vs fondo de cuerpo
    if (contrastPrimaryToBody < 4.5) {
      const fixedPrimary = adjustContrast(primaryColor, bodyBgColor, 4.5);
      setPrimaryColor(fixedPrimary);
    }
    // Corregir color de texto del cuerpo vs fondo de cuerpo
    if (contrastTextToBody < 4.5) {
      const fixedText = adjustContrast(textColor, bodyBgColor, 4.5);
      setTextColor(fixedText);
    }
  };

  // === RENDERIZACIÓN DEL BANNER CANVAS ===
  const drawBanner = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensiones de diseño
    const width = 1200;
    const height = 800;
    canvas.width = width;
    canvas.height = height;

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    const renderTextAndDecorations = () => {
      // Dibujar overlay sutil (círculos abstractos decorativos de la marca)
      if (bannerBgType !== 'image') {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        ctx.arc(width - 200, 150, 400, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(100, height - 100, 300, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dibujar contenidos basados en Layout
      if (bannerLayout === 'promo') {
        // Título del banner
        ctx.fillStyle = primaryColor;
        ctx.font = '800 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bannerTitle, width / 2, height / 2 - 80);

        // Subtítulo
        ctx.fillStyle = getRelativeLuminance(bodyBgColor) < 0.5 ? '#e4e4e7' : '#4b5563';
        ctx.font = '500 28px sans-serif';
        ctx.fillText(bannerSubtitle, width / 2, height / 2 - 10);

        // Botón CTA falso
        const btnWidth = 440;
        const btnHeight = 84;
        const btnX = (width - btnWidth) / 2;
        const btnY = height / 2 + 80;
        const btnRadius = 14;

        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnWidth, btnHeight, btnRadius);
        ctx.fill();

        // Texto del botón CTA falso
        const useBlackText = getContrastRatio('#000000', accentColor) > getContrastRatio('#ffffff', accentColor);
        ctx.fillStyle = useBlackText ? '#000000' : '#ffffff';
        ctx.font = '700 26px sans-serif';
        ctx.fillText(bannerCtaText, width / 2, btnY + 52);
      } 
      else if (bannerLayout === 'minimal') {
        // Estilo sofisticado asimétrico
        ctx.textAlign = 'left';
        
        // Brand tag
        ctx.fillStyle = accentColor;
        ctx.font = '800 24px sans-serif';
        ctx.fillText((brand?.name || 'AD MEDIA').toUpperCase(), 120, 180);

        // Título
        ctx.fillStyle = primaryColor;
        ctx.font = '800 64px sans-serif';
        const words = bannerTitle.split(' ');
        let line = '';
        let y = 280;
        for (let n = 0; n < words.length; n++) {
          let testLine = line + words[n] + ' ';
          let metrics = ctx.measureText(testLine);
          if (metrics.width > 900 && n > 0) {
            ctx.fillText(line, 120, y);
            line = words[n] + ' ';
            y += 80;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 120, y);

        // Subtítulo
        ctx.fillStyle = getRelativeLuminance(bodyBgColor) < 0.5 ? '#d4d4d8' : '#6b7280';
        ctx.font = '500 28px sans-serif';
        ctx.fillText(bannerSubtitle, 120, y + 80);

        // Flecha o elemento sutil abajo
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(120, y + 160);
        ctx.lineTo(240, y + 160);
        ctx.lineTo(220, y + 150);
        ctx.moveTo(240, y + 160);
        ctx.lineTo(220, y + 170);
        ctx.stroke();
      } 
      else if (bannerLayout === 'coupon') {
        // Layout de cupón o descuento
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 4;
        ctx.setLineDash([15, 10]);
        ctx.strokeRect(40, 40, width - 80, height - 80);
        ctx.setLineDash([]); // Reset

        // Badge de descuento
        ctx.fillStyle = accentColor;
        ctx.font = '900 120px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bannerBadgeText, width / 2, height / 2 - 60);

        // Título
        ctx.fillStyle = primaryColor;
        ctx.font = '800 42px sans-serif';
        ctx.fillText(bannerTitle, width / 2, height / 2 + 50);

        // Subtítulo
        ctx.fillStyle = getRelativeLuminance(bodyBgColor) < 0.5 ? '#a1a1aa' : '#4b5563';
        ctx.font = '500 24px sans-serif';
        ctx.fillText(bannerSubtitle, width / 2, height / 2 + 110);

        // Botón
        const btnWidth = 320;
        const btnHeight = 64;
        const btnX = (width - btnWidth) / 2;
        const btnY = height / 2 + 170;
        
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 8);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 20px sans-serif';
        ctx.fillText(bannerCtaText, width / 2, btnY + 40);
      }
    };

    // 1. Fondo de Banner
    if (bannerBgType === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, gradientStart);
      grad.addColorStop(1, gradientEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      renderTextAndDecorations();
    } 
    else if (bannerBgType === 'solid') {
      ctx.fillStyle = bodyBgColor;
      ctx.fillRect(0, 0, width, height);
      renderTextAndDecorations();
    } 
    else if (bannerBgType === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let drawWidth = width;
        let drawHeight = height;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > canvasRatio) {
          drawWidth = height * imgRatio;
          offsetX = (width - drawWidth) / 2;
        } else {
          drawHeight = width / imgRatio;
          offsetY = (height - drawHeight) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Capa de Overlay oscuro traslúcido para legibilidad
        ctx.fillStyle = `rgba(15, 23, 42, ${overlayOpacity})`;
        ctx.fillRect(0, 0, width, height);

        renderTextAndDecorations();
      };
      img.src = bannerBgUrl;
    }
  }, [
    bannerLayout, bannerTitle, bannerSubtitle, bannerCtaText, bannerBadgeText, 
    bannerBgType, bannerBgUrl, primaryColor, accentColor, gradientStart, 
    gradientEnd, bodyBgColor, overlayOpacity, brand
  ]);

  // Dibujar cada vez que cambian las configuraciones del banner
  useEffect(() => {
    if (activeTab === 'banners' && isOpen) {
      const timer = setTimeout(() => drawBanner(), 80);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isOpen, drawBanner]);

  const handleSearchUnsplash = () => {
    if (!unsplashKeyword.trim()) return;
    const randomId = Math.floor(Math.random() * 10000);
    const searchUrl = `https://images.unsplash.com/featured/1200x800/?${encodeURIComponent(unsplashKeyword)}&sig=${randomId}`;
    setBannerBgUrl(searchUrl);
    setBannerBgType('image');
  };

  const handleSaveAndInjectBanner = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsGeneratingBanner(true);

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });

      if (!blob) {
        throw new Error('No se pudo generar la imagen del canvas');
      }

      const filename = `adset_${Date.now()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      const asset = await uploadAsset(file, brandId, { 
        kind: 'tile', 
        altText: bannerTitle || 'Banner Adset generado' 
      });

      onInjectAdset(asset.url);
      onClose();
    } catch (err) {
      console.error('Error al generar y subir adset:', err);
      alert('Hubo un error al generar y guardar el adset promocional.');
    } finally {
      setIsGeneratingBanner(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="glass-shell" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          width: '95vw', 
          maxWidth: '1200px', 
          maxHeight: '90vh',
          display: 'flex', 
          flexDirection: 'column', 
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}
      >
        <div className="glass-core" style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Palette size={20} className="text-accent" /> Asistente de Diseño e Inteligencia Visual
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Genera paletas con contraste de legibilidad verificado y diseña adsets coordinados para tus correos.
              </p>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar modal" style={{ width: 34, height: 34 }}>
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'colors' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('colors')}
              style={{ borderRadius: 100, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Sliders size={14} /> Paletas y Legibilidad
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'banners' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('banners')}
              style={{ borderRadius: 100, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ImageIcon size={14} /> Creador de Adsets / Banners
            </button>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', minHeight: 0 }}>
            
            {/* TAB 1: COLOR PALETTES & CONTRAST */}
            {activeTab === 'colors' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, width: '100%' }}>
                
                {/* Left Side: Curated Palettes & Manual Color Sliders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Curated Presets */}
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5, margin: '0 0 12px' }}>
                      Paletas Premium Curadas
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                      {COLOR_PALETTES.map((palette) => (
                        <div 
                          key={palette.name} 
                          className="glass-shell"
                          style={{ padding: 2, cursor: 'pointer', transition: 'all 0.2s' }}
                          onClick={() => handleApplyPalette(palette)}
                        >
                          <div className="glass-core" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ display: 'flex', gap: 2, borderRadius: 6, overflow: 'hidden', width: 90, height: 36, border: '1px solid var(--border-subtle)' }}>
                              <div style={{ flex: 1, background: palette.colors.emailBgColor }} title="Fondo Email" />
                              <div style={{ flex: 1, background: palette.colors.bodyBgColor }} title="Fondo Body" />
                              <div style={{ flex: 1, background: palette.colors.primary }} title="Primario" />
                              <div style={{ flex: 1, background: palette.colors.accent }} title="Acento" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{palette.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.2 }}>{palette.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Manual Palette Config */}
                  <div className="glass-shell" style={{ padding: 4 }}>
                    <div className="glass-core" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
                        Ajuste Manual de Colores
                      </h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 11 }}>Fondo Email</label>
                          <input type="color" className="form-color-input" value={emailBgColor} onChange={e => setEmailBgColor(e.target.value)} style={{ width: '100%', height: 32 }} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 11 }}>Fondo Cuerpo</label>
                          <input type="color" className="form-color-input" value={bodyBgColor} onChange={e => setBodyBgColor(e.target.value)} style={{ width: '100%', height: 32 }} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 11 }}>Títulos (Primario)</label>
                          <input type="color" className="form-color-input" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: '100%', height: 32 }} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 11 }}>Botón (Acento)</label>
                          <input type="color" className="form-color-input" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: '100%', height: 32 }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 11 }}>Gradiente Start</label>
                          <input type="color" className="form-color-input" value={gradientStart} onChange={e => setGradientStart(e.target.value)} style={{ width: '100%', height: 28 }} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 11 }}>Gradiente End</label>
                          <input type="color" className="form-color-input" value={gradientEnd} onChange={e => setGradientEnd(e.target.value)} style={{ width: '100%', height: 28 }} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Side: WCAG Accessibility Check & Realtime Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* WCAG Contrast Validator */}
                  <div className="glass-shell" style={{ padding: 4 }}>
                    <div className="glass-core" style={{ padding: 16 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Eye size={16} className="text-accent" /> Validador de Accesibilidad WCAG 2.1
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        
                        {/* 1. Títulos Contrast */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 8 }}>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Contraste de Títulos</span>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Color Primario vs Fondo de Cuerpo ({contrastPrimaryToBody.toFixed(1)}:1)</div>
                          </div>
                          {isPrimaryReadable ? (
                            <span style={{ fontSize: 11, color: '#047857', background: 'rgba(52, 211, 153, 0.12)', padding: '4px 8px', borderRadius: 100, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={12} /> Excelente (Pasa AA)
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#b91c1c', background: 'rgba(239, 68, 68, 0.12)', padding: '4px 8px', borderRadius: 100, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={12} /> Contraste Bajo
                            </span>
                          )}
                        </div>

                        {/* 2. Cuerpo Contrast */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 8 }}>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Contraste del Cuerpo</span>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Texto general vs Fondo de Cuerpo ({contrastTextToBody.toFixed(1)}:1)</div>
                          </div>
                          {isTextReadable ? (
                            <span style={{ fontSize: 11, color: '#047857', background: 'rgba(52, 211, 153, 0.12)', padding: '4px 8px', borderRadius: 100, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={12} /> Excelente (Pasa AA)
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#b91c1c', background: 'rgba(239, 68, 68, 0.12)', padding: '4px 8px', borderRadius: 100, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={12} /> Contraste Bajo
                            </span>
                          )}
                        </div>

                        {/* 3. Botones Contrast */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 8 }}>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Contraste de Botón CTA</span>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              Texto vs Fondo de Botón (Blanco: {contrastCtaTextToAccent.toFixed(1)}:1, Negro: {contrastCtaTextToAccentBlack.toFixed(1)}:1)
                            </div>
                          </div>
                          {isCtaReadable ? (
                            <span style={{ fontSize: 11, color: '#047857', background: 'rgba(52, 211, 153, 0.12)', padding: '4px 8px', borderRadius: 100, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={12} /> Legible (Pasa AA)
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#b91c1c', background: 'rgba(239, 68, 68, 0.12)', padding: '4px 8px', borderRadius: 100, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={12} /> Difícil de leer
                            </span>
                          )}
                        </div>

                      </div>

                      {/* Auto Fix Button */}
                      {(!isPrimaryReadable || !isTextReadable) && (
                        <button
                          type="button"
                          className="btn btn-secondary w-full group"
                          onClick={handleAutoFixContrast}
                          style={{ marginTop: 14, background: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.2)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <Sparkles size={14} className="text-accent" /> Autocorregir Contraste (Oscurecer Textos)
                        </button>
                      )}

                    </div>
                  </div>

                  {/* Micro Preview Box */}
                  <div className="glass-shell" style={{ padding: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="glass-core" style={{ padding: 16, background: emailBgColor, flex: 1, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                      
                      {/* Email representation box */}
                      <div style={{ width: '100%', maxWidth: '280px', background: bodyBgColor, padding: 18, borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 8, transition: 'all 0.3s' }}>
                        <div style={{ height: 2, background: accentColor }} />
                        <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>Etiqueta Superior</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: primaryColor, lineHeight: 1.2 }}>Título del Correo</div>
                        <div style={{ fontSize: 10, color: textColor, lineHeight: 1.4 }}>Este es el texto del correo electrónico que tus clientes leerán. Comprueba la legibilidad real del color aquí mismo.</div>
                        <div style={{ display: 'inline-block', background: accentColor, color: getContrastRatio('#000000', accentColor) > getContrastRatio('#ffffff', accentColor) ? '#000000' : '#ffffff', fontSize: 10, fontWeight: 700, padding: '6px 12px', borderRadius: 4, textAlign: 'center', marginTop: 4 }}>
                          Botón de Acción
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 2: ADSET & BANNER BUILDER */}
            {activeTab === 'banners' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, width: '100%' }}>
                
                {/* Left Side: Design Workspace (Interactive Canvas) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="glass-shell" style={{ padding: 4, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="glass-core" style={{ padding: 8, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', overflow: 'hidden' }}>
                      <canvas 
                        ref={canvasRef} 
                        style={{ 
                          width: '100%', 
                          maxHeight: '360px', 
                          objectFit: 'contain',
                          borderRadius: 8, 
                          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                          border: '1px solid rgba(255,255,255,0.08)' 
                        }} 
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={12} /> Vista previa del banner en alta resolución (1200x800px) lista para correos.
                  </div>
                </div>

                {/* Right Side: Builder Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', paddingRight: 6 }}>
                  
                  {/* Select Layout */}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Layers size={13} /> Estilo de Layout</label>
                    <div style={{ display: 'flex', gap: 6, background: 'var(--bg-primary)', padding: 4, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                      {(['promo', 'minimal', 'coupon'] as const).map(layout => (
                        <button
                          key={layout}
                          type="button"
                          className={`btn btn-sm ${bannerLayout === layout ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setBannerLayout(layout)}
                          style={{ flex: 1, fontSize: 11, textTransform: 'capitalize', borderRadius: 6 }}
                        >
                          {layout === 'promo' ? 'Promocional' : layout === 'minimal' ? 'Minimalista' : 'Cupón'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Banner Content inputs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="form-group">
                      <label htmlFor="banner-title-input" className="form-label"><Type size={13} style={{ display: 'inline', marginRight: 4 }} /> Título Principal</label>
                      <input 
                        id="banner-title-input"
                        className="form-input" 
                        value={bannerTitle} 
                        onChange={e => setBannerTitle(e.target.value)} 
                        placeholder="Ej: ¡ÚLTIMA OPORTUNIDAD!..." 
                        style={{ fontSize: 12 }}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="banner-subtitle-input" className="form-label"><Type size={13} style={{ display: 'inline', marginRight: 4 }} /> Subtítulo descriptivo</label>
                      <textarea 
                        id="banner-subtitle-input"
                        className="form-textarea" 
                        value={bannerSubtitle} 
                        onChange={e => setBannerSubtitle(e.target.value)} 
                        placeholder="Escribe un copy persuasivo..." 
                        rows={2}
                        style={{ fontSize: 12 }}
                      />
                    </div>

                    {bannerLayout === 'coupon' ? (
                      <div className="form-group">
                        <label htmlFor="banner-badge-input" className="form-label"><Type size={13} style={{ display: 'inline', marginRight: 4 }} /> Texto Descuento (Badge)</label>
                        <input 
                          id="banner-badge-input"
                          className="form-input" 
                          value={bannerBadgeText} 
                          onChange={e => setBannerBadgeText(e.target.value)} 
                          placeholder="Ej: 30% OFF o $50" 
                          style={{ fontSize: 12 }}
                        />
                      </div>
                    ) : (
                      <div className="form-group">
                        <label htmlFor="banner-cta-input" className="form-label"><Type size={13} style={{ display: 'inline', marginRight: 4 }} /> Texto del Botón</label>
                        <input 
                          id="banner-cta-input"
                          className="form-input" 
                          value={bannerCtaText} 
                          onChange={e => setBannerCtaText(e.target.value)} 
                          placeholder="Ej: Reservar Cupo Gratis" 
                          style={{ fontSize: 12 }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Background configuration */}
                  <div className="glass-shell" style={{ padding: 4 }}>
                    <div className="glass-core" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Fondo del Banner</label>
                        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-primary)', padding: 3, borderRadius: 6 }}>
                          {(['gradient', 'solid', 'image'] as const).map(bgType => (
                            <button
                              key={bgType}
                              type="button"
                              className={`btn btn-sm ${bannerBgType === bgType ? 'btn-secondary' : 'btn-ghost'}`}
                              onClick={() => setBannerBgType(bgType)}
                              style={{ flex: 1, fontSize: 10, padding: '3px 6px', textTransform: 'capitalize' }}
                            >
                              {bgType === 'gradient' ? 'Gradiente' : bgType === 'solid' ? 'Sólido' : 'Imagen'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {bannerBgType === 'image' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                          
                          {/* Stock image search */}
                          <div className="form-group">
                            <label htmlFor="unsplash-search" className="form-label" style={{ fontSize: 10 }}>Buscar Imagen en Unsplash</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input
                                id="unsplash-search"
                                className="form-input"
                                placeholder="Ej: credit, house, finance..."
                                value={unsplashKeyword}
                                onChange={e => setUnsplashKeyword(e.target.value)}
                                style={{ fontSize: 11, padding: '6px 8px', flex: 1 }}
                              />
                              <button 
                                type="button" 
                                className="btn btn-secondary btn-sm" 
                                onClick={handleSearchUnsplash}
                                style={{ padding: '6px 10px', fontSize: 11 }}
                              >
                                Buscar
                              </button>
                            </div>
                          </div>

                          {/* Presets images */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>O selecciona una curada:</span>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {BANNER_BG_PRESETS.map((p) => (
                                <button
                                  key={p.name}
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={() => setBannerBgUrl(p.url)}
                                  style={{ 
                                    fontSize: 9, 
                                    padding: '4px 6px', 
                                    background: bannerBgUrl === p.url ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                                    borderColor: bannerBgUrl === p.url ? 'var(--accent)' : 'transparent',
                                    borderWidth: 1,
                                    borderStyle: 'solid'
                                  }}
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Image opacity overlay slider */}
                          <div className="form-group" style={{ margin: '4px 0 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
                              <label htmlFor="overlay-opacity-range">Oscurecer Fondo (Overlay)</label>
                              <span style={{ fontFamily: 'monospace' }}>{Math.round(overlayOpacity * 100)}%</span>
                            </div>
                            <input
                              id="overlay-opacity-range"
                              type="range"
                              min="0"
                              max="0.95"
                              step="0.05"
                              value={overlayOpacity}
                              onChange={e => setOverlayOpacity(parseFloat(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--accent)' }}
                            />
                          </div>

                        </div>
                      )}

                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={isGeneratingBanner}>
              Cancelar
            </button>
            
            {activeTab === 'colors' ? (
              <button className="btn btn-primary" onClick={handleApplyColors}>
                Aplicar Paleta al Email
              </button>
            ) : (
              <button 
                className="btn btn-primary group" 
                onClick={handleSaveAndInjectBanner} 
                disabled={isGeneratingBanner}
                style={{ minWidth: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {isGeneratingBanner ? (
                  <>
                    <RefreshCw size={14} className="spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Guardar e Inyectar Adset
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
