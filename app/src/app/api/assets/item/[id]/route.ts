import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { AuthenticationError, requireUser } from '@/lib/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';

const BUCKET = 'assets';
const patchSchema = z.object({
  kind: z.enum(['logo', 'hero', 'tile', 'icon', 'other']).optional(),
  altText: z.string().trim().min(1).max(240).optional(),
  author: z.string().trim().min(1).max(120).optional(),
  intendedUse: z.string().trim().max(500).optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'No hay cambios para guardar');

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requireUser();
    const { id } = await params;
    const input = patchSchema.parse(await req.json());
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.kind) updates.kind = input.kind;
    if (input.altText) updates.alt_text = input.altText;
    if (input.author) updates.author = input.author;
    if (input.intendedUse !== undefined) updates.intended_use = input.intendedUse;
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from('assets').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: 'Asset no encontrado' }, { status: 404 });
    return NextResponse.json({ asset: data });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Datos inválidos' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al editar el asset' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireUser();
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: asset, error: readError } = await supabase.from('assets').select('storage_path, thumbnail_path').eq('id', id).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!asset) return NextResponse.json({ error: 'Asset no encontrado' }, { status: 404 });
    const { error: deleteError } = await supabase.from('assets').delete().eq('id', id);
    if (deleteError) throw new Error(deleteError.message);
    const paths = [asset.storage_path, asset.thumbnail_path].filter((value): value is string => Boolean(value));
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al eliminar el asset' }, { status: error instanceof AuthenticationError ? 401 : 500 });
  }
}
