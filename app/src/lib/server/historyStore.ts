import { promises as fs } from 'node:fs';
import { EmailHistoryEntry } from '@/lib/types';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from './env';
import { toUuidOrNull } from './auth';
import { dataPath, readJson, withFileLock, writeJson } from './storage';

interface HistoryRow {
  id: string;
  brand_id: string;
  template_type: EmailHistoryEntry['templateType'];
  engine: EmailHistoryEntry['engine'];
  model: string;
  prompt: string | null;
  subject: string;
  content: EmailHistoryEntry['content'];
  html_snapshot: string | null;
  rating: EmailHistoryEntry['rating'];
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  schema_version?: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

function mapHistoryFromDB(row: HistoryRow): EmailHistoryEntry {
  return {
    id: row.id,
    brandId: row.brand_id,
    templateType: row.template_type,
    engine: row.engine,
    model: row.model,
    prompt: row.prompt || '',
    subject: row.subject,
    content: row.content,
    htmlSnapshot: row.html_snapshot || '',
    rating: row.rating,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function localFile(brandId: string) {
  return `history/${brandId}.json`;
}

async function allLocalHistory(): Promise<EmailHistoryEntry[]> {
  try {
    const files = (await fs.readdir(dataPath('history'))).filter(file => file.endsWith('.json'));
    const groups = await Promise.all(files.map(file => readJson<EmailHistoryEntry[]>(`history/${file}`, [])));
    return groups.flat();
  } catch {
    return [];
  }
}

export async function listHistory(brandId?: string, limit?: number, query?: string): Promise<EmailHistoryEntry[]> {
  let entries: EmailHistoryEntry[];
  if (!isSupabaseConfigured()) {
    entries = brandId ? await readJson(localFile(brandId), []) : await allLocalHistory();
  } else {
    const supabase = await createServerSupabase();
    let request = supabase.from('history').select('*').order('created_at', { ascending: false });
    if (brandId) request = request.eq('brand_id', brandId);
    if (limit) request = request.limit(limit);
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    entries = ((data || []) as HistoryRow[]).map(mapHistoryFromDB);
  }
  if (query) {
    const normalized = query.toLocaleLowerCase('es');
    entries = entries.filter(entry => `${entry.subject} ${entry.prompt}`.toLocaleLowerCase('es').includes(normalized));
  }
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return limit ? entries.slice(0, limit) : entries;
}

export async function addHistoryEntry(entry: Omit<EmailHistoryEntry, 'id' | 'createdAt' | 'updatedAt'>, createdBy?: string): Promise<EmailHistoryEntry> {
  const now = new Date().toISOString();
  const full: EmailHistoryEntry = { ...entry, id: generateId(), createdAt: now, updatedAt: now };
  if (!isSupabaseConfigured()) {
    const file = localFile(full.brandId);
    return withFileLock(file, async () => {
      const entries = await readJson<EmailHistoryEntry[]>(file, []);
      entries.unshift(full);
      await writeJson(file, entries);
      return full;
    });
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('history').insert({
    id: full.id, brand_id: full.brandId, template_type: full.templateType,
    engine: full.engine, model: full.model, prompt: full.prompt || null,
    subject: full.subject, content: full.content, html_snapshot: full.htmlSnapshot || null,
    rating: full.rating, notes: full.notes || null, created_at: full.createdAt, updated_at: full.updatedAt,
    created_by: toUuidOrNull(createdBy), schema_version: 4,
  });
  if (error) throw new Error(error.message);
  return full;
}

export async function updateHistoryEntry(
  brandId: string,
  id: string,
  patch: Partial<Pick<EmailHistoryEntry, 'rating' | 'notes' | 'htmlSnapshot' | 'subject' | 'content'>>,
): Promise<EmailHistoryEntry | null> {
  if (!isSupabaseConfigured()) {
    const file = localFile(brandId);
    return withFileLock(file, async () => {
      const entries = await readJson<EmailHistoryEntry[]>(file, []);
      const index = entries.findIndex(entry => entry.id === id);
      if (index < 0) return null;
      entries[index] = { ...entries[index], ...patch, updatedAt: new Date().toISOString() };
      await writeJson(file, entries);
      return entries[index];
    });
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.rating !== undefined) updates.rating = patch.rating;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (patch.htmlSnapshot !== undefined) updates.html_snapshot = patch.htmlSnapshot;
  if (patch.subject !== undefined) updates.subject = patch.subject;
  if (patch.content !== undefined) updates.content = patch.content;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('history').update(updates).eq('id', id).eq('brand_id', brandId).select().maybeSingle();
  return error || !data ? null : mapHistoryFromDB(data as HistoryRow);
}

export async function deleteHistoryEntry(brandId: string, id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const file = localFile(brandId);
    return withFileLock(file, async () => {
      const entries = await readJson<EmailHistoryEntry[]>(file, []);
      const filtered = entries.filter(entry => entry.id !== id);
      if (filtered.length === entries.length) return false;
      await writeJson(file, filtered);
      return true;
    });
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('history').delete().eq('id', id).eq('brand_id', brandId);
  return !error;
}

export async function getHistoryEntry(brandId: string, id: string): Promise<EmailHistoryEntry | undefined> {
  if (!isSupabaseConfigured()) return (await readJson<EmailHistoryEntry[]>(localFile(brandId), [])).find(entry => entry.id === id);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('history').select('*').eq('id', id).eq('brand_id', brandId).maybeSingle();
  return error || !data ? undefined : mapHistoryFromDB(data as HistoryRow);
}

export async function getTopRatedExamples(brandId: string, count: number): Promise<EmailHistoryEntry[]> {
  return (await listHistory(brandId)).filter(entry => entry.rating === 'up').slice(0, count);
}

// Ejemplos calificados para few-shot: los 👍 se imitan, los 👎 se inyectan como anti-ejemplos
export async function getRatedExamples(brandId: string, upCount: number, downCount: number): Promise<EmailHistoryEntry[]> {
  const all = await listHistory(brandId);
  return [
    ...all.filter(entry => entry.rating === 'up').slice(0, upCount),
    ...all.filter(entry => entry.rating === 'down').slice(0, downCount),
  ];
}
