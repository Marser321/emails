// Configuración de la app en data/settings.json (contiene API keys — nunca exponerlas completas al cliente)
import { AIEngine, AppSettings } from '@/lib/types';
import { readJson, writeJson, withFileLock } from './storage';

const FILE = 'settings.json';

const DEFAULT_SETTINGS: AppSettings = {
  defaultEngine: 'gemini',
};

export async function getSettings(): Promise<AppSettings> {
  const stored = await readJson<Partial<AppSettings>>(FILE, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  return withFileLock(FILE, async () => {
    const current = await getSettings();
    const next: AppSettings = { ...current, ...patch };
    // String vacío = borrar la key
    if (patch.geminiApiKey === '') delete next.geminiApiKey;
    if (patch.anthropicApiKey === '') delete next.anthropicApiKey;
    await writeJson(FILE, next);
    return next;
  });
}

// Prioridad: variable de entorno > settings.json > (fallback legacy que maneja cada ruta)
export async function resolveApiKey(engine: AIEngine): Promise<string | undefined> {
  const settings = await getSettings();
  if (engine === 'claude') {
    return process.env.ANTHROPIC_API_KEY || settings.anthropicApiKey;
  }
  return process.env.GEMINI_API_KEY || settings.geminiApiKey;
}

export function maskKey(key: string | undefined): string {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
