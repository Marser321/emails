// Provider Claude — API de Anthropic con claude-sonnet-5.
// Reglas del modelo: sin temperature/top_p (Sonnet 5 rechaza no-default con 400),
// sin prefill de assistant; JSON garantizado vía output_config.format.
import Anthropic from '@anthropic-ai/sdk';
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
import { parseAbTestResult, parseGeneratedContent } from '../provider-output';

const MODEL = AI_ENGINE_META.claude.defaultModel;

function extractText(response: Anthropic.Message): string {
  for (const block of response.content) {
    if (block.type === 'text') return block.text;
  }
  throw new Error('Claude no retornó contenido.');
}

function mapError(error: unknown): Error {
  if (error instanceof Anthropic.AuthenticationError) {
    return new Error('API Key de Anthropic inválida. Revísala en "Configurar IA".');
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new Error('Límite de uso de la API de Anthropic alcanzado. Espera un momento y reintenta.');
  }
  if (error instanceof Anthropic.APIError) {
    return new Error(`Error de la API de Anthropic: ${error.message}`);
  }
  return error instanceof Error ? error : new Error('Error al comunicarse con Claude.');
}

export class ClaudeProvider implements AIProvider {
  readonly engine = 'claude' as const;
  readonly model = MODEL;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(p: GenerateParams): Promise<Partial<EmailContent>> {
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 8192,
        system: buildGenerateSystemPrompt(p.brand, p.examples),
        thinking: { type: 'disabled' },
        output_config: { format: { type: 'json_schema', schema: GENERATE_JSON_SCHEMA } },
        messages: [{ role: 'user', content: buildGenerateUserPrompt(p.prompt, p.templateType, p.brand) }],
      });
      return parseGeneratedContent(extractText(response));
    } catch (error) {
      throw mapError(error);
    }
  }

  async refine(p: RefineParams): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: buildRefineSystemPrompt(p.field, p.brand),
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: buildRefineUserPrompt(p.text, p.command) }],
      });
      return cleanPlainText(extractText(response));
    } catch (error) {
      throw mapError(error);
    }
  }

  async abTest(p: AbTestParams): Promise<AbTestResult> {
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: buildAbSystemPrompt(),
        thinking: { type: 'disabled' },
        output_config: { format: { type: 'json_schema', schema: ABTEST_JSON_SCHEMA } },
        messages: [{ role: 'user', content: buildAbUserPrompt(p.headline, p.body) }],
      });
      return parseAbTestResult(extractText(response));
    } catch (error) {
      throw mapError(error);
    }
  }
}
