// Provider Gemini — mismo comportamiento que las rutas originales (gemini-2.5-flash)
import { GoogleGenAI } from '@google/genai';
import { EmailContent } from '@/lib/types';
import { AI_ENGINE_META } from '@/lib/ai-engines';
import {
  AbTestParams,
  AbTestResult,
  AIProvider,
  GenerateParams,
  RefineParams,
} from '../ai';
import {
  buildAbSystemPrompt,
  buildAbUserPrompt,
  buildGenerateSystemPrompt,
  buildGenerateUserPrompt,
  buildRefineSystemPrompt,
  buildRefineUserPrompt,
  cleanPlainText,
  GENERATE_JSON_SCHEMA,
  ABTEST_JSON_SCHEMA,
} from '../prompts';
import { parseAbTestResult, parseGeneratedContent } from '../provider-output';

const MODEL = AI_ENGINE_META.gemini.defaultModel;

export function mapGeminiError(error: unknown): Error {
  const candidate = error as { status?: number; code?: number | string; message?: string; name?: string };
  const message = candidate?.message || '';
  const status = Number(candidate?.status || candidate?.code || 0);
  if (status === 401 || status === 403 || /api key|permission_denied/i.test(message)) {
    return new Error('API Key de Gemini inválida o sin permisos.');
  }
  if (status === 429 || /resource_exhausted|rate limit|quota/i.test(message)) {
    return new Error('Límite gratuito de Gemini alcanzado. Espera un momento y reintenta.');
  }
  if (candidate?.name === 'TimeoutError' || candidate?.name === 'AbortError' || /timed? out|timeout/i.test(message)) {
    return new Error('Gemini tardó demasiado en responder. Intenta nuevamente.');
  }
  return new Error(message ? `Error de Gemini: ${message}` : 'Error al comunicarse con Gemini.');
}

export class GeminiProvider implements AIProvider {
  readonly engine = 'gemini' as const;
  readonly model = MODEL;
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 30_000 } });
  }

  async generate(p: GenerateParams): Promise<Partial<EmailContent>> {
    try {
      const response = await this.ai.models.generateContent({
        model: MODEL,
        contents: buildGenerateUserPrompt(p.prompt, p.templateType, p.brand, p.offer, p.brief),
        config: {
          systemInstruction: buildGenerateSystemPrompt(p.brand, p.examples),
          responseMimeType: 'application/json',
          responseJsonSchema: GENERATE_JSON_SCHEMA,
          temperature: 0.7,
        },
      });
      const text = response.text;
      if (!text) throw new Error('Gemini no retornó contenido.');
      return parseGeneratedContent(text);
    } catch (error) {
      throw mapGeminiError(error);
    }
  }

  async refine(p: RefineParams): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: MODEL,
        contents: buildRefineUserPrompt(p.text, p.command),
        config: {
          systemInstruction: buildRefineSystemPrompt(p.field, p.brand),
          temperature: 0.7,
        },
      });
      const text = response.text?.trim() || '';
      if (!text) throw new Error('Gemini no retornó contenido.');
      return cleanPlainText(text);
    } catch (error) {
      throw mapGeminiError(error);
    }
  }

  async abTest(p: AbTestParams): Promise<AbTestResult> {
    try {
      const response = await this.ai.models.generateContent({
        model: MODEL,
        contents: buildAbUserPrompt(p.headline, p.body),
        config: {
          systemInstruction: buildAbSystemPrompt(),
          responseMimeType: 'application/json',
          responseJsonSchema: ABTEST_JSON_SCHEMA,
          temperature: 0.7,
        },
      });
      const text = response.text;
      if (!text) throw new Error('Gemini no retornó variantes.');
      return parseAbTestResult(text);
    } catch (error) {
      throw mapGeminiError(error);
    }
  }
}
