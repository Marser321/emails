import { NextResponse } from 'next/server';
import { createBrand, getAllBrands, searchBrands, seedIfEmpty } from '@/lib/server/brandStore';

export async function GET(req: Request) {
  try {
    await seedIfEmpty();
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || undefined;
    const brands = q || category ? await searchBrands(q, category) : await getAllBrands();
    return NextResponse.json(brands);
  } catch (error) {
    console.error('Error in brands GET:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer las marcas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!data?.name) {
      return NextResponse.json({ error: 'El nombre de la marca es obligatorio' }, { status: 400 });
    }
    const brand = await createBrand(data);
    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error('Error in brands POST:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al crear la marca' }, { status: 500 });
  }
}
