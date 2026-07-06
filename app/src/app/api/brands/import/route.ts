import { NextResponse } from 'next/server';
import { importBrands } from '@/lib/server/brandStore';

export async function POST(req: Request) {
  try {
    const brands = await req.json();
    if (!Array.isArray(brands)) {
      return NextResponse.json({ error: 'Formato inválido: se espera un array de marcas' }, { status: 400 });
    }
    const imported = await importBrands(brands);
    return NextResponse.json({ imported });
  } catch (error) {
    console.error('Error in brands import:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al importar marcas' }, { status: 500 });
  }
}
