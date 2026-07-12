import type { AIEngine } from './types';

export interface AIEngineMeta {
  label: string;
  shortLabel: string;
  defaultModel: string;
}

export const AI_ENGINE_META: Record<AIEngine, AIEngineMeta> = {
  gemini: { label: '⚡ Gemini', shortLabel: 'Gemini', defaultModel: 'gemini-2.5-flash' },
  groq: { label: '🚀 Groq · Llama', shortLabel: 'Groq', defaultModel: 'llama-3.3-70b-versatile' },
  claude: { label: '🧠 Claude', shortLabel: 'Claude', defaultModel: 'claude-sonnet-5' },
};

export const AI_ENGINES = Object.keys(AI_ENGINE_META) as AIEngine[];
