import { NextResponse } from 'next/server';
import { createBrand, getAllBrands, searchBrands, seedIfEmpty } from '@/lib/server/brandStore';
import { authenticationErrorResponse, requireUser } from '@/lib/server/auth';
import { brandInputSchema, validationMessage } from '@/lib/server/api-schemas';

export async function GET(req: Request) {
  try {
    await requireUser();
    await seedIfEmpty();
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || undefined;
    const brands = q || category ? await searchBrands(q, category) : await getAllBrands();
    return NextResponse.json(brands);
  } catch (error) {
    const authResponse = authenticationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error in brands GET:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer las marcas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = brandInputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
    const data = parsed.data;
    const brand = await createBrand(data, user.id);
    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    const authResponse = authenticationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error in brands POST:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al crear la marca' }, { status: 500 });
  }
}
