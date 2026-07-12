'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatus('sending');
    try {
      const response = await fetch('/api/auth/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error || 'No pudimos validar la contraseña.');
        setStatus('idle');
        return;
      }
      const requestedPath = new URLSearchParams(window.location.search).get('next');
      const destination = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/';
      window.location.assign(destination);
    } catch {
      setError('No pudimos conectar con el servidor. Inténtalo de nuevo.');
      setStatus('idle');
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="Email Studio">
        <div className="login-brand-mark">
          <Image src="/logo-white.png" alt="AD Media Solution" width={176} height={21} priority />
        </div>
        <div className="login-brand-copy">
          <p className="eyebrow">Estudio editorial de email</p>
          <h1>Diseña campañas con identidad propia.</h1>
          <p>Construye, revisa y exporta emails compatibles con GHL sin perder el lenguaje visual de cada marca.</p>
          <ul>
            <li><CheckCircle2 size={17} /> 18 composiciones listas para adaptar</li>
            <li><CheckCircle2 size={17} /> Preview desktop y mobile en tiempo real</li>
            <li><CheckCircle2 size={17} /> HTML seguro para clientes de correo</li>
          </ul>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-card-icon"><LockKeyhole size={22} /></div>
          <p className="eyebrow">Workspace privado</p>
          <h2>Entra a tu workspace</h2>
          <p className="login-intro">Usa la contraseña compartida del equipo para acceder desde este enlace.</p>

          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="login-password">Contraseña del equipo</label>
            <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Ingresa la contraseña compartida" />
            {error ? <p className="login-error" role="alert">{error}</p> : null}
            <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? <><Loader2 className="spin" size={17} /> Validando acceso</> : <>Entrar al workspace <ArrowRight size={17} /></>}
            </button>
          </form>
          <p className="login-private-note">No hay registro público. Comparte esta contraseña únicamente con miembros del equipo.</p>
        </div>
      </section>
    </main>
  );
}
