import { NextResponse } from 'next/server';
import { AuthenticationError, requireUser } from '@/lib/server/auth';
import { isSupabaseConfigured } from '@/lib/server/env';
import { createServerSupabase } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ brandId: string; filename: string }> };
const BUCKET = 'assets';

function safeSegment(value: string) {
  const sanitized = decodeURIComponent(value).replace(/[^a-zA-Z0-9_.-]/g, '');
  return sanitized.slice(0, 160);
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ error: 'Asset no disponible' }, { status: 404 });
    const { brandId, filename } = await params;
    const supabase = await createServerSupabase();
    const filePath = `${safeSegment(brandId)}/${safeSegment(filename)}`;
    return NextResponse.redirect(supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl);
  } catch {
    return NextResponse.json({ error: 'Asset no disponible' }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireUser();
    const { brandId, filename } = await params;
    const supabase = await createServerSupabase();
    const filePath = `${safeSegment(brandId)}/${safeSegment(filename)}`;
    const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al eliminar la imagen' }, { status: error instanceof AuthenticationError ? 401 : 500 });
  }
}
