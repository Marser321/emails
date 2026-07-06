import { NextResponse } from 'next/server';
import { getSettings, maskKey, saveSettings } from '@/lib/server/settingsStore';

// Nunca devolver las keys completas al cliente — solo enmascaradas + flags
async function publicSettings() {
  const s = await getSettings();
  return {
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY || s.geminiApiKey),
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY || s.anthropicApiKey),
    geminiKeyMasked: process.env.GEMINI_API_KEY ? '(desde .env)' : maskKey(s.geminiApiKey),
    anthropicKeyMasked: process.env.ANTHROPIC_API_KEY ? '(desde .env)' : maskKey(s.anthropicApiKey),
    defaultEngine: s.defaultEngine,
    assetsPublicBaseUrl: s.assetsPublicBaseUrl || '',
  };
}

export async function GET() {
  try {
    return NextResponse.json(await publicSettings());
  } catch (error) {
    console.error('Error in settings GET:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al leer la configuración' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (typeof body.geminiApiKey === 'string') patch.geminiApiKey = body.geminiApiKey.trim();
    if (typeof body.anthropicApiKey === 'string') patch.anthropicApiKey = body.anthropicApiKey.trim();
    if (body.defaultEngine === 'gemini' || body.defaultEngine === 'claude') patch.defaultEngine = body.defaultEngine;
    if (typeof body.assetsPublicBaseUrl === 'string') patch.assetsPublicBaseUrl = body.assetsPublicBaseUrl.trim();
    await saveSettings(patch);
    return NextResponse.json(await publicSettings());
  } catch (error) {
    console.error('Error in settings PUT:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al guardar la configuración' }, { status: 500 });
  }
}
