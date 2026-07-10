'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function autoLogin() {
      const supabase = createClient();
      
      // Auto-login silencioso con cuenta genérica para el iframe de GHL
      const { error } = await supabase.auth.signInWithPassword({
        email: 'ghl@admediasolution.com',
        password: 'AdMediaGHL2026!',
      });

      if (error) {
        // Si falla, probablemente el usuario no ha sido creado en Supabase
        setErrorMsg('Falta configurar el usuario genérico en la base de datos.');
      } else {
        router.push('/');
        router.refresh();
      }
    }
    autoLogin();
  }, [router]);

  return (
    <main className="login-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#09090b', color: 'white' }}>
      <div style={{ textAlign: 'center' }}>
        {errorMsg ? (
          <div style={{ color: '#ef4444' }}>
            <p>{errorMsg}</p>
            <p style={{ fontSize: '0.9rem', marginTop: '1rem', color: '#a1a1aa' }}>Por favor crea el usuario ghl@admediasolution.com en Supabase.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 className="animate-spin" size={32} />
            <p style={{ color: '#a1a1aa' }}>Iniciando entorno de trabajo...</p>
          </div>
        )}
      </div>
    </main>
  );
}
