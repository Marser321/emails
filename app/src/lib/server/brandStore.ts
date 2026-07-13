import { Brand, DEFAULT_BRAND } from '@/lib/types';
import { isSupabaseConfigured } from './env';
import { readJson, withFileLock, writeJson } from './storage';
import { createServerSupabase } from '@/lib/supabase/server';
import { toUuidOrNull } from './auth';

const LOCAL_FILE = 'brands.json';

interface BrandRow {
  id: string;
  name: string;
  category: string;
  colors: Brand['colors'];
  fonts: Brand['fonts'];
  logo: Brand['logo'];
  footer: Brand['footer'];
  voice: Brand['voice'] | null;
  intelligence: Brand['intelligence'] | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

function mapBrandFromDB(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    colors: row.colors,
    fonts: row.fonts,
    logo: row.logo,
    footer: row.footer,
    voice: row.voice || undefined,
    intelligence: row.intelligence || undefined,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(brand: Brand): BrandRow {
  return {
    id: brand.id,
    name: brand.name,
    category: brand.category,
    colors: brand.colors,
    fonts: brand.fonts,
    logo: brand.logo,
    footer: brand.footer,
    voice: brand.voice || null,
    intelligence: brand.intelligence || null,
    is_favorite: brand.isFavorite,
    created_at: brand.createdAt,
    updated_at: brand.updatedAt,
  };
}

async function localBrands(): Promise<Brand[]> {
  return readJson<Brand[]>(LOCAL_FILE, []);
}

export async function getAllBrands(): Promise<Brand[]> {
  if (!isSupabaseConfigured()) return localBrands();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('brands').select('*').order('name');
  if (error) throw new Error(`No se pudieron leer las marcas: ${error.message}`);
  return ((data || []) as BrandRow[]).map(mapBrandFromDB);
}

export async function getBrandById(id: string): Promise<Brand | undefined> {
  if (!isSupabaseConfigured()) return (await localBrands()).find(brand => brand.id === id);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('brands').select('*').eq('id', id).maybeSingle();
  if (error || !data) return undefined;
  return mapBrandFromDB(data as BrandRow);
}

export async function searchBrands(query: string, category?: string): Promise<Brand[]> {
  let brands = await getAllBrands();
  if (category && category !== 'Todas') brands = brands.filter(brand => brand.category === category);
  if (query) {
    const normalized = query.toLocaleLowerCase('es');
    brands = brands.filter(brand => `${brand.name} ${brand.category}`.toLocaleLowerCase('es').includes(normalized));
  }
  return brands.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name, 'es'));
}

export async function createBrand(data: Partial<Brand>, createdBy?: string): Promise<Brand> {
  const now = new Date().toISOString();
  const brand = { ...DEFAULT_BRAND, ...data, id: data.id || generateId(), createdAt: now, updatedAt: now } as Brand;

  if (!isSupabaseConfigured()) {
    return withFileLock(LOCAL_FILE, async () => {
      const brands = await localBrands();
      brands.push(brand);
      await writeJson(LOCAL_FILE, brands);
      return brand;
    });
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('brands').insert({ ...toRow(brand), created_by: toUuidOrNull(createdBy) });
  if (error) throw new Error(error.message);
  return brand;
}

export async function updateBrand(id: string, data: Partial<Brand>): Promise<Brand | null> {
  if (!isSupabaseConfigured()) {
    return withFileLock(LOCAL_FILE, async () => {
      const brands = await localBrands();
      const index = brands.findIndex(brand => brand.id === id);
      if (index < 0) return null;
      brands[index] = { ...brands[index], ...data, id, updatedAt: new Date().toISOString() };
      await writeJson(LOCAL_FILE, brands);
      return brands[index];
    });
  }

  const updates: Partial<BrandRow> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.category !== undefined) updates.category = data.category;
  if (data.colors !== undefined) updates.colors = data.colors;
  if (data.fonts !== undefined) updates.fonts = data.fonts;
  if (data.logo !== undefined) updates.logo = data.logo;
  if (data.footer !== undefined) updates.footer = data.footer;
  if (data.voice !== undefined) updates.voice = data.voice;
  if (data.intelligence !== undefined) updates.intelligence = data.intelligence;
  if (data.isFavorite !== undefined) updates.is_favorite = data.isFavorite;

  const supabase = await createServerSupabase();
  const { data: updated, error } = await supabase.from('brands').update(updates).eq('id', id).select().maybeSingle();
  if (error || !updated) return null;
  return mapBrandFromDB(updated as BrandRow);
}

export async function deleteBrand(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return withFileLock(LOCAL_FILE, async () => {
      const brands = await localBrands();
      const filtered = brands.filter(brand => brand.id !== id);
      if (filtered.length === brands.length) return false;
      await writeJson(LOCAL_FILE, filtered);
      return true;
    });
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('brands').delete().eq('id', id);
  return !error;
}

export async function importBrands(imported: Partial<Brand>[], createdBy?: string): Promise<number> {
  const existingNames = new Set((await getAllBrands()).map(brand => brand.name.toLocaleLowerCase('es')));
  let count = 0;
  for (const item of imported) {
    if (!item.name || existingNames.has(item.name.toLocaleLowerCase('es'))) continue;
    await createBrand(item, createdBy);
    existingNames.add(item.name.toLocaleLowerCase('es'));
    count += 1;
  }
  return count;
}

export async function seedIfEmpty(): Promise<void> {
  if ((await getAllBrands()).length > 0) return;
  const seeds = await readJson<Brand[]>(LOCAL_FILE, []);
  for (const seed of seeds) await createBrand(seed);
}
