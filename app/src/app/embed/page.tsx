'use client';

import { useEffect, useState } from 'react';

export default function EmbedAccessPage() {
  const [error, setError] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(null, '', '/embed');

    if (!token) {
      const timeout = window.setTimeout(() => setError('Este enlace de GHL no incluye un acceso válido.'), 0);
      return () => window.clearTimeout(timeout);
    }

    const controller = new AbortController();
    fetch('/api/embed/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'No se pudo validar el acceso.');
        window.location.replace('/');
      })
      .catch(cause => {
        if (cause instanceof Error && cause.name !== 'AbortError') setError(cause.message);
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="embed-access-shell">
      <section className="embed-access-card" aria-live="polite">
        <div className="embed-access-mark">AD</div>
        <p className="embed-access-kicker">AD Media Solution</p>
        <h1>{error ? 'No pudimos abrir el workspace' : 'Abriendo Email Studio…'}</h1>
        <p>{error || 'Validando el acceso seguro desde GoHighLevel.'}</p>
        {!error && <span className="embed-access-loader" aria-hidden="true" />}
      </section>
    </main>
  );
}
