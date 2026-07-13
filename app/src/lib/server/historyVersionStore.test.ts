import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { addHistoryEntry, getHistoryEntry, updateHistoryEntry } from './historyStore';
import { createHistoryVersion, listHistoryVersions, restoreHistoryVersion } from './historyVersionStore';

describe('immutable history versions', () => {
  let dir = '';
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'email-history-'));
    vi.stubEnv('EMAILBUILDER_DATA_DIR', dir); vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', ''); vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
  });
  afterEach(async () => { vi.unstubAllEnvs(); await rm(dir, { recursive: true, force: true }); });

  it('appends versions and restores without deleting later progress', async () => {
    const entry = await addHistoryEntry({ brandId: 'brand', templateType: 'newsletter', engine: 'gemini', model: 'model', prompt: 'prompt', subject: 'Inicial', content: { subject: 'Inicial', blocks: [{ id: 'h', type: 'header' }, { id: 't', type: 'text', headline: 'Inicial' }, { id: 'f', type: 'footer' }] }, htmlSnapshot: '<p>Inicial</p>', rating: null, notes: '' });
    const first = await createHistoryVersion(entry, 'generated');
    const edited = await updateHistoryEntry('brand', entry.id, { subject: 'Editado', content: { ...entry.content, subject: 'Editado' }, htmlSnapshot: '<p>Editado</p>' });
    await createHistoryVersion(edited!, 'autosave');
    const restored = await restoreHistoryVersion('brand', entry.id, first.id);
    expect(restored?.entry.subject).toBe('Inicial');
    expect((await listHistoryVersions(entry.id)).map(version => version.reason)).toEqual(['restored', 'autosave', 'generated']);
    expect((await getHistoryEntry('brand', entry.id))?.subject).toBe('Inicial');
  });
});
