// Provider Gemini — mismo comportamiento que las rutas originales (gemini-2.5-flash)
import { GoogleGenAI } from '@google/genai';
import { EmailContent } from '@/lib/types';
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
} from '../prompts';

const MODEL = 'gemini-2.5-flash';

export class GeminiProvider implements AIProvider {
  readonly engine = 'gemini' as const;
  readonly model = MODEL;
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generate(p: GenerateParams): Promise<Partial<EmailContent>> {
    const response = await this.ai.models.generateContent({
      model: MODEL,
      contents: buildGenerateUserPrompt(p.prompt, p.templateType, p.brand),
      config: {
        systemInstruction: buildGenerateSystemPrompt(p.brand, p.examples),
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });
    const text = response.text;
    if (!text) throw new Error('Gemini no retornó contenido.');
    return JSON.parse(text);
  }

  async refine(p: RefineParams): Promise<string> {
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
  }

  async abTest(p: AbTestParams): Promise<AbTestResult> {
    const response = await this.ai.models.generateContent({
      model: MODEL,
      contents: buildAbUserPrompt(p.headline, p.body),
      config: {
        systemInstruction: buildAbSystemPrompt(),
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });
    const text = response.text;
    if (!text) throw new Error('Gemini no retornó variantes.');
    return JSON.parse(text);
  }
}
