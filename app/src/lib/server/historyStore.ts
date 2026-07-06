// Historial de emails generados — data/history/<brandId>.json (más reciente primero)
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EmailHistoryEntry } from '@/lib/types';
import { dataPath, generateId, readJson, withFileLock, writeJson } from './storage';

const HISTORY_DIR = 'history';
const MAX_ENTRIES_PER_BRAND = 200;

function brandFile(brandId: string): string {
  // El brandId viene de nuestros propios stores, pero saneamos por las dudas
  const safe = brandId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(HISTORY_DIR, `${safe}.json`);
}

export async function listHistory(brandId?: string, limit?: number, query?: string): Promise<EmailHistoryEntry[]> {
  let entries: EmailHistoryEntry[];

  if (brandId) {
    entries = await readJson<EmailHistoryEntry[]>(brandFile(brandId), []);
  } else {
    // Agrega el historial de todas las marcas
    let files: string[] = [];
    try {
      files = (await fs.readdir(dataPath(HISTORY_DIR))).filter(f => f.endsWith('.json'));
    } catch {
      files = [];
    }
    const all = await Promise.all(
      files.map(f => readJson<EmailHistoryEntry[]>(path.join(HISTORY_DIR, f), []))
    );
    entries = all.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (query) {
    const q = query.toLowerCase();
    entries = entries.filter(e =>
      e.subject?.toLowerCase().includes(q) ||
      e.prompt?.toLowerCase().includes(q)
    );
  }

  return typeof limit === 'number' ? entries.slice(0, limit) : entries;
}

export async function addHistoryEntry(
  entry: Omit<EmailHistoryEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<EmailHistoryEntry> {
  const file = brandFile(entry.brandId);
  return withFileLock(file, async () => {
    const entries = await readJson<EmailHistoryEntry[]>(file, []);
    const now = new Date().toISOString();
    const full: EmailHistoryEntry = { ...entry, id: generateId(), createdAt: now, updatedAt: now };
    const updated = [full, ...entries].slice(0, MAX_ENTRIES_PER_BRAND);
    await writeJson(file, updated);
    return full;
  });
}

export async function updateHistoryEntry(
  brandId: string,
  id: string,
  patch: Partial<Pick<EmailHistoryEntry, 'rating' | 'notes' | 'htmlSnapshot' | 'subject' | 'content'>>
): Promise<EmailHistoryEntry | null> {
  const file = brandFile(brandId);
  return withFileLock(file, async () => {
    const entries = await readJson<EmailHistoryEntry[]>(file, []);
    const index = entries.findIndex(e => e.id === id);
    if (index === -1) return null;
    entries[index] = { ...entries[index], ...patch, updatedAt: new Date().toISOString() };
    await writeJson(file, entries);
    return entries[index];
  });
}

export async function deleteHistoryEntry(brandId: string, id: string): Promise<boolean> {
  const file = brandFile(brandId);
  return withFileLock(file, async () => {
    const entries = await readJson<EmailHistoryEntry[]>(file, []);
    const filtered = entries.filter(e => e.id !== id);
    if (filtered.length === entries.length) return false;
    await writeJson(file, filtered);
    return true;
  });
}

export async function getHistoryEntry(brandId: string, id: string): Promise<EmailHistoryEntry | undefined> {
  const entries = await readJson<EmailHistoryEntry[]>(brandFile(brandId), []);
  return entries.find(e => e.id === id);
}

// Few-shot: los emails mejor valorados (👍), más recientes primero
export async function getTopRatedExamples(brandId: string, n: number): Promise<EmailHistoryEntry[]> {
  const entries = await readJson<EmailHistoryEntry[]>(brandFile(brandId), []);
  return entries.filter(e => e.rating === 'up').slice(0, n);
}
