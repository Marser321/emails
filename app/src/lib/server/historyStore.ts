import { EmailHistoryEntry } from '@/lib/types';
import { supabase } from './supabase';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

// Convert snake_case from DB to camelCase for History object
function mapHistoryFromDB(dbEntry: any): EmailHistoryEntry {
  return {
    id: dbEntry.id,
    brandId: dbEntry.brand_id,
    templateType: dbEntry.template_type,
    engine: dbEntry.engine,
    model: dbEntry.model,
    prompt: dbEntry.prompt,
    subject: dbEntry.subject,
    content: dbEntry.content,
    htmlSnapshot: dbEntry.html_snapshot,
    rating: dbEntry.rating,
    notes: dbEntry.notes,
    createdAt: dbEntry.created_at,
    updatedAt: dbEntry.updated_at,
  };
}

export async function listHistory(brandId?: string, limit?: number, query?: string): Promise<EmailHistoryEntry[]> {
  let qb = supabase.from('history').select('*').order('created_at', { ascending: false });

  if (brandId) {
    qb = qb.eq('brand_id', brandId);
  }

  if (limit) {
    qb = qb.limit(limit);
  }

  const { data, error } = await qb;
  if (error) {
    console.error('Error listing history:', error);
    return [];
  }

  let entries = (data || []).map(mapHistoryFromDB);

  if (query) {
    const q = query.toLowerCase();
    entries = entries.filter(e =>
      e.subject?.toLowerCase().includes(q) ||
      e.prompt?.toLowerCase().includes(q)
    );
  }

  return entries;
}

export async function addHistoryEntry(
  entry: Omit<EmailHistoryEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<EmailHistoryEntry> {
  const now = new Date().toISOString();
  const full: EmailHistoryEntry = { ...entry, id: generateId(), createdAt: now, updatedAt: now };

  const { error } = await supabase.from('history').insert({
    id: full.id,
    brand_id: full.brandId,
    template_type: full.templateType,
    engine: full.engine,
    model: full.model,
    prompt: full.prompt || null,
    subject: full.subject,
    content: full.content,
    html_snapshot: full.htmlSnapshot || null,
    rating: full.rating || null,
    notes: full.notes || null,
    created_at: full.createdAt,
    updated_at: full.updatedAt,
  });

  if (error) {
    console.error('Error adding history entry:', error);
    throw new Error(error.message);
  }

  return full;
}

export async function updateHistoryEntry(
  brandId: string, // Kept for API compatibility, though we can just use id
  id: string,
  patch: Partial<Pick<EmailHistoryEntry, 'rating' | 'notes' | 'htmlSnapshot' | 'subject' | 'content'>>
): Promise<EmailHistoryEntry | null> {
  const updates: any = { updated_at: new Date().toISOString() };
  if (patch.rating !== undefined) updates.rating = patch.rating;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (patch.htmlSnapshot !== undefined) updates.html_snapshot = patch.htmlSnapshot;
  if (patch.subject !== undefined) updates.subject = patch.subject;
  if (patch.content !== undefined) updates.content = patch.content;

  const { data, error } = await supabase
    .from('history')
    .update(updates)
    .eq('id', id)
    .eq('brand_id', brandId) // ensure safety
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating history entry:', error);
    return null;
  }

  return mapHistoryFromDB(data);
}

export async function deleteHistoryEntry(brandId: string, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('history')
    .delete()
    .eq('id', id)
    .eq('brand_id', brandId);

  if (error) {
    console.error('Error deleting history entry:', error);
    return false;
  }
  return true;
}

export async function getHistoryEntry(brandId: string, id: string): Promise<EmailHistoryEntry | undefined> {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .eq('id', id)
    .eq('brand_id', brandId)
    .single();

  if (error || !data) return undefined;
  return mapHistoryFromDB(data);
}

// Few-shot: los emails mejor valorados (👍), más recientes primero
export async function getTopRatedExamples(brandId: string, n: number): Promise<EmailHistoryEntry[]> {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .eq('brand_id', brandId)
    .eq('rating', 'up')
    .order('created_at', { ascending: false })
    .limit(n);

  if (error) {
    console.error('Error getting top rated examples:', error);
    return [];
  }

  return (data || []).map(mapHistoryFromDB);
}
