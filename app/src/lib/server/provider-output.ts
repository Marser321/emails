import { z } from 'zod';
import type { AbTestResult } from './ai';
import type { EmailContent } from '@/lib/types';

const generatedContentSchema = z.object({
  label: z.string().max(300),
  headline: z.string().max(500),
  body: z.string().max(10000),
  bulletsTitle: z.string().max(500),
  bullets: z.array(z.string().max(1000)).max(20),
  ctaText: z.string().max(160),
  ctaUrl: z.string().max(2048),
  eventDate: z.string().max(300),
  eventTime: z.string().max(300),
  preCta: z.string().max(500),
  footerNote: z.string().max(1000),
  emailBgColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  bodyBgColor: z.string().regex(/^#[0-9a-f]{6}$/i),
}).strict();

const abTestResultSchema = z.object({
  subjects: z.array(z.object({ type: z.string().max(80), text: z.string().max(300) }).strict()).min(1).max(12),
  preheaders: z.array(z.string().max(500)).min(1).max(12),
}).strict();

export class InvalidAIResponseError extends Error {
  constructor(message = 'El proveedor devolvió una respuesta con formato inválido.') {
    super(message);
    this.name = 'InvalidAIResponseError';
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidAIResponseError('El proveedor no devolvió JSON válido. Intenta generar nuevamente.');
  }
}

function issueSummary(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map(issue => `${issue.path.join('.') || 'respuesta'}: ${issue.code}`)
    .join(', ');
}

export function parseGeneratedContent(text: string): Partial<EmailContent> {
  const parsed = generatedContentSchema.safeParse(parseJson(text));
  if (!parsed.success) {
    throw new InvalidAIResponseError(`El proveedor devolvió contenido incompleto o inválido (${issueSummary(parsed.error)}).`);
  }
  return parsed.data;
}

export function parseAbTestResult(text: string): AbTestResult {
  const parsed = abTestResultSchema.safeParse(parseJson(text));
  if (!parsed.success) {
    throw new InvalidAIResponseError(`El proveedor devolvió variantes inválidas (${issueSummary(parsed.error)}).`);
  }
  return parsed.data;
}
