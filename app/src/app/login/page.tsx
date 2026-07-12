'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatus('sending');
    const redirectTo = `${window.location.origin}/auth/confirm`;
    const { error: authError } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    });
    if (authError) {
      setError('No pudimos enviar el acceso. Verifica que tu correo pertenezca al equipo.');
      setStatus('idle');
      return;
    }
    setStatus('sent');
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
          <div className="login-card-icon"><Mail size={22} /></div>
          <p className="eyebrow">Workspace privado</p>
          <h2>Entra a tu workspace</h2>
          <p className="login-intro">Te enviaremos un enlace seguro al correo autorizado de tu equipo.</p>

          {status === 'sent' ? (
            <div className="login-success" role="status">
              <CheckCircle2 size={22} />
              <strong>Revisa tu bandeja de entrada</strong>
              <span>El enlace de acceso fue enviado a {email}.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              <label htmlFor="login-email">Correo del equipo</label>
              <input id="login-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="nombre@empresa.com" />
              {error ? <p className="login-error" role="alert">{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? <><Loader2 className="spin" size={17} /> Enviando acceso</> : <>Recibir enlace seguro <ArrowRight size={17} /></>}
              </button>
            </form>
          )}
          <p className="login-private-note">No hay registro público. Solo pueden acceder correos habilitados por AD Media Solution.</p>
        </div>
      </section>
    </main>
  );
}
