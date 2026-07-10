// Types for the Email Builder app

// Motor de IA disponible para generación de textos
export type AIEngine = 'gemini' | 'claude';

// Voz y estilo de la marca — alimenta los prompts de IA (todos opcionales)
export interface BrandVoice {
  toneOfVoice: string;
  audience: string;
  styleNotes: string;
  samplePhrases: string[];
}

export interface BrandColors {
  primary: string;
  accent: string;
  gradientStart: string;
  gradientEnd: string;
  headerBg?: string;
  footerBg?: string;
}

export interface BrandFonts {
  heading: string;
  body: string;
}

export interface BrandLogo {
  type: 'text' | 'image';
  // For text logos: "PART1|PART2" where PART1 is white and PART2 is accent color
  // For image logos: URL of the image (external or local '/api/assets/<brandId>/<file>')
  value: string;
  imageWidth?: number;
  // Show the brand name next to an image logo
  showName?: boolean;
  namePosition?: 'right' | 'below';
}

export interface BrandFooter {
  tagline: string;
  subtitle: string;
  disclaimer: string;
  address?: string;
  unsubscribeLabel?: string;
  unsubscribeUrl?: string;
}

export interface Brand {
  id: string;
  name: string;
  category: string;
  colors: BrandColors;
  fonts: BrandFonts;
  logo: BrandLogo;
  footer: BrandFooter;
  voice?: BrandVoice;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===== Bloques opcionales del email (slots de orden fijo — legacy) =====

export type LayoutVariant = 'classic' | 'minimal' | 'hero' | 'card';

export interface HeroBlock {
  imageUrl: string;
  alt?: string;
  href?: string;
  fullBleed?: boolean;
}

export interface ImageTextBlock {
  imageUrl: string;
  alt?: string;
  title?: string;
  text: string;
  imagePosition: 'left' | 'right';
}

export interface GalleryBlock {
  images: { url: string; alt?: string; href?: string }[];
  columns: 2 | 3;
  caption?: string;
}

export interface QuoteBlock {
  text: string;
  author?: string;
  role?: string;
}

// ===== Bloques modulares del Canvas =====

export type CanvasBlockType =
  | 'header'
  | 'hero'
  | 'text'
  | 'image-text'
  | 'gallery'
  | 'bullets'
  | 'infobox'
  | 'quote'
  | 'cta'
  | 'divider'
  | 'spacer'
  | 'footer';

interface BlockBase {
  id: string;
  type: CanvasBlockType;
}

export interface HeaderBlockConfig extends BlockBase {
  type: 'header';
  // logo & brand name are derived from the Brand; no extra data needed
}

export interface HeroBlockConfig extends BlockBase {
  type: 'hero';
  imageUrl: string;
  alt?: string;
  href?: string;
  fullBleed?: boolean;
}

export interface TextBlockConfig extends BlockBase {
  type: 'text';
  label?: string;
  headline?: string;
  body?: string;
}

export interface ImageTextBlockConfig extends BlockBase {
  type: 'image-text';
  imageUrl: string;
  alt?: string;
  title?: string;
  text: string;
  imagePosition: 'left' | 'right';
}

export interface GalleryBlockConfig extends BlockBase {
  type: 'gallery';
  images: { url: string; alt?: string; href?: string }[];
  columns: 2 | 3;
  caption?: string;
}

export interface BulletsBlockConfig extends BlockBase {
  type: 'bullets';
  bulletsTitle?: string;
  bullets: string[];
}

export interface InfoboxBlockConfig extends BlockBase {
  type: 'infobox';
  eventDate?: string;
  eventTime?: string;
}

export interface QuoteBlockConfig extends BlockBase {
  type: 'quote';
  text: string;
  author?: string;
  role?: string;
}

export interface CtaBlockConfig extends BlockBase {
  type: 'cta';
  ctaText: string;
  ctaUrl: string;
  preCta?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
}

export interface DividerBlockConfig extends BlockBase {
  type: 'divider';
}

export interface SpacerBlockConfig extends BlockBase {
  type: 'spacer';
  height?: number; // px, default 20
}

export interface FooterBlockConfig extends BlockBase {
  type: 'footer';
  footerNote?: string;
  // tagline/disclaimer are derived from Brand
}

export type BlockConfig =
  | HeaderBlockConfig
  | HeroBlockConfig
  | TextBlockConfig
  | ImageTextBlockConfig
  | GalleryBlockConfig
  | BulletsBlockConfig
  | InfoboxBlockConfig
  | QuoteBlockConfig
  | CtaBlockConfig
  | DividerBlockConfig
  | SpacerBlockConfig
  | FooterBlockConfig;

// Metadata for the block palette UI
export const CANVAS_BLOCK_CATALOG: { type: CanvasBlockType; label: string }[] = [
  { type: 'header', label: 'Header' },
  { type: 'hero', label: 'Imagen Hero' },
  { type: 'text', label: 'Texto' },
  { type: 'image-text', label: 'Imagen + Texto' },
  { type: 'gallery', label: 'Galería' },
  { type: 'bullets', label: 'Bullets' },
  { type: 'infobox', label: 'Info Box' },
  { type: 'quote', label: 'Testimonio' },
  { type: 'cta', label: 'Botón CTA' },
  { type: 'divider', label: 'Separador' },
  { type: 'spacer', label: 'Espaciador' },
  { type: 'footer', label: 'Footer' },
];

// Generate a short random ID for canvas blocks
export function generateBlockId(): string {
  return 'blk_' + Math.random().toString(36).substring(2, 9);
}

export interface EmailContent {
  subject?: string;
  preheader?: string;
  label: string;
  headline: string;
  body: string;
  bulletsTitle: string;
  bullets: string[];
  ctaText: string;
  ctaUrl: string;
  eventDate: string;
  eventTime: string;
  preCta: string;
  footerNote: string;
  emailBgColor?: string;
  bodyBgColor?: string;
  textureUrl?: string;
  headerTextureUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  // Bloques opcionales — retro-compatibles con drafts/share-links viejos
  layout?: LayoutVariant;
  hero?: HeroBlock;
  imageText?: ImageTextBlock;
  gallery?: GalleryBlock;
  quote?: QuoteBlock;
  showDividers?: boolean;
  // ===== Canvas modular (v2) =====
  emailWidth?: number;   // Max container width in px (default 600)
  blocks?: BlockConfig[]; // When present, the canvas renderer is used
  compliance?: EmailCompliance;
}

export interface EmailTheme {
  pageBackground: string;
  bodyBackground: string;
  emailWidth: number;
}

export interface EmailCompliance {
  unsubscribeLabel: string;
  unsubscribeUrl: string;
  address: string;
}

export interface EmailDocumentV3 {
  schemaVersion: 3;
  brandId: string;
  template: TemplateType;
  subject: string;
  preheader: string;
  locale: 'es';
  emailWidth: number;
  theme: EmailTheme;
  blocks: BlockConfig[];
  compliance: EmailCompliance;
}

export type TemplateType = 
  | 'masterclass'
  | 'registration'
  | 'followup'
  | 'promo'
  | 'reminder'
  | 'newsletter'
  | 'sales'
  | 'financial_advisory'
  | 'onboarding';

export interface TemplateConfig {
  type: TemplateType;
  name: string;
  description: string;
  defaultContent: Partial<EmailContent>;
  defaultLayout?: LayoutVariant;
}

// Registro del historial de emails generados (data/history/<brandId>.json)
export interface EmailHistoryEntry {
  id: string;
  brandId: string;
  templateType: TemplateType;
  engine: AIEngine;
  model: string;
  prompt: string;
  subject: string;
  content: EmailContent;
  htmlSnapshot: string;
  rating: 'up' | 'down' | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// Borrador guardado en la biblioteca (data/drafts.json)
export interface Draft {
  id: string;
  name: string;
  brandName: string;
  templateName: string;
  content: EmailContent;
  brandId: string;
  template: TemplateType;
  date: string;
}

// Configuración no sensible. Las credenciales solo viven en variables de entorno.
export interface AppSettings {
  defaultEngine: AIEngine;
  assetsPublicBaseUrl?: string;
  migratedFromLocalStorage?: boolean;
}

// Imagen de la biblioteca de assets (Storage + tabla public.assets)
export interface EmailAsset {
  id: string;
  filename: string;
  brandId: string;
  url: string;
  size: number;
  modifiedAt: string;
  kind: 'logo' | 'hero' | 'tile' | 'icon' | 'other';
  altText: string;
  width: number;
  height: number;
  mimeType: string;
  variant: 'email' | 'thumbnail' | 'source';
  createdBy?: string;
  thumbnailUrl?: string;
  author: string;
  createdAt: string;
  sourcePrompt?: string;
  intendedUse?: string;
}

// Default brand for new entries
export const DEFAULT_BRAND: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  category: 'General',
  colors: {
    primary: '#0B2A4A',
    accent: '#29ABE2',
    gradientStart: '#29ABE2',
    gradientEnd: '#1B6FC4',
  },
  fonts: {
    heading: 'Montserrat',
    body: 'Verdana',
  },
  logo: {
    type: 'text',
    value: 'BRAND|NAME',
  },
  footer: {
    tagline: '',
    subtitle: '',
    disclaimer: '',
    address: '{{location.full_address}}',
    unsubscribeLabel: 'Cancelar suscripción',
    unsubscribeUrl: '{{unsubscribe}}',
  },
  isFavorite: false,
};

// Template configurations
export const TEMPLATES: TemplateConfig[] = [
  {
    type: 'masterclass',
    name: 'Masterclass',
    description: 'Invitación a clase en vivo o webinar',
    defaultContent: {
      label: 'Masterclass gratuita',
      bulletsTitle: 'En esta clase vas a descubrir:',
      ctaText: 'Reservar mi lugar',
      preCta: 'Únete para recibir el acceso 👇',
      footerNote: 'Cupos limitados · Reserva tu lugar ahora',
    },
  },
  {
    type: 'registration',
    name: 'Registro',
    description: 'Confirmación de registro o bienvenida',
    defaultContent: {
      label: 'Registro confirmado',
      bulletsTitle: 'Lo que incluye tu registro:',
      ctaText: 'Acceder ahora',
      preCta: 'Tu cuenta está lista 🎉',
      footerNote: 'Gracias por registrarte',
    },
  },
  {
    type: 'followup',
    name: 'Seguimiento',
    description: 'Follow-up post evento o consulta',
    defaultContent: {
      label: 'Seguimiento',
      bulletsTitle: 'Próximos pasos:',
      ctaText: 'Agendar llamada',
      preCta: 'Estamos aquí para ayudarte 💬',
      footerNote: 'Responde a este correo si tienes preguntas',
    },
  },
  {
    type: 'promo',
    name: 'Promoción',
    description: 'Ofertas, descuentos y lanzamientos',
    defaultContent: {
      label: 'Oferta exclusiva',
      bulletsTitle: 'Lo que incluye esta oferta:',
      ctaText: 'Aprovechar ahora',
      preCta: 'No dejes pasar esta oportunidad 🚀',
      footerNote: 'Oferta por tiempo limitado',
    },
  },
  {
    type: 'reminder',
    name: 'Recordatorio',
    description: 'Recordatorio de evento, cita o pago',
    defaultContent: {
      label: 'Recordatorio',
      bulletsTitle: 'Información importante:',
      ctaText: 'Confirmar asistencia',
      preCta: 'No te lo pierdas 📌',
      footerNote: 'Nos vemos pronto',
    },
  },
  {
    type: 'newsletter',
    name: 'Newsletter',
    description: 'Contenido informativo y novedades',
    defaultContent: {
      label: 'Newsletter',
      bulletsTitle: 'En esta edición:',
      ctaText: 'Leer más',
      preCta: 'Lee el artículo completo 📖',
      footerNote: 'Síguenos en redes sociales',
    },
  },
  {
    type: 'sales',
    name: 'Venta Directa',
    description: 'Ofertas comerciales y lanzamientos de productos',
    defaultContent: {
      label: 'Nuevo Lanzamiento',
      bulletsTitle: 'Beneficios principales:',
      ctaText: 'Comprar Ahora',
      preCta: 'Asegura tu producto antes de que se agote 🚀',
      footerNote: 'Garantía de satisfacción de 30 días',
    },
  },
  {
    type: 'financial_advisory',
    name: 'Asesoría Financiera',
    description: 'Actualización de mercado, revisión de portafolio o citas',
    defaultContent: {
      label: 'Update Financiero',
      bulletsTitle: 'Puntos clave a considerar:',
      ctaText: 'Agendar Revisión',
      preCta: 'Conversemos sobre tus objetivos financieros 💼',
      footerNote: 'La información proporcionada no constituye asesoramiento fiscal',
    },
  },
  {
    type: 'onboarding',
    name: 'Bienvenida',
    description: 'Onboarding para nuevos clientes o usuarios',
    defaultContent: {
      label: '¡Te damos la bienvenida!',
      bulletsTitle: 'Pasos para comenzar:',
      ctaText: 'Completar mi perfil',
      preCta: 'Estamos felices de tenerte con nosotros 🎉',
      footerNote: 'El equipo de soporte está aquí para ayudarte',
    },
  },
];

// Brand categories
export const BRAND_CATEGORIES = [
  'General',
  'Real Estate',
  'Crédito',
  'Seguros',
  'E-commerce',
  'Salud',
  'Educación',
  'Legal',
  'Tecnología',
  'Automotriz',
  'Restaurantes',
  'Belleza',
  'Fitness',
  'Finanzas',
  'Consultoría',
  'Otro',
];
