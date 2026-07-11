import type { Draft } from '@/lib/types';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from './env';
import { generateId, readJson, withFileLock, writeJson } from './storage';

const LOCAL_FILE = 'drafts.json';

interface DraftRow {
  id: string;
  name: string;
  brand_name: string;
  template_name: string;
  brand_id: string;
  template: Draft['template'];
  content: Draft['content'];
  date: string;
}

function fromRow(row: DraftRow): Draft {
  return {
    id: row.id,
    name: row.name,
    brandName: row.brand_name,
    templateName: row.template_name,
    brandId: row.brand_id,
    template: row.template,
    content: row.content,
    date: row.date,
  };
}

export async function listDrafts(): Promise<Draft[]> {
  if (!isSupabaseConfigured()) return readJson<Draft[]>(LOCAL_FILE, []);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('drafts').select('*').order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as DraftRow[]).map(fromRow);
}

export async function saveDraft(input: Omit<Draft, 'id' | 'date'> & Partial<Pick<Draft, 'id' | 'date'>>, userId: string): Promise<Draft> {
  const draft: Draft = { ...input, id: input.id || generateId(), date: input.date || new Date().toISOString() };
  if (!isSupabaseConfigured()) {
    return withFileLock(LOCAL_FILE, async () => {
      const drafts = await readJson<Draft[]>(LOCAL_FILE, []);
      const index = drafts.findIndex(item => item.id === draft.id);
      if (index >= 0) drafts[index] = draft;
      else drafts.unshift(draft);
      await writeJson(LOCAL_FILE, drafts);
      return draft;
    });
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('drafts').upsert({
    id: draft.id,
    name: draft.name,
    brand_name: draft.brandName,
    template_name: draft.templateName,
    brand_id: draft.brandId,
    template: draft.template,
    content: draft.content,
    date: draft.date,
    schema_version: 4,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  return draft;
}

export async function deleteDraft(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return withFileLock(LOCAL_FILE, async () => {
      const drafts = await readJson<Draft[]>(LOCAL_FILE, []);
      const filtered = drafts.filter(item => item.id !== id);
      if (filtered.length === drafts.length) return false;
      await writeJson(LOCAL_FILE, filtered);
      return true;
    });
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('drafts').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}
