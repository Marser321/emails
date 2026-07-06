import { NextResponse } from 'next/server';
import { Brand, Draft } from '@/lib/types';
import { importBrands, seedIfEmpty } from '@/lib/server/brandStore';
import { getSettings, saveSettings } from '@/lib/server/settingsStore';
import { readJson, writeJson, withFileLock } from '@/lib/server/storage';

const DRAFTS_FILE = 'drafts.json';

// Migración one-time desde localStorage — idempotente (dedupe por nombre/id, la key solo si no existe)
export async function POST(req: Request) {
  try {
    const { brands, drafts, geminiApiKey } = await req.json();
    const result = { brands: 0, drafts: 0, geminiKey: false };

    await seedIfEmpty();

    if (Array.isArray(brands) && brands.length > 0) {
      result.brands = await importBrands(brands as Partial<Brand>[]);
    }

    if (Array.isArray(drafts) && drafts.length > 0) {
      result.drafts = await withFileLock(DRAFTS_FILE, async () => {
        const existing = await readJson<Draft[]>(DRAFTS_FILE, []);
        const existingIds = new Set(existing.map(d => d.id));
        const fresh = (drafts as Draft[]).filter(d => d?.id && d?.name && !existingIds.has(d.id));
        if (fresh.length > 0) {
          await writeJson(DRAFTS_FILE, [...fresh, ...existing]);
        }
        return fresh.length;
      });
    }

    if (typeof geminiApiKey === 'string' && geminiApiKey.trim()) {
      const settings = await getSettings();
      if (!settings.geminiApiKey) {
        await saveSettings({ geminiApiKey: geminiApiKey.trim() });
        result.geminiKey = true;
      }
    }

    await saveSettings({ migratedFromLocalStorage: true });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in migrate POST:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error en la migración' }, { status: 500 });
  }
}
