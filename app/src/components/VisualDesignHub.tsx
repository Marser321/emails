'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Palette, CheckCircle2, AlertTriangle, X, Sparkles, Image as ImageIcon,
  RefreshCw, Check, Eye, Sliders, Type, Layers
} from 'lucide-react';
import { Brand, EmailContent } from '@/lib/types';
import { uploadAsset } from '@/lib/assets';

interface VisualDesignHubProps {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand | null;
  content: EmailContent;
  onUpdateColors: (updates: { 
    contentColors: { primaryColor: string; accentColor: string; gradientStart: string; gradientEnd: string; emailBgColor: string; bodyBgColor: string; bodyTextColor: string };
  }) => void;
  onSaveBrandColors?: (colors: { primary: string; accent: string; gradientStart: string; gradientEnd: string }) => void;
  onInjectAdset: (imageUrl: string) => void;
  brandId: string;
  initialTab?: 'colors' | 'banners';
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

// Formatos de banner: el canvas y el PNG exportado usan estas dimensiones
const BANNER_FORMATS = {
  panoramic: { width: 1200, height: 600, label: 'Panorámico', hint: '1200×600' },
  standard: { width: 1200, height: 800, label: 'Estándar', hint: '1200×800' },
  square: { width: 1080, height: 1080, label: 'Cuadrado', hint: '1080×1080' },
} as const;
type BannerFormat = keyof typeof BANNER_FORMATS;

// Elementos interactivos del banner (clic para seleccionar, arrastrar para mover)
type BannerElementId = 'title' | 'subtitle' | 'cta' | 'badge' | 'brandTag';

const ELEMENT_LABELS: Record<BannerElementId, string> = {
  title: 'Título', subtitle: 'Subtítulo', cta: 'Botón CTA', badge: 'Badge de descuento', brandTag: 'Etiqueta de marca',
};

// Rango de tamaño de fuente permitido por elemento
const FONT_LIMITS: Record<BannerElementId, [number, number]> = {
  title: [24, 120], subtitle: [16, 48], cta: [14, 40], badge: [60, 180], brandTag: [14, 40],
};

interface ElementStyle {
  dx: number;
  dy: number;
  fontSize?: number;
  btnWidth?: number;  // solo 'cta'
  btnHeight?: number; // solo 'cta'
  btnRadius?: number; // solo 'cta'
}

interface ElementBox { id: BannerElementId; x: number; y: number; w: number; h: number }

// Offsets/tamaños por elemento, agrupados por `${layout}:${formato}`
type StyleMap = Record<string, Partial<Record<BannerElementId, ElementStyle>>>;

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
  brandId,
  onSaveBrandColors,
  initialTab = 'colors',
}: VisualDesignHubProps) {
  const [activeTab, setActiveTab] = useState<'colors' | 'banners'>(initialTab);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // === COLOR STATES ===
  const [primaryColor, setPrimaryColor] = useState(content.primaryColor || brand?.colors.primary || '#0B2A4A');
  const [accentColor, setAccentColor] = useState(content.accentColor || brand?.colors.accent || '#29ABE2');
  const [gradientStart, setGradientStart] = useState(content.gradientStart || brand?.colors.gradientStart || '#29ABE2');
  const [gradientEnd, setGradientEnd] = useState(content.gradientEnd || brand?.colors.gradientEnd || '#1B6FC4');
  const [emailBgColor, setEmailBgColor] = useState(content.emailBgColor || '#eef2f6');
  const [bodyBgColor, setBodyBgColor] = useState(content.bodyBgColor || '#ffffff');
  const [textColor, setTextColor] = useState(content.typography?.bodyColor || '#4a5568');

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

  // === CANVAS INTERACTIVO ===
  const [bannerFormat, setBannerFormat] = useState<BannerFormat>('standard');
  const [elementStyles, setElementStyles] = useState<StyleMap>({});
  const [selectedElement, setSelectedElement] = useState<BannerElementId | null>(null);
  const hitBoxesRef = useRef<ElementBox[]>([]);
  const dragRef = useRef<{
    id: BannerElementId; startX: number; startY: number;
    origDx: number; origDy: number; startCenterX: number; startCenterY: number;
  } | null>(null);
  const bgImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const drawBannerRef = useRef<() => void>(() => {});

  const styleKey = `${bannerLayout}:${bannerFormat}`;

  const updateElementStyle = (id: BannerElementId, patch: Partial<ElementStyle>) => {
    setElementStyles(prev => {
      const group = prev[styleKey] ?? {};
      const current = group[id] ?? { dx: 0, dy: 0 };
      return { ...prev, [styleKey]: { ...group, [id]: { ...current, ...patch } } };
    });
  };

  const resetElementStyle = (id: BannerElementId) => {
    setElementStyles(prev => {
      const group = { ...(prev[styleKey] ?? {}) };
      delete group[id];
      return { ...prev, [styleKey]: group };
    });
  };

  // Sincronizar colores cuando cambia la marca o el contenido (ajuste durante render,
  // ver react.dev "adjusting state when a prop changes")
  const [prevBrand, setPrevBrand] = useState(brand);
  if (brand !== prevBrand) {
    setPrevBrand(brand);
    if (brand) {
      setPrimaryColor(brand.colors.primary);
      setAccentColor(brand.colors.accent);
      setGradientStart(brand.colors.gradientStart);
      setGradientEnd(brand.colors.gradientEnd);
    }
  }

  const [prevContent, setPrevContent] = useState(content);
  if (content !== prevContent) {
    setPrevContent(content);
    setEmailBgColor(content.emailBgColor || '#eef2f6');
    setBodyBgColor(content.bodyBgColor || '#ffffff');
    setTextColor(content.typography?.bodyColor || '#4a5568');
    setPrimaryColor(content.primaryColor || brand?.colors.primary || '#0B2A4A');
    setAccentColor(content.accentColor || brand?.colors.accent || '#29ABE2');
    setGradientStart(content.gradientStart || brand?.colors.gradientStart || '#29ABE2');
    setGradientEnd(content.gradientEnd || brand?.colors.gradientEnd || '#1B6FC4');
  }

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
      contentColors: {
        primaryColor, accentColor, gradientStart, gradientEnd, emailBgColor, bodyBgColor, bodyTextColor: textColor,
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
  const drawBanner = useCallback((opts?: { forExport?: boolean }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensiones según formato seleccionado
    const { width, height } = BANNER_FORMATS[bannerFormat];
    canvas.width = width;
    canvas.height = height;

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    // Offsets/tamaños por elemento para este layout+formato
    const styles = elementStyles[styleKey] ?? {};
    const off = (id: BannerElementId): ElementStyle => ({ dx: 0, dy: 0, ...styles[id] });

    // Cajas de hit-testing registradas durante el dibujo
    const boxes: ElementBox[] = [];
    const registerText = (id: BannerElementId, drawX: number, baselineY: number, fontPx: number, text: string, align: 'center' | 'left') => {
      const m = ctx.measureText(text);
      const ascent = m.actualBoundingBoxAscent || fontPx * 0.8;
      const descent = m.actualBoundingBoxDescent || fontPx * 0.25;
      const x = align === 'center' ? drawX - m.width / 2 : drawX;
      boxes.push({ id, x, y: baselineY - ascent, w: m.width, h: ascent + descent });
    };

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

      // Dibujar contenidos basados en Layout (posiciones proporcionales al formato)
      if (bannerLayout === 'promo') {
        // Título del banner
        const t = off('title');
        const titleFs = t.fontSize ?? 48;
        ctx.fillStyle = primaryColor;
        ctx.font = `800 ${titleFs}px sans-serif`;
        ctx.textAlign = 'center';
        const titleX = width / 2 + t.dx;
        const titleY = height * 0.4 + t.dy;
        ctx.fillText(bannerTitle, titleX, titleY);
        registerText('title', titleX, titleY, titleFs, bannerTitle, 'center');

        // Subtítulo
        const s = off('subtitle');
        const subFs = s.fontSize ?? 28;
        ctx.fillStyle = getRelativeLuminance(bodyBgColor) < 0.5 ? '#e4e4e7' : '#4b5563';
        ctx.font = `500 ${subFs}px sans-serif`;
        const subX = width / 2 + s.dx;
        const subY = height * 0.4875 + s.dy;
        ctx.fillText(bannerSubtitle, subX, subY);
        registerText('subtitle', subX, subY, subFs, bannerSubtitle, 'center');

        // Botón CTA falso
        const c = off('cta');
        const btnWidth = c.btnWidth ?? 440;
        const btnHeight = c.btnHeight ?? 84;
        const btnRadius = c.btnRadius ?? 14;
        const btnX = (width - btnWidth) / 2 + c.dx;
        const btnY = height * 0.6 + c.dy;

        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnWidth, btnHeight, btnRadius);
        ctx.fill();

        // Texto del botón CTA falso
        const useBlackText = getContrastRatio('#000000', accentColor) > getContrastRatio('#ffffff', accentColor);
        ctx.fillStyle = useBlackText ? '#000000' : '#ffffff';
        const ctaFs = c.fontSize ?? 26;
        ctx.font = `700 ${ctaFs}px sans-serif`;
        ctx.fillText(bannerCtaText, btnX + btnWidth / 2, btnY + btnHeight / 2 + ctaFs * 0.35);
        boxes.push({ id: 'cta', x: btnX, y: btnY, w: btnWidth, h: btnHeight });
      }
      else if (bannerLayout === 'minimal') {
        // Estilo sofisticado asimétrico
        ctx.textAlign = 'left';
        const marginX = Math.round(width * 0.1);

        // Brand tag
        const bt = off('brandTag');
        const btFs = bt.fontSize ?? 24;
        ctx.fillStyle = accentColor;
        ctx.font = `800 ${btFs}px sans-serif`;
        const brandText = (brand?.name || 'AD MEDIA').toUpperCase();
        const btX = marginX + bt.dx;
        const btY = height * 0.225 + bt.dy;
        ctx.fillText(brandText, btX, btY);
        registerText('brandTag', btX, btY, btFs, brandText, 'left');

        // Título (multilínea con wrap proporcional)
        const t = off('title');
        const titleFs = t.fontSize ?? 64;
        const lineStep = Math.round(titleFs * 1.25);
        ctx.fillStyle = primaryColor;
        ctx.font = `800 ${titleFs}px sans-serif`;
        const words = bannerTitle.split(' ');
        const titleX = marginX + t.dx;
        let line = '';
        let y = Math.round(height * 0.35) + t.dy;
        const firstLineY = y;
        let maxLineWidth = 0;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > width * 0.75 && n > 0) {
            ctx.fillText(line, titleX, y);
            maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
            line = words[n] + ' ';
            y += lineStep;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, titleX, y);
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
        boxes.push({ id: 'title', x: titleX, y: firstLineY - titleFs * 0.8, w: maxLineWidth, h: (y - firstLineY) + titleFs * 1.05 });

        // Subtítulo
        const s = off('subtitle');
        const subFs = s.fontSize ?? 28;
        ctx.fillStyle = getRelativeLuminance(bodyBgColor) < 0.5 ? '#d4d4d8' : '#6b7280';
        ctx.font = `500 ${subFs}px sans-serif`;
        const subX = marginX + s.dx;
        const subY = y + Math.round(titleFs * 1.25) + s.dy;
        ctx.fillText(bannerSubtitle, subX, subY);
        registerText('subtitle', subX, subY, subFs, bannerSubtitle, 'left');

        // Flecha o elemento sutil abajo (decorativa, no interactiva)
        const arrowY = subY + Math.round(titleFs * 1.25);
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(marginX, arrowY);
        ctx.lineTo(marginX + 120, arrowY);
        ctx.lineTo(marginX + 100, arrowY - 10);
        ctx.moveTo(marginX + 120, arrowY);
        ctx.lineTo(marginX + 100, arrowY + 10);
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
        const b = off('badge');
        const badgeFs = b.fontSize ?? 120;
        ctx.fillStyle = accentColor;
        ctx.font = `900 ${badgeFs}px sans-serif`;
        ctx.textAlign = 'center';
        const badgeX = width / 2 + b.dx;
        const badgeY = height * 0.425 + b.dy;
        ctx.fillText(bannerBadgeText, badgeX, badgeY);
        registerText('badge', badgeX, badgeY, badgeFs, bannerBadgeText, 'center');

        // Título
        const t = off('title');
        const titleFs = t.fontSize ?? 42;
        ctx.fillStyle = primaryColor;
        ctx.font = `800 ${titleFs}px sans-serif`;
        const titleX = width / 2 + t.dx;
        const titleY = height * 0.5625 + t.dy;
        ctx.fillText(bannerTitle, titleX, titleY);
        registerText('title', titleX, titleY, titleFs, bannerTitle, 'center');

        // Subtítulo
        const s = off('subtitle');
        const subFs = s.fontSize ?? 24;
        ctx.fillStyle = getRelativeLuminance(bodyBgColor) < 0.5 ? '#a1a1aa' : '#4b5563';
        ctx.font = `500 ${subFs}px sans-serif`;
        const subX = width / 2 + s.dx;
        const subY = height * 0.6375 + s.dy;
        ctx.fillText(bannerSubtitle, subX, subY);
        registerText('subtitle', subX, subY, subFs, bannerSubtitle, 'center');

        // Botón
        const c = off('cta');
        const btnWidth = c.btnWidth ?? 320;
        const btnHeight = c.btnHeight ?? 64;
        const btnRadius = c.btnRadius ?? 8;
        const btnX = (width - btnWidth) / 2 + c.dx;
        const btnY = height * 0.7125 + c.dy;

        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnWidth, btnHeight, btnRadius);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        const ctaFs = c.fontSize ?? 20;
        ctx.font = `700 ${ctaFs}px sans-serif`;
        ctx.fillText(bannerCtaText, btnX + btnWidth / 2, btnY + btnHeight / 2 + ctaFs * 0.35);
        boxes.push({ id: 'cta', x: btnX, y: btnY, w: btnWidth, h: btnHeight });
      }
    };

    const drawOverlaysAndFinish = () => {
      hitBoxesRef.current = boxes;
      if (opts?.forExport) return;
      // Outline del elemento seleccionado
      if (selectedElement) {
        const box = boxes.find(bx => bx.id === selectedElement);
        if (box) {
          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(box.x - 8, box.y - 8, box.w + 16, box.h + 16);
          ctx.restore();
        }
      }
      // Guía de centrado durante el drag
      if (dragRef.current) {
        const box = boxes.find(bx => bx.id === dragRef.current!.id);
        if (box && Math.abs(box.x + box.w / 2 - width / 2) < 2) {
          ctx.save();
          ctx.setLineDash([8, 8]);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(width / 2, 0);
          ctx.lineTo(width / 2, height);
          ctx.stroke();
          ctx.restore();
        }
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
      drawOverlaysAndFinish();
    }
    else if (bannerBgType === 'solid') {
      ctx.fillStyle = bodyBgColor;
      ctx.fillRect(0, 0, width, height);
      renderTextAndDecorations();
      drawOverlaysAndFinish();
    }
    else if (bannerBgType === 'image') {
      // Caché sincrónico: evita flicker en drag y permite exportar sin esperar onload
      const drawCover = (img: HTMLImageElement) => {
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
      };

      const cached = bgImageCacheRef.current.get(bannerBgUrl);
      if (cached && cached.complete && cached.naturalWidth > 0) {
        drawCover(cached);
      } else {
        if (!cached) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => drawBannerRef.current();
          img.src = bannerBgUrl;
          bgImageCacheRef.current.set(bannerBgUrl, img);
        }
        // Placeholder oscuro mientras carga la imagen
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, width, height);
      }
      renderTextAndDecorations();
      drawOverlaysAndFinish();
    }
  }, [
    bannerLayout, bannerTitle, bannerSubtitle, bannerCtaText, bannerBadgeText,
    bannerBgType, bannerBgUrl, primaryColor, accentColor, gradientStart,
    gradientEnd, bodyBgColor, overlayOpacity, brand,
    bannerFormat, elementStyles, selectedElement, styleKey,
  ]);

  // Referencia siempre actualizada (para el onload del fondo de imagen)
  useEffect(() => {
    drawBannerRef.current = () => drawBanner();
  }, [drawBanner]);

  // Dibujar cada vez que cambian las configuraciones del banner (sin debounce: el drag necesita redraw inmediato)
  useEffect(() => {
    if (activeTab === 'banners' && isOpen) {
      drawBanner();
    }
  }, [activeTab, isOpen, drawBanner]);

  // === INTERACCIÓN CON EL CANVAS (clic + drag) ===
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: -1, y: -1 };
    const rect = canvas.getBoundingClientRect();
    // Compensar letterboxing de object-fit: contain
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const offX = (rect.width - canvas.width * scale) / 2;
    const offY = (rect.height - canvas.height * scale) / 2;
    return { x: (e.clientX - rect.left - offX) / scale, y: (e.clientY - rect.top - offY) / scale };
  };

  const hitTest = (x: number, y: number): ElementBox | null => {
    // En reversa: lo último dibujado queda arriba
    for (let i = hitBoxesRef.current.length - 1; i >= 0; i--) {
      const b = hitBoxesRef.current[i];
      if (x >= b.x - 8 && x <= b.x + b.w + 8 && y >= b.y - 8 && y <= b.y + b.h + 8) return b;
    }
    return null;
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPoint(e);
    const hit = hitTest(x, y);
    if (hit) {
      setSelectedElement(hit.id);
      const st = elementStyles[styleKey]?.[hit.id] ?? { dx: 0, dy: 0 };
      dragRef.current = {
        id: hit.id, startX: x, startY: y, origDx: st.dx, origDy: st.dy,
        startCenterX: hit.x + hit.w / 2, startCenterY: hit.y + hit.h / 2,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // eventos sintéticos o pointers ya liberados no soportan captura
      }
    } else {
      setSelectedElement(null);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPoint(e);
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) {
      e.currentTarget.style.cursor = hitTest(x, y) ? 'move' : 'default';
      return;
    }
    let dx = drag.origDx + (x - drag.startX);
    let dy = drag.origDy + (y - drag.startY);
    // Snap horizontal al centro del banner
    const centerX = drag.startCenterX + (dx - drag.origDx);
    if (Math.abs(centerX - canvas.width / 2) < 12) {
      dx = drag.origDx + (canvas.width / 2 - drag.startCenterX);
    }
    // Clamp: el centro del elemento no sale del lienzo (margen 40px)
    const cX = drag.startCenterX + (dx - drag.origDx);
    const cY = drag.startCenterY + (dy - drag.origDy);
    if (cX < 40) dx += 40 - cX;
    if (cX > canvas.width - 40) dx -= cX - (canvas.width - 40);
    if (cY < 40) dy += 40 - cY;
    if (cY > canvas.height - 40) dy -= cY - (canvas.height - 40);
    updateElementStyle(drag.id, { dx: Math.round(dx), dy: Math.round(dy) });
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // el pointer pudo no estar capturado
    }
  };

  // Al seleccionar un elemento, resaltar su input de texto en el panel
  useEffect(() => {
    if (!selectedElement) return;
    const inputId = selectedElement === 'title' ? 'banner-title-input'
      : selectedElement === 'subtitle' ? 'banner-subtitle-input'
      : selectedElement === 'cta' ? 'banner-cta-input'
      : selectedElement === 'badge' ? 'banner-badge-input'
      : null;
    if (!inputId) return;
    const el = document.getElementById(inputId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      el.style.outline = '2px dashed var(--accent)';
      const timer = setTimeout(() => { el.style.outline = ''; }, 1200);
      return () => clearTimeout(timer);
    }
  }, [selectedElement]);

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
    if (bannerBgType === 'image') {
      const cached = bgImageCacheRef.current.get(bannerBgUrl);
      if (!cached || !cached.complete || cached.naturalWidth === 0) {
        alert('La imagen de fondo todavía se está cargando — esperá un segundo y volvé a intentar.');
        return;
      }
    }
    setIsGeneratingBanner(true);

    try {
      // Redibujar sin outline de selección ni guías antes de exportar
      drawBanner({ forExport: true });
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
      // Restaurar la vista interactiva (outline de selección)
      drawBanner();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay design-hub-overlay" onClick={onClose}>
      <div 
        className="glass-shell design-hub-dialog"
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
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 11 }}>Texto del cuerpo</label>
                          <input type="color" className="form-color-input" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: '100%', height: 32 }} />
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
                    <div className="glass-core" style={{ padding: 8, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                      <canvas
                        ref={canvasRef}
                        onPointerDown={handleCanvasPointerDown}
                        onPointerMove={handleCanvasPointerMove}
                        onPointerUp={handleCanvasPointerUp}
                        onPointerCancel={handleCanvasPointerUp}
                        style={{
                          width: '100%',
                          maxHeight: bannerFormat === 'square' ? '420px' : '360px',
                          objectFit: 'contain',
                          borderRadius: 8,
                          boxShadow: 'var(--shadow-md)',
                          border: '1px solid var(--border-subtle)',
                          touchAction: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={12} /> Banner {BANNER_FORMATS[bannerFormat].hint}px · Hacé clic en un elemento para seleccionarlo y arrastralo para moverlo.
                  </div>
                </div>

                {/* Right Side: Builder Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', paddingRight: 6 }}>

                  {/* Panel contextual del elemento seleccionado */}
                  {selectedElement && (() => {
                    const st: ElementStyle = { dx: 0, dy: 0, ...elementStyles[styleKey]?.[selectedElement] };
                    const [fsMin, fsMax] = FONT_LIMITS[selectedElement];
                    const canvasEl = canvasRef.current;
                    const handleCenterH = () => {
                      const box = hitBoxesRef.current.find(b => b.id === selectedElement);
                      if (box && canvasEl) {
                        updateElementStyle(selectedElement, { dx: Math.round(st.dx + canvasEl.width / 2 - (box.x + box.w / 2)) });
                      }
                    };
                    return (
                      <div className="glass-shell" style={{ padding: 4, border: '1px solid var(--border-accent)' }}>
                        <div className="glass-core" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-accent)' }}>
                              🎯 {ELEMENT_LABELS[selectedElement]}
                            </span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => resetElementStyle(selectedElement)} title="Volver a la posición y tamaño original" style={{ fontSize: 10, padding: '2px 8px', height: 'auto' }}>
                                ↺ Reset
                              </button>
                              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setSelectedElement(null)} aria-label="Deseleccionar" style={{ width: 24, height: 24 }}>
                                <X size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Tamaño de fuente */}
                          <div className="form-group" style={{ margin: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
                              <label>Tamaño de fuente</label>
                              <span style={{ fontFamily: 'monospace' }}>{st.fontSize ?? '—'}px</span>
                            </div>
                            <input
                              type="range"
                              min={fsMin}
                              max={fsMax}
                              value={st.fontSize ?? Math.round((fsMin + fsMax) / 2)}
                              onChange={e => updateElementStyle(selectedElement, { fontSize: parseInt(e.target.value) || undefined })}
                              style={{ width: '100%', accentColor: 'var(--accent)' }}
                            />
                          </div>

                          {/* Posición */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: 10 }}>Offset X</label>
                              <input type="number" className="form-input" value={st.dx} onChange={e => { const v = parseInt(e.target.value); if (!Number.isNaN(v)) updateElementStyle(selectedElement, { dx: v }); }} style={{ fontSize: 11, padding: '4px 8px' }} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: 10 }}>Offset Y</label>
                              <input type="number" className="form-input" value={st.dy} onChange={e => { const v = parseInt(e.target.value); if (!Number.isNaN(v)) updateElementStyle(selectedElement, { dy: v }); }} style={{ fontSize: 11, padding: '4px 8px' }} />
                            </div>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={handleCenterH} title="Centrar horizontalmente" style={{ fontSize: 10, padding: '4px 8px' }}>
                              ⇔ Centrar
                            </button>
                          </div>

                          {/* Controles del botón CTA */}
                          {selectedElement === 'cta' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                              {([
                                { key: 'btnWidth' as const, label: 'Ancho del botón', min: 160, max: 800, fallback: bannerLayout === 'coupon' ? 320 : 440 },
                                { key: 'btnHeight' as const, label: 'Alto del botón', min: 40, max: 160, fallback: bannerLayout === 'coupon' ? 64 : 84 },
                                { key: 'btnRadius' as const, label: 'Radio de esquinas', min: 0, max: 80, fallback: bannerLayout === 'coupon' ? 8 : 14 },
                              ]).map(ctrl => (
                                <div key={ctrl.key} className="form-group" style={{ margin: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
                                    <label>{ctrl.label}</label>
                                    <span style={{ fontFamily: 'monospace' }}>{st[ctrl.key] ?? ctrl.fallback}px</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={ctrl.min}
                                    max={ctrl.max}
                                    value={st[ctrl.key] ?? ctrl.fallback}
                                    onChange={e => { const v = parseInt(e.target.value); if (!Number.isNaN(v)) updateElementStyle(selectedElement, { [ctrl.key]: v }); }}
                                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

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

                  {/* Formato del banner */}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ImageIcon size={13} /> Formato del Banner</label>
                    <div style={{ display: 'flex', gap: 6, background: 'var(--bg-primary)', padding: 4, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                      {(Object.keys(BANNER_FORMATS) as BannerFormat[]).map(format => (
                        <button
                          key={format}
                          type="button"
                          className={`btn btn-sm ${bannerFormat === format ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => { setBannerFormat(format); setSelectedElement(null); }}
                          title={BANNER_FORMATS[format].hint}
                          style={{ flex: 1, fontSize: 11, borderRadius: 6 }}
                        >
                          {BANNER_FORMATS[format].label}
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
              <>
                <button className="btn btn-secondary" onClick={() => onSaveBrandColors?.({ primary: primaryColor, accent: accentColor, gradientStart, gradientEnd })}>
                  Guardar como colores de marca
                </button>
                <button className="btn btn-primary" onClick={handleApplyColors}>Aplicar solo a este email</button>
              </>
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
