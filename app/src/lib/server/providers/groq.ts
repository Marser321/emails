import type { EmailContent } from '@/lib/types';
import { AI_ENGINE_META } from '@/lib/ai-engines';
import type { AbTestParams, AbTestResult, AIProvider, GenerateParams, RefineParams } from '../ai';
import {
  ABTEST_JSON_SCHEMA,
  buildAbSystemPrompt,
  buildAbUserPrompt,
  buildGenerateSystemPrompt,
  buildGenerateUserPrompt,
  buildRefineSystemPrompt,
  buildRefineUserPrompt,
  cleanPlainText,
  GENERATE_JSON_SCHEMA,
} from '../prompts';
import { InvalidAIResponseError, parseAbTestResult, parseGeneratedContent } from '../provider-output';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

interface GroqResponse {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
}

function responseText(payload: GroqResponse): string {
  const value = payload.choices?.[0]?.message?.content?.trim();
  if (!value) throw new Error('Groq no retornó contenido.');
  return value;
}

function statusError(status: number, payload: GroqResponse): Error {
  if (status === 401 || status === 403) return new Error('API Key de Groq inválida o sin permisos.');
  if (status === 429) return new Error('Límite gratuito de Groq alcanzado. Espera un momento y reintenta.');
  return new Error(payload.error?.message || `Error de Groq (${status}).`);
}

export class GroqProvider implements AIProvider {
  readonly engine = 'groq' as const;
  readonly model: string;

  constructor(private readonly apiKey: string, model = process.env.GROQ_MODEL || AI_ENGINE_META.groq.defaultModel) {
    this.model = model;
  }

  private async complete(
    system: string,
    user: string,
    options: { schema?: Record<string, unknown>; maxTokens?: number } = {},
  ): Promise<string> {
    const systemContent = options.schema
      ? `${system}\n\nEl objeto debe cumplir exactamente este JSON Schema. Incluye todas las claves requeridas, no agregues claves extra y usa cadenas vacías en vez de null cuando un dato no aplique:\n${JSON.stringify(options.schema)}`
      : system;
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'system', content: systemContent }, { role: 'user', content: user }],
          temperature: 0.7,
          max_completion_tokens: options.maxTokens || 4096,
          ...(options.schema ? {
            // Llama 3.3 on Groq supports JSON Object Mode, but not Groq's
            // stricter json_schema response format. The shared prompts define
            // the contract and provider-output validates it with Zod.
            response_format: { type: 'json_object' },
          } : {}),
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new Error('Groq tardó demasiado en responder. Intenta nuevamente.');
      }
      throw new Error('No se pudo conectar con Groq.');
    }

    const payload = await response.json().catch(() => ({})) as GroqResponse;
    if (!response.ok) throw statusError(response.status, payload);
    return responseText(payload);
  }

  async generate(params: GenerateParams): Promise<Partial<EmailContent>> {
    const system = buildGenerateSystemPrompt(params.brand, params.examples);
    const user = buildGenerateUserPrompt(params.prompt, params.templateType, params.brand, params.offer, params.brief);
    const options = { schema: GENERATE_JSON_SCHEMA, maxTokens: 8192 };
    const value = await this.complete(system, user, options);
    try {
      return parseGeneratedContent(value);
    } catch (error) {
      if (!(error instanceof InvalidAIResponseError)) throw error;
      const retry = await this.complete(
        system,
        `${user}\nLa respuesta anterior no cumplió el contrato. Regenera el objeto completo y revisa tipos, claves requeridas y colores hexadecimales.`,
        options,
      );
      return parseGeneratedContent(retry);
    }
  }

  async refine(params: RefineParams): Promise<string> {
    return cleanPlainText(await this.complete(
      buildRefineSystemPrompt(params.field, params.brand),
      buildRefineUserPrompt(params.text, params.command),
      { maxTokens: 2048 },
    ));
  }

  async abTest(params: AbTestParams): Promise<AbTestResult> {
    const system = buildAbSystemPrompt();
    const user = buildAbUserPrompt(params.headline, params.body);
    const options = { schema: ABTEST_JSON_SCHEMA };
    const value = await this.complete(system, user, options);
    try {
      return parseAbTestResult(value);
    } catch (error) {
      if (!(error instanceof InvalidAIResponseError)) throw error;
      const retry = await this.complete(
        system,
        `${user}\nLa respuesta anterior no cumplió el contrato. Regenera todas las variantes como un único objeto JSON válido.`,
        options,
      );
      return parseAbTestResult(retry);
    }
  }
}
