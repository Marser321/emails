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

// ===== Bloques opcionales del email (slots de orden fijo) =====

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

export interface EmailContent {
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
}

export type TemplateType = 
  | 'masterclass'
  | 'registration'
  | 'followup'
  | 'promo'
  | 'reminder'
  | 'newsletter';

export interface TemplateConfig {
  type: TemplateType;
  name: string;
  icon: string;
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

// Configuración de la app (data/settings.json — server-side, contiene API keys)
export interface AppSettings {
  geminiApiKey?: string;
  anthropicApiKey?: string;
  defaultEngine: AIEngine;
  assetsPublicBaseUrl?: string;
  migratedFromLocalStorage?: boolean;
}

// Imagen de la biblioteca de assets (data/assets/<brandId>/)
export interface EmailAsset {
  filename: string;
  brandId: string;
  url: string;
  size: number;
  modifiedAt: string;
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
  },
  isFavorite: false,
};

// Template configurations
export const TEMPLATES: TemplateConfig[] = [
  {
    type: 'masterclass',
    name: 'Masterclass',
    icon: '🎓',
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
    icon: '✅',
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
    icon: '📨',
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
    icon: '🔥',
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
    icon: '⏰',
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
    icon: '📰',
    description: 'Contenido informativo y novedades',
    defaultContent: {
      label: 'Newsletter',
      bulletsTitle: 'En esta edición:',
      ctaText: 'Leer más',
      preCta: 'Lee el artículo completo 📖',
      footerNote: 'Síguenos en redes sociales',
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
