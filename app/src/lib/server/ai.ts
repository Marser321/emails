// Abstracción de motor IA — Gemini y Claude detrás de la misma interfaz
import { AIEngine, Brand, EmailContent, EmailHistoryEntry, TemplateType } from '@/lib/types';
import { getSettings, resolveApiKey } from './settingsStore';

export interface GenerateParams {
  prompt: string;
  templateType: TemplateType;
  brand: Brand;
  examples: EmailHistoryEntry[];
}

export interface RefineParams {
  text: string;
  field: string;
  command: string;
  brand?: Brand;
}

export interface AbTestParams {
  headline: string;
  body: string;
}

export interface AbTestResult {
  subjects: { type: string; text: string }[];
  preheaders: string[];
}

export interface AIProvider {
  readonly engine: AIEngine;
  readonly model: string;
  generate(p: GenerateParams): Promise<Partial<EmailContent>>;
  refine(p: RefineParams): Promise<string>;
  abTest(p: AbTestParams): Promise<AbTestResult>;
}

export class MissingApiKeyError extends Error {
  constructor(engine: AIEngine) {
    super(
      engine === 'claude'
        ? 'API Key de Anthropic no configurada. Agrégala en "Configurar IA" o define ANTHROPIC_API_KEY en el servidor.'
        : 'API Key de Gemini no configurada. Agrégala en "Configurar IA" o define GEMINI_API_KEY en el servidor.'
    );
    this.name = 'MissingApiKeyError';
  }
}

export async function getProvider(requested?: AIEngine, legacyGeminiKey?: string): Promise<AIProvider> {
  const settings = await getSettings();
  const engine: AIEngine = requested ?? settings.defaultEngine ?? 'gemini';

  let apiKey = await resolveApiKey(engine);
  // Fallback legacy: el cliente viejo mandaba la key de Gemini en el body
  if (!apiKey && engine === 'gemini' && legacyGeminiKey) {
    apiKey = legacyGeminiKey;
  }
  if (!apiKey) {
    throw new MissingApiKeyError(engine);
  }

  if (engine === 'claude') {
    const { ClaudeProvider } = await import('./providers/claude');
    return new ClaudeProvider(apiKey);
  }
  const { GeminiProvider } = await import('./providers/gemini');
  return new GeminiProvider(apiKey);
}
