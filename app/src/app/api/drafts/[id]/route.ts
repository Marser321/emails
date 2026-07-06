import { NextResponse } from 'next/server';
import { Draft } from '@/lib/types';
import { readJson, writeJson, withFileLock } from '@/lib/server/storage';

const FILE = 'drafts.json';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const removed = await withFileLock(FILE, async () => {
      const drafts = await readJson<Draft[]>(FILE, []);
      const filtered = drafts.filter(d => d.id !== id);
      if (filtered.length === drafts.length) return false;
      await writeJson(FILE, filtered);
      return true;
    });
    if (!removed) {
      return NextResponse.json({ error: 'Borrador no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in drafts DELETE:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al eliminar el borrador' }, { status: 500 });
  }
}
