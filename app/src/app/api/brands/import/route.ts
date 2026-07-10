import { NextResponse } from 'next/server';
import { importBrands } from '@/lib/server/brandStore';
import { authenticationErrorResponse, requireUser } from '@/lib/server/auth';
import { brandImportSchema, validationMessage } from '@/lib/server/api-schemas';

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = brandImportSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
    const imported = await importBrands(parsed.data, user.id);
    return NextResponse.json({ imported });
  } catch (error) {
    const authResponse = authenticationErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error in brands import:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al importar marcas' }, { status: 500 });
  }
}
