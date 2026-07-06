'use client';

import { useEffect } from 'react';

// Migración one-time de los datos viejos de localStorage hacia data/ (server-side).
// Los datos de localStorage NO se borran — quedan como backup.
export default function LegacyMigrator() {
  useEffect(() => {
    if (localStorage.getItem('emailbuilder_migrated_v1')) return;

    const rawBrands = localStorage.getItem('emailbuilder_brands');
    const rawDrafts = localStorage.getItem('email_builder_drafts');
    const geminiApiKey = localStorage.getItem('gemini_api_key');

    if (!rawBrands && !rawDrafts && !geminiApiKey) {
      localStorage.setItem('emailbuilder_migrated_v1', '1');
      return;
    }

    const payload: Record<string, unknown> = {};
    try {
      if (rawBrands) payload.brands = JSON.parse(rawBrands);
    } catch { /* datos corruptos: se ignoran */ }
    try {
      if (rawDrafts) payload.drafts = JSON.parse(rawDrafts);
    } catch { /* datos corruptos: se ignoran */ }
    if (geminiApiKey) payload.geminiApiKey = geminiApiKey;

    fetch('/api/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (res.ok) localStorage.setItem('emailbuilder_migrated_v1', '1');
      })
      .catch(() => { /* reintenta en la próxima carga */ });
  }, []);

  return null;
}
