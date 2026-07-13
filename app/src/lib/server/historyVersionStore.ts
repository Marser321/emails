import type { EmailHistoryEntry, EmailHistoryVersion, HistoryVersionReason } from '@/lib/types';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from './env';
import { readJson, withFileLock, writeJson } from './storage';
import { getHistoryEntry, updateHistoryEntry } from './historyStore';

interface VersionRow { id: string; history_id: string; brand_id: string; version: number; reason: HistoryVersionReason; subject: string; content: EmailHistoryVersion['content']; html_snapshot: string | null; created_at: string; }
const localFile = (historyId: string) => `history-versions/${historyId}.json`;
const map = (row: VersionRow): EmailHistoryVersion => ({ id: row.id, historyId: row.history_id, brandId: row.brand_id, version: row.version, reason: row.reason, subject: row.subject, content: row.content, htmlSnapshot: row.html_snapshot || '', createdAt: row.created_at });

export async function listHistoryVersions(historyId: string): Promise<EmailHistoryVersion[]> {
  if (!isSupabaseConfigured()) return (await readJson<EmailHistoryVersion[]>(localFile(historyId), [])).sort((a, b) => b.version - a.version);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('history_versions').select('*').eq('history_id', historyId).order('version', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as VersionRow[]).map(map);
}

export async function createHistoryVersion(entry: Pick<EmailHistoryEntry, 'id' | 'brandId' | 'subject' | 'content' | 'htmlSnapshot'>, reason: HistoryVersionReason): Promise<EmailHistoryVersion> {
  const previous = await listHistoryVersions(entry.id);
  const version: EmailHistoryVersion = { id: `ver_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, historyId: entry.id, brandId: entry.brandId, version: (previous[0]?.version || 0) + 1, reason, subject: entry.subject, content: structuredClone(entry.content), htmlSnapshot: entry.htmlSnapshot, createdAt: new Date().toISOString() };
  if (!isSupabaseConfigured()) return withFileLock(localFile(entry.id), async () => { const rows = await readJson<EmailHistoryVersion[]>(localFile(entry.id), []); rows.unshift(version); await writeJson(localFile(entry.id), rows); return version; });
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('history_versions').insert({ id: version.id, history_id: version.historyId, brand_id: version.brandId, version: version.version, reason: version.reason, subject: version.subject, content: version.content, html_snapshot: version.htmlSnapshot || null, created_at: version.createdAt });
  if (error) throw new Error(error.message);
  return version;
}

export async function restoreHistoryVersion(brandId: string, historyId: string, versionId: string): Promise<{ entry: EmailHistoryEntry; version: EmailHistoryVersion } | null> {
  const source = (await listHistoryVersions(historyId)).find(version => version.id === versionId);
  if (!source || source.brandId !== brandId) return null;
  const updated = await updateHistoryEntry(brandId, historyId, { subject: source.subject, content: source.content, htmlSnapshot: source.htmlSnapshot });
  if (!updated) return null;
  const version = await createHistoryVersion(updated, 'restored');
  return { entry: updated, version };
}

export async function snapshotHistoryEntry(brandId: string, historyId: string, reason: HistoryVersionReason): Promise<EmailHistoryVersion | null> {
  const entry = await getHistoryEntry(brandId, historyId);
  return entry ? createHistoryVersion(entry, reason) : null;
}
