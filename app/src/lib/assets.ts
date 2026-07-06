// Cliente de la biblioteca de assets (data/assets/<brandId>/)
import { EmailAsset } from './types';

export async function listAssets(brandId: string): Promise<EmailAsset[]> {
  const res = await fetch(`/api/assets?brandId=${encodeURIComponent(brandId)}`);
  if (!res.ok) throw new Error('Error al listar los assets');
  const data = await res.json();
  return data.assets ?? [];
}

export async function uploadAsset(file: File, brandId: string): Promise<EmailAsset> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('brandId', brandId);
  const res = await fetch('/api/assets', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al subir el archivo');
  return data.asset;
}

export async function deleteAsset(brandId: string, filename: string): Promise<void> {
  const res = await fetch(
    `/api/assets/${encodeURIComponent(brandId)}/${encodeURIComponent(filename)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al eliminar el archivo');
  }
}

export function assetUrl(brandId: string, filename: string): string {
  return `/api/assets/${encodeURIComponent(brandId)}/${encodeURIComponent(filename)}`;
}

export function isLocalAssetUrl(url: string): boolean {
  return url.startsWith('/api/assets/');
}
