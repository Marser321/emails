import { NextResponse } from 'next/server';
import { Draft } from '@/lib/types';
import { readJson, writeJson, withFileLock, generateId } from '@/lib/server/storage';

const FILE = 'drafts.json';

export async function GET() {
  try {
    const drafts = await readJson<Draft[]>(FILE, []);
    return NextResponse.json(drafts);
  } catch (error) {
    console.error('Error in drafts GET:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer borradores' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const draft: Draft = await req.json();
    if (!draft?.name) {
      return NextResponse.json({ error: 'El borrador necesita un nombre' }, { status: 400 });
    }
    const saved = await withFileLock(FILE, async () => {
      const drafts = await readJson<Draft[]>(FILE, []);
      const entry: Draft = { ...draft, id: draft.id || generateId() };
      const updated = [entry, ...drafts];
      await writeJson(FILE, updated);
      return entry;
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error('Error in drafts POST:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al guardar el borrador' }, { status: 500 });
  }
}
