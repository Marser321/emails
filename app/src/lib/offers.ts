import type { Offer } from './types';

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || `Error ${response.status}`);
  return data as T;
}

export const listOffers = (brandId?: string) => json<Offer[]>(`/api/offers${brandId ? `?brandId=${encodeURIComponent(brandId)}` : ''}`);
export const createOffer = (offer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>) => json<Offer>('/api/offers', { method: 'POST', body: JSON.stringify(offer) });
export const updateOffer = (id: string, patch: Partial<Offer>) => json<Offer>(`/api/offers/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteOffer = (id: string) => json<{ success: true }>(`/api/offers/${id}`, { method: 'DELETE' });
