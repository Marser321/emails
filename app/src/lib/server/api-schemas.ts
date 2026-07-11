import { z } from 'zod';
import type { EmailDocumentV3, EmailDocumentV4 } from '@/lib/types';
import { sanitizeEmailUrl } from '@/lib/email-safety';

export const engineSchema = z.enum(['gemini', 'claude']);
export const templateSchema = z.enum([
  'masterclass', 'registration', 'followup', 'promo', 'reminder',
  'newsletter', 'sales', 'financial_advisory', 'onboarding',
]);
export const presetSchema = z.enum([
  'keynote', 'workshop', 'confirmation', 'access-pass', 'personal-note', 'next-steps', 'offer-focus', 'promo-grid',
  'countdown', 'calendar-card', 'editorial-digest', 'visual-roundup', 'product-story', 'single-offer',
  'market-brief', 'portfolio-review', 'welcome-path', 'getting-started',
]);

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Color hexadecimal inválido');
const shortText = z.string().trim().max(300);
const longText = z.string().max(10000);
const safeUrlSchema = z.string().trim().max(2048).refine(
  value => !value || Boolean(sanitizeEmailUrl(value)),
  'La URL debe ser absoluta, un asset interno o un merge field permitido',
);

const imageSchema = z.object({
  url: safeUrlSchema,
  alt: z.string().trim().min(1).max(240),
  href: safeUrlSchema.optional(),
}).strict();

const blockId = z.string().trim().min(1).max(100);
const textStyleSchema = z.object({
  color: hexColorSchema.optional(), fontFamily: z.enum(['Arial', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Verdana']).optional(),
  fontSize: z.number().int().min(10).max(48).optional(), fontWeight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800)]).optional(),
  lineHeight: z.number().min(1).max(2).optional(), textAlign: z.enum(['left', 'center', 'right']).optional(),
}).strict();
const blockStyleSchema = z.object({
  backgroundColor: hexColorSchema.optional(), paddingTop: z.number().int().min(0).max(80).optional(), paddingRight: z.number().int().min(0).max(80).optional(),
  paddingBottom: z.number().int().min(0).max(80).optional(), paddingLeft: z.number().int().min(0).max(80).optional(),
  text: textStyleSchema.optional(), label: textStyleSchema.optional(), heading: textStyleSchema.optional(),
}).strict();
const styleField = { style: blockStyleSchema.optional() };
const emailBlockSchema = z.discriminatedUnion('type', [
  z.object({ id: blockId, type: z.literal('header'), ...styleField }).strict(),
  z.object({ id: blockId, type: z.literal('hero'), imageUrl: safeUrlSchema, alt: z.string().trim().min(1).max(240), href: safeUrlSchema.optional(), fullBleed: z.boolean().optional(), borderRadius: z.number().int().min(0).max(32).optional(), widthPercent: z.number().int().min(30).max(100).optional(), ...styleField }).strict(),
  z.object({ id: blockId, type: z.literal('text'), label: shortText.optional(), headline: z.string().max(500).optional(), body: longText.optional(), ...styleField }).strict(),
  z.object({ id: blockId, type: z.literal('image-text'), imageUrl: safeUrlSchema, alt: z.string().trim().min(1).max(240), title: z.string().max(500).optional(), text: longText, imagePosition: z.enum(['left', 'right']), borderRadius: z.number().int().min(0).max(32).optional(), imageWidth: z.number().int().min(120).max(252).optional(), ...styleField }).strict(),
  z.object({ id: blockId, type: z.literal('gallery'), images: z.array(imageSchema).min(1).max(6), columns: z.union([z.literal(2), z.literal(3)]), caption: z.string().max(500).optional(), borderRadius: z.number().int().min(0).max(32).optional(), ...styleField }).strict(),
  z.object({ id: blockId, type: z.literal('bullets'), bulletsTitle: z.string().max(500).optional(), bullets: z.array(z.string().max(1000)).max(20), ...styleField }).strict(),
  z.object({ id: blockId, type: z.literal('infobox'), eventDate: shortText.optional(), eventTime: shortText.optional(), ...styleField }).strict(),
  z.object({ id: blockId, type: z.literal('quote'), text: longText, author: shortText.optional(), role: shortText.optional(), ...styleField }).strict(),
  z.object({ id: blockId, type: z.literal('cta'), ctaText: z.string().trim().min(1).max(160), ctaUrl: safeUrlSchema, preCta: z.string().max(500).optional(), secondaryCtaText: z.string().max(160).optional(), secondaryCtaUrl: safeUrlSchema.optional(), ...styleField }).strict(),
  z.object({ id: blockId, type: z.literal('divider'), ...styleField }).strict(),
  z.object({ id: blockId, type: z.literal('spacer'), height: z.number().int().min(4).max(80).optional(), ...styleField }).strict(),
  z.object({ id: blockId, type: z.literal('footer'), footerNote: z.string().max(1000).optional(), ...styleField }).strict(),
]);

const optionalImageSchema = z.object({
  imageUrl: safeUrlSchema,
  alt: z.string().max(240).optional(),
  href: safeUrlSchema.optional(),
  fullBleed: z.boolean().optional(),
}).strict();

export const emailContentSchema = z.object({
  subject: z.string().max(300).optional(),
  preheader: z.string().max(500).optional(),
  label: z.string().max(300),
  headline: z.string().max(500),
  body: longText,
  bulletsTitle: z.string().max(500),
  bullets: z.array(z.string().max(1000)).max(20),
  ctaText: z.string().max(160),
  ctaUrl: safeUrlSchema,
  eventDate: shortText,
  eventTime: shortText,
  preCta: z.string().max(500),
  footerNote: z.string().max(1000),
  emailBgColor: hexColorSchema.optional(),
  bodyBgColor: hexColorSchema.optional(),
  primaryColor: hexColorSchema.optional(), accentColor: hexColorSchema.optional(), gradientStart: hexColorSchema.optional(), gradientEnd: hexColorSchema.optional(),
  headerBgColor: hexColorSchema.optional(), footerBgColor: hexColorSchema.optional(), presetId: presetSchema.optional(),
  typography: z.object({ headingFont: shortText.optional(), bodyFont: shortText.optional(), headingColor: hexColorSchema.optional(), bodyColor: hexColorSchema.optional(), mutedColor: hexColorSchema.optional(), linkColor: hexColorSchema.optional(), ctaTextColor: hexColorSchema.optional() }).strict().optional(),
  textureUrl: safeUrlSchema.optional(),
  headerTextureUrl: safeUrlSchema.optional(),
  secondaryCtaText: z.string().max(160).optional(),
  secondaryCtaUrl: safeUrlSchema.optional(),
  layout: z.enum(['classic', 'minimal', 'hero', 'card']).optional(),
  hero: optionalImageSchema.optional(),
  imageText: z.object({ imageUrl: safeUrlSchema, alt: z.string().max(240).optional(), title: z.string().max(500).optional(), text: longText, imagePosition: z.enum(['left', 'right']) }).strict().optional(),
  gallery: z.object({ images: z.array(imageSchema).max(6), columns: z.union([z.literal(2), z.literal(3)]), caption: z.string().max(500).optional() }).strict().optional(),
  quote: z.object({ text: longText, author: shortText.optional(), role: shortText.optional() }).strict().optional(),
  showDividers: z.boolean().optional(),
  emailWidth: z.number().int().min(320).max(700).optional(),
  blocks: z.array(emailBlockSchema).max(80).optional(),
  compliance: z.object({ unsubscribeLabel: z.string().max(120), unsubscribeUrl: safeUrlSchema, address: z.string().max(500) }).strict().optional(),
}).strict();

const emailDocumentV3Schema = z.object({
  schemaVersion: z.literal(3),
  brandId: z.string().trim().min(1).max(128),
  template: templateSchema,
  subject: z.string().trim().min(1).max(300),
  preheader: z.string().max(500),
  locale: z.literal('es'),
  emailWidth: z.number().int().min(320).max(700),
  theme: z.object({ pageBackground: hexColorSchema, bodyBackground: hexColorSchema, emailWidth: z.number().int().min(320).max(700) }).strict(),
  blocks: z.array(emailBlockSchema).min(2).max(80),
  compliance: z.object({ unsubscribeLabel: z.string().trim().min(1).max(120), unsubscribeUrl: safeUrlSchema, address: z.string().trim().min(1).max(500) }).strict(),
}).strict();

const typographySchema = z.object({
  headingFont: shortText, bodyFont: shortText, headingColor: hexColorSchema, bodyColor: hexColorSchema,
  mutedColor: hexColorSchema, linkColor: hexColorSchema, ctaTextColor: hexColorSchema,
}).strict();

const emailDocumentV4Schema = z.object({
  schemaVersion: z.literal(4), brandId: z.string().trim().min(1).max(128), template: templateSchema, presetId: presetSchema,
  subject: z.string().trim().min(1).max(300), preheader: z.string().max(500), locale: z.literal('es'),
  emailWidth: z.number().int().min(320).max(700),
  theme: z.object({ pageBackground: hexColorSchema, bodyBackground: hexColorSchema, emailWidth: z.number().int().min(320).max(700), typography: typographySchema,
    primaryColor: hexColorSchema, accentColor: hexColorSchema, gradientStart: hexColorSchema, gradientEnd: hexColorSchema,
    headerBackground: hexColorSchema, footerBackground: hexColorSchema,
  }).strict(),
  blocks: z.array(emailBlockSchema).min(2).max(80),
  compliance: z.object({ unsubscribeLabel: z.string().trim().min(1).max(120), unsubscribeUrl: safeUrlSchema, address: z.string().trim().min(1).max(500) }).strict(),
}).strict();

export const emailDocumentSchema = z.union([emailDocumentV3Schema, emailDocumentV4Schema]);

export const brandInputSchema = z.object({
  id: z.string().trim().min(1).max(128).optional(),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  colors: z.object({ primary: hexColorSchema, accent: hexColorSchema, gradientStart: hexColorSchema, gradientEnd: hexColorSchema, headerBg: hexColorSchema.optional(), footerBg: hexColorSchema.optional() }).strict(),
  fonts: z.object({ heading: shortText, body: shortText }).strict(),
  logo: z.object({ type: z.enum(['text', 'image']), value: z.string().trim().min(1).max(2048), imageWidth: z.number().int().min(40).max(600).optional(), showName: z.boolean().optional(), namePosition: z.enum(['right', 'below']).optional() }).strict(),
  footer: z.object({ tagline: z.string().max(500), subtitle: z.string().max(500), disclaimer: z.string().max(2000), address: z.string().max(500).optional(), unsubscribeLabel: z.string().max(120).optional(), unsubscribeUrl: safeUrlSchema.optional() }).strict(),
  voice: z.object({ toneOfVoice: z.string().max(500), audience: z.string().max(500), styleNotes: z.string().max(2000), samplePhrases: z.array(z.string().max(500)).max(20) }).strict().optional(),
  isFavorite: z.boolean().optional(),
  createdAt: z.iso.datetime().optional(),
  updatedAt: z.iso.datetime().optional(),
}).strict();

export const brandPatchSchema = brandInputSchema.partial().omit({ id: true }).strict();
export const brandImportSchema = z.array(brandInputSchema).max(500);

export const draftInputSchema = z.object({
  id: z.string().trim().min(1).max(128).optional(), name: z.string().trim().min(1).max(160),
  brandName: z.string().trim().min(1).max(160), templateName: z.string().trim().min(1).max(160),
  brandId: z.string().trim().min(1).max(128), template: templateSchema, content: emailContentSchema,
  date: z.iso.datetime().optional(),
}).strict();

export const historyCreateSchema = z.object({
  brandId: z.string().trim().min(1).max(128), templateType: templateSchema, engine: engineSchema,
  model: z.string().trim().min(1).max(120), prompt: z.string().max(5000).default(''), subject: z.string().max(300).default(''),
  content: emailContentSchema, htmlSnapshot: z.string().max(400000).default(''), rating: z.enum(['up', 'down']).nullable().default(null),
  notes: z.string().max(5000).default(''),
}).strict();

export const historyPatchSchema = z.object({
  brandId: z.string().trim().min(1).max(128).optional(), rating: z.enum(['up', 'down']).nullable().optional(),
  notes: z.string().max(5000).optional(), htmlSnapshot: z.string().max(400000).optional(), subject: z.string().max(300).optional(),
  content: emailContentSchema.optional(),
}).strict();

export const generateRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(5000), templateType: templateSchema,
  brandId: z.string().trim().min(1).max(128).optional(), brand: brandInputSchema.optional(), engine: engineSchema.optional(),
}).strict();

export const refineRequestSchema = z.object({
  text: z.string().trim().min(1).max(10000), field: z.string().trim().min(1).max(80),
  command: z.enum(['optimize', 'shorten', 'casual', 'formal', 'rewrite']).default('optimize'), engine: engineSchema.optional(),
  brandId: z.string().trim().max(128).optional(),
}).strict();

export const abTestRequestSchema = z.object({
  headline: z.string().trim().min(1).max(300), body: z.string().trim().min(1).max(10000), engine: engineSchema.optional(),
}).strict();

export const settingsPatchSchema = z.object({
  defaultEngine: engineSchema.optional(),
  assetsPublicBaseUrl: z.union([z.literal(''), z.url({ protocol: /^https?$/ })]).optional(),
}).strict();

export const sendTestRequestSchema = z.object({
  toEmail: z.email().max(320),
  document: z.custom<EmailDocumentV3 | EmailDocumentV4>(value => emailDocumentSchema.safeParse(value).success, 'Documento de email inválido'),
}).strict();

export function validationMessage(error: z.ZodError): string {
  return error.issues[0]?.message || 'Datos inválidos';
}
