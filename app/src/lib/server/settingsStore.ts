import { AIEngine, AppSettings } from '@/lib/types';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from './env';

const DEFAULT_SETTINGS: AppSettings = { defaultEngine: 'gemini' };

interface SettingsRow {
  default_engine: AIEngine | null;
  assets_public_base_url: string | null;
  migrated_from_local_storage: boolean | null;
}
function mapSettings(row: SettingsRow): AppSettings {
  return {
    defaultEngine: row.default_engine || 'gemini',
    assetsPublicBaseUrl: row.assets_public_base_url || undefined,
    migratedFromLocalStorage: row.migrated_from_local_storage ?? true,
  };
}

export async function getSettings(): Promise<AppSettings> {
  if (!isSupabaseConfigured()) return { ...DEFAULT_SETTINGS };
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('settings')
    .select('default_engine, assets_public_base_url, migrated_from_local_storage')
    .eq('id', 'default')
    .maybeSingle();
  return error || !data ? { ...DEFAULT_SETTINGS } : mapSettings(data as SettingsRow);
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  if (!isSupabaseConfigured()) return next;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.defaultEngine !== undefined) updates.default_engine = patch.defaultEngine;
  if (patch.assetsPublicBaseUrl !== undefined) updates.assets_public_base_url = patch.assetsPublicBaseUrl;
  if (patch.migratedFromLocalStorage !== undefined) updates.migrated_from_local_storage = patch.migratedFromLocalStorage;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('settings').update(updates).eq('id', 'default').select().maybeSingle();
  return error || !data ? next : mapSettings(data as SettingsRow);
}

export async function resolveApiKey(engine: AIEngine): Promise<string | undefined> {
  return engine === 'claude' ? process.env.ANTHROPIC_API_KEY : process.env.GEMINI_API_KEY;
}

export function maskKey(key: string | undefined): string {
  return key ? '(configurada en el servidor)' : '';
}
