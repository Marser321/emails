import { NextResponse } from 'next/server';
import { deleteBrand, getBrandById, updateBrand } from '@/lib/server/brandStore';
import { authenticationErrorResponse, requireUser } from '@/lib/server/auth';
import { brandPatchSchema, validationMessage } from '@/lib/server/api-schemas';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireUser();
    const { id } = await params;
    const brand = await getBrandById(id);
    if (!brand) {
      return NextResponse.json({ error: 'Marca no encontrada' }, { status: 404 });
    }
    return NextResponse.json(brand);
  } catch (error) {
    const authResponse = authenticationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error in brand GET:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer la marca' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    await requireUser();
    const { id } = await params;
    const parsed = brandPatchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
    const data = parsed.data;
    const brand = await updateBrand(id, data);
    if (!brand) {
      return NextResponse.json({ error: 'Marca no encontrada' }, { status: 404 });
    }
    return NextResponse.json(brand);
  } catch (error) {
    const authResponse = authenticationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error in brand PUT:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al actualizar la marca' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireUser();
    const { id } = await params;
    const ok = await deleteBrand(id);
    if (!ok) {
      return NextResponse.json({ error: 'Marca no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authenticationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error in brand DELETE:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al eliminar la marca' }, { status: 500 });
  }
}
