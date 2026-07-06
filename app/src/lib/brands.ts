// Brand service — cliente fetch hacia las API routes; los datos viven en data/brands.json
import { Brand } from './types';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getAllBrands(): Promise<Brand[]> {
  return api<Brand[]>('/api/brands');
}

export async function getBrandById(id: string): Promise<Brand | undefined> {
  try {
    return await api<Brand>(`/api/brands/${id}`);
  } catch {
    return undefined;
  }
}

export async function searchBrands(query: string, category?: string): Promise<Brand[]> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (category && category !== 'Todas') params.set('category', category);
  const qs = params.toString();
  return api<Brand[]>(`/api/brands${qs ? `?${qs}` : '?q=&category=Todas'}`);
}

export async function createBrand(data: Partial<Brand>): Promise<Brand> {
  return api<Brand>('/api/brands', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateBrand(id: string, data: Partial<Brand>): Promise<Brand | null> {
  try {
    return await api<Brand>(`/api/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  } catch {
    return null;
  }
}

export async function deleteBrand(id: string): Promise<boolean> {
  try {
    await api(`/api/brands/${id}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const brand = await getBrandById(id);
  if (!brand) return false;
  const updated = await updateBrand(id, { isFavorite: !brand.isFavorite });
  return updated?.isFavorite ?? false;
}

export async function duplicateBrand(id: string): Promise<Brand | null> {
  const source = await getBrandById(id);
  if (!source) return null;
  const copy: Partial<Brand> = { ...source, name: `${source.name} (Copia)`, isFavorite: false };
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  return createBrand(copy);
}

export async function exportBrands(): Promise<string> {
  const brands = await getAllBrands();
  return JSON.stringify(brands, null, 2);
}

export async function importBrands(json: string): Promise<number> {
  try {
    const imported: Brand[] = JSON.parse(json);
    if (!Array.isArray(imported)) throw new Error('Invalid format');
    const { imported: count } = await api<{ imported: number }>('/api/brands/import', {
      method: 'POST',
      body: JSON.stringify(imported),
    });
    return count;
  } catch {
    return -1;
  }
}

// El server siembra las marcas demo en el primer GET — se mantiene por compatibilidad
export async function seedSampleBrands(): Promise<void> {
  // no-op
}
