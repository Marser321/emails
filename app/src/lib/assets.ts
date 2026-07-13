import type { EmailAsset } from './types';

export async function listAssets(
  brandId: string,
  filters: { kind?: EmailAsset['kind']; query?: string } = {},
): Promise<EmailAsset[]> {
  const params = new URLSearchParams({ brandId });
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.query) params.set('q', filters.query);
  const res = await fetch(`/api/assets?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error al listar los assets');
  return data.assets ?? [];
}

export async function uploadAsset(
  file: File,
  brandId: string,
  metadata: { kind?: EmailAsset['kind']; altText?: string; intendedUse?: string } = {},
): Promise<EmailAsset> {
  const form = new FormData();
  form.append('file', file);
  form.append('brandId', brandId);
  form.append('kind', metadata.kind || 'other');
  form.append('altText', metadata.altText || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
  if (metadata.intendedUse) form.append('intendedUse', metadata.intendedUse);
  const res = await fetch('/api/assets', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error al subir el archivo');
  return data.asset;
}

export async function updateAssetMetadata(
  id: string,
  patch: Pick<EmailAsset, 'kind' | 'altText' | 'author' | 'intendedUse'>,
): Promise<void> {
  const res = await fetch(`/api/assets/item/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error al editar el asset');
}

export async function deleteAsset(asset: EmailAsset): Promise<void> {
  const res = await fetch(`/api/assets/item/${encodeURIComponent(asset.id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al eliminar el archivo');
  }
}

export function isLocalAssetUrl(url: string): boolean {
  return url.startsWith('/api/assets/') || url.startsWith('/email-assets/');
}
