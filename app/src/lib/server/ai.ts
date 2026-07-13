// Abstracción de motor IA — Gemini y Claude detrás de la misma interfaz
import { AIEngine, Brand, CampaignBrief, EmailContent, EmailHistoryEntry, Offer, TemplateType } from '@/lib/types';
import { getSettings, resolveApiKey } from './settingsStore';

export interface GenerateParams {
  prompt: string;
  templateType: TemplateType;
  brand: Brand;
  examples: EmailHistoryEntry[];
  offer?: Offer;
  brief?: CampaignBrief;
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
        ? 'Anthropic no está configurado en el servidor.'
        : engine === 'groq'
          ? 'Groq no está configurado en el servidor.'
          : 'Gemini no está configurado en el servidor.'
    );
    this.name = 'MissingApiKeyError';
  }
}

export async function getProvider(requested?: AIEngine): Promise<AIProvider> {
  const settings = await getSettings();
  const engine: AIEngine = requested ?? settings.defaultEngine ?? 'gemini';

  const apiKey = await resolveApiKey(engine);
  if (!apiKey) {
    throw new MissingApiKeyError(engine);
  }

  if (engine === 'claude') {
    const { ClaudeProvider } = await import('./providers/claude');
    return new ClaudeProvider(apiKey);
  }
  if (engine === 'groq') {
    const { GroqProvider } = await import('./providers/groq');
    return new GroqProvider(apiKey);
  }
  const { GeminiProvider } = await import('./providers/gemini');
  return new GeminiProvider(apiKey);
}
