import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { settingsPatchSchema, validationMessage } from '@/lib/server/api-schemas';
import { requireUser, AuthenticationError } from '@/lib/server/auth';
import { getSupabasePublicConfig } from '@/lib/server/env';
import { getSettings, saveSettings } from '@/lib/server/settingsStore';
import { providerAvailability } from '@/lib/server/provider-registry';

// Base pública del bucket de assets — los /api/assets/<brand>/<file> del HTML
// se pueden reescribir a esta URL sin subir nada a un CDN aparte.
function supabaseAssetsBaseUrl(): string {
  const config = getSupabasePublicConfig();
  return config ? `${config.url.replace(/\/+$/, '')}/storage/v1/object/public/assets` : '';
}

async function publicSettings() {
  const settings = await getSettings();
  const providers = providerAvailability();
  return {
    hasGeminiKey: providers.gemini,
    hasGroqKey: providers.groq,
    hasAnthropicKey: providers.claude,
    defaultEngine: settings.defaultEngine,
    assetsPublicBaseUrl: settings.assetsPublicBaseUrl || '',
    supabaseAssetsBaseUrl: supabaseAssetsBaseUrl(),
  };
}

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await publicSettings());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer la configuración' }, { status: error instanceof AuthenticationError ? 401 : 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireUser();
    const patch = settingsPatchSchema.parse(await req.json());
    await saveSettings(patch);
    return NextResponse.json(await publicSettings());
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ZodError) return NextResponse.json({ error: validationMessage(error) }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al guardar la configuración' }, { status: 500 });
  }
}
