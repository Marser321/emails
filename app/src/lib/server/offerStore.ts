import type { Offer } from '@/lib/types';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from './env';
import { readJson, withFileLock, writeJson } from './storage';

const LOCAL_FILE = 'offers.json';

interface OfferRow {
  id: string; brand_id: string; name: string; type: Offer['type']; value: string; currency: string;
  original_price: string | null; sale_price: string | null; code: string | null; starts_at: string | null; ends_at: string | null;
  terms: string; audience: string; urgency: string; landing_url: string; status: Offer['status']; created_at: string; updated_at: string;
}

function generateId() { return `offer_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; }
function fromRow(row: OfferRow): Offer {
  return { id: row.id, brandId: row.brand_id, name: row.name, type: row.type, value: row.value, currency: row.currency,
    originalPrice: row.original_price || undefined, salePrice: row.sale_price || undefined, code: row.code || undefined,
    startsAt: row.starts_at || undefined, endsAt: row.ends_at || undefined, terms: row.terms, audience: row.audience,
    urgency: row.urgency, landingUrl: row.landing_url, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}
function toRow(offer: Offer): OfferRow {
  return { id: offer.id, brand_id: offer.brandId, name: offer.name, type: offer.type, value: offer.value, currency: offer.currency,
    original_price: offer.originalPrice || null, sale_price: offer.salePrice || null, code: offer.code || null,
    starts_at: offer.startsAt || null, ends_at: offer.endsAt || null, terms: offer.terms, audience: offer.audience,
    urgency: offer.urgency, landing_url: offer.landingUrl, status: offer.status, created_at: offer.createdAt, updated_at: offer.updatedAt };
}

export async function listOffers(brandId?: string): Promise<Offer[]> {
  if (!isSupabaseConfigured()) {
    const offers = await readJson<Offer[]>(LOCAL_FILE, []);
    return offers.filter(offer => !brandId || offer.brandId === brandId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const supabase = await createServerSupabase();
  let request = supabase.from('offers').select('*').order('updated_at', { ascending: false });
  if (brandId) request = request.eq('brand_id', brandId);
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return ((data || []) as OfferRow[]).map(fromRow);
}

export async function getOffer(id: string): Promise<Offer | undefined> {
  if (!isSupabaseConfigured()) return (await readJson<Offer[]>(LOCAL_FILE, [])).find(offer => offer.id === id);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('offers').select('*').eq('id', id).maybeSingle();
  return error || !data ? undefined : fromRow(data as OfferRow);
}

export async function createOffer(input: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Offer> {
  const now = new Date().toISOString();
  const offer: Offer = { ...input, id: input.id || generateId(), createdAt: now, updatedAt: now };
  if (!isSupabaseConfigured()) return withFileLock(LOCAL_FILE, async () => { const rows = await readJson<Offer[]>(LOCAL_FILE, []); rows.unshift(offer); await writeJson(LOCAL_FILE, rows); return offer; });
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('offers').insert(toRow(offer));
  if (error) throw new Error(error.message);
  return offer;
}

export async function updateOffer(id: string, patch: Partial<Offer>): Promise<Offer | null> {
  const current = await getOffer(id);
  if (!current) return null;
  const next: Offer = { ...current, ...patch, id, brandId: current.brandId, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
  if (!isSupabaseConfigured()) return withFileLock(LOCAL_FILE, async () => { const rows = await readJson<Offer[]>(LOCAL_FILE, []); const index = rows.findIndex(row => row.id === id); if (index < 0) return null; rows[index] = next; await writeJson(LOCAL_FILE, rows); return next; });
  const supabase = await createServerSupabase();
  const row = toRow(next);
  const { data, error } = await supabase.from('offers').update(row).eq('id', id).select().maybeSingle();
  return error || !data ? null : fromRow(data as OfferRow);
}

export async function deleteOffer(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return withFileLock(LOCAL_FILE, async () => { const rows = await readJson<Offer[]>(LOCAL_FILE, []); const next = rows.filter(row => row.id !== id); if (next.length === rows.length) return false; await writeJson(LOCAL_FILE, next); return true; });
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('offers').delete().eq('id', id);
  return !error;
}
