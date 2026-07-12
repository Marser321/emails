import 'server-only';
import type { AIEngine } from '@/lib/types';
import { AI_ENGINE_META } from '@/lib/ai-engines';

export const AI_PROVIDER_SERVER_CONFIG: Record<AIEngine, { envVar: string; defaultModel: string }> = {
  gemini: { envVar: 'GEMINI_API_KEY', defaultModel: AI_ENGINE_META.gemini.defaultModel },
  groq: { envVar: 'GROQ_API_KEY', defaultModel: AI_ENGINE_META.groq.defaultModel },
  claude: { envVar: 'ANTHROPIC_API_KEY', defaultModel: AI_ENGINE_META.claude.defaultModel },
};

export function providerApiKey(engine: AIEngine): string | undefined {
  return process.env[AI_PROVIDER_SERVER_CONFIG[engine].envVar];
}

export function providerAvailability(): Record<AIEngine, boolean> {
  return {
    gemini: Boolean(providerApiKey('gemini')),
    groq: Boolean(providerApiKey('groq')),
    claude: Boolean(providerApiKey('claude')),
  };
}
