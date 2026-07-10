import { NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';

type Ctx = { params: Promise<{ brandId: string; filename: string }> };

const BUCKET = 'assets';

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { brandId, filename } = await params;
    const decoded = decodeURIComponent(filename);

    const { data } = supabase
      .storage
      .from(BUCKET)
      .getPublicUrl(`${brandId}/${decoded}`);

    return NextResponse.redirect(data.publicUrl);
  } catch (error) {
    console.error('Error in asset GET:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer la imagen' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { brandId, filename } = await params;
    const decoded = decodeURIComponent(filename);
    
    const filePath = `${brandId}/${decoded}`;

    const { error } = await supabase
      .storage
      .from(BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Supabase remove error:', error);
      return NextResponse.json({ error: 'Error al eliminar la imagen' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in asset DELETE:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al eliminar la imagen' }, { status: 500 });
  }
}
