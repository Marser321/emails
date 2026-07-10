import { AIEngine, AppSettings } from '@/lib/types';
import { supabase } from './supabase';

const DEFAULT_SETTINGS: AppSettings = {
  defaultEngine: 'gemini',
};

// Convert snake_case from DB to camelCase
function mapSettingsFromDB(dbSettings: any): AppSettings {
  return {
    geminiApiKey: dbSettings.gemini_api_key || undefined,
    anthropicApiKey: dbSettings.anthropic_api_key || undefined,
    defaultEngine: dbSettings.default_engine || 'gemini',
    assetsPublicBaseUrl: dbSettings.assets_public_base_url || undefined,
    migratedFromLocalStorage: dbSettings.migrated_from_local_storage ?? true,
  };
}

export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 'default').single();
  if (error || !data) {
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...mapSettingsFromDB(data) };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };

  const updates: any = { updated_at: new Date().toISOString() };
  
  if (patch.geminiApiKey === '') updates.gemini_api_key = null;
  else if (patch.geminiApiKey !== undefined) updates.gemini_api_key = patch.geminiApiKey;
  
  if (patch.anthropicApiKey === '') updates.anthropic_api_key = null;
  else if (patch.anthropicApiKey !== undefined) updates.anthropic_api_key = patch.anthropicApiKey;
  
  if (patch.defaultEngine !== undefined) updates.default_engine = patch.defaultEngine;
  if (patch.assetsPublicBaseUrl !== undefined) updates.assets_public_base_url = patch.assetsPublicBaseUrl;
  if (patch.migratedFromLocalStorage !== undefined) updates.migrated_from_local_storage = patch.migratedFromLocalStorage;

  const { data, error } = await supabase
    .from('settings')
    .update(updates)
    .eq('id', 'default')
    .select()
    .single();

  if (error || !data) {
    console.error('Error saving settings:', error);
    return next;
  }

  return mapSettingsFromDB(data);
}

// Prioridad: variable de entorno > supabase > (fallback legacy que maneja cada ruta)
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
