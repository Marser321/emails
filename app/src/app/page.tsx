'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Inbox, Mail, Plus, Search, ThumbsUp } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import EmailHistoryCard from '@/components/EmailHistoryCard';
import TemplateIcon from '@/components/TemplateIcon';
import { getAllBrands } from '@/lib/brands';
import { Brand, EmailHistoryEntry, TEMPLATES } from '@/lib/types';
import { useHydrated } from '@/hooks/useHydrated';

export default function Dashboard() {
  const [brandCount, setBrandCount] = useState(0);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [history, setHistory] = useState<EmailHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const mounted = useHydrated();
  const [now] = useState(() => Date.now());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadHistory = (query: string) => {
    setHistoryLoading(true);
    const params = new URLSearchParams({ limit: '10' });
    if (query) params.set('q', query);
    fetch(`/api/history?${params}`)
      .then(res => (res.ok ? res.json() : []))
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    getAllBrands()
      .then(all => {
        setBrands(all);
        setBrandCount(all.length);
      })
      .catch(() => setBrandCount(0));
    fetch('/api/history?limit=10')
      .then(res => (res.ok ? res.json() : []))
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  // Búsqueda con debounce 300ms
  useEffect(() => {
    if (!mounted) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadHistory(search), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const brandName = (brandId: string) => brands.find(b => b.id === brandId)?.name || 'Marca';

  // Stats reales derivadas del historial
  const weekAgo = now - 7 * 24 * 3600 * 1000;
  const emailsThisWeek = history.filter(e => new Date(e.createdAt).getTime() > weekAgo).length;
  const rated = history.filter(e => e.rating !== null);
  const upPercent = rated.length ? Math.round((rated.filter(e => e.rating === 'up').length / rated.length) * 100) : null;

  if (!mounted) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 24, color: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}>Cargando…</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content fade-up-reveal">
        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: 40 }}>
          <p style={{ 
            fontSize: '10px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.2em', 
            color: 'var(--accent-light)', 
            fontWeight: 700,
            marginBottom: 8
          }}>
            Panel de Control
          </p>
          <h1 style={{ textWrap: 'balance' }}>Dashboard</h1>
          <p style={{ fontSize: '15px' }}>Resumen de tu workspace y templates de correo de alta conversión</p>
        </div>

        <div className="page-body">
          {/* ====== HOY: últimos emails generados ====== */}
          <div className="glass-shell" style={{ marginBottom: 24 }}>
            <div className="glass-core">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mail size={17} /> Hoy — Últimos emails
                </h3>
                <div className="search-box" style={{ width: 280 }}>
                  <span className="search-icon" aria-hidden="true"><Search size={15} /></span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Buscar por asunto o instrucción…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: 42, fontSize: 12, padding: '8px 12px 8px 42px' }}
                  />
                </div>
              </div>

              {historyLoading ? (
                <div style={{ display: 'flex', gap: 12, maxWidth: '100%', minWidth: 0, overflowX: 'auto', paddingBottom: 8 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="skeleton" style={{ width: 'min(300px, 100%)', height: 140, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="empty-state" style={{ padding: '26px 10px' }}>
                  <div className="empty-icon"><Inbox size={34} /></div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: '6px 0 12px' }}>
                    {search ? 'No se encontraron emails con ese criterio.' : 'Todavía no generaste emails. Los que generes con IA aparecerán acá.'}
                  </p>
                  {!search && (
                    <Link href="/editor" className="btn btn-primary btn-sm"><Mail size={16} /> Crear email</Link>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                  {history.map(entry => (
                    <EmailHistoryCard
                      key={entry.id}
                      entry={entry}
                      brandName={brandName(entry.brandId)}
                      onToast={showToast}
                      onRated={updated => setHistory(prev => prev.map(e => (e.id === updated.id ? updated : e)))}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bento Grid */}
          <div className="dashboard-grid">
            
            {/* Bento Item 1: Welcome & Overview (span-2) */}
            <div className="glass-shell" style={{ gridColumn: 'span 2' }}>
              <div className="glass-core" style={{ 
                height: '100%', 
                background: 'linear-gradient(135deg, rgba(21, 95, 209, 0.08) 0%, #ffffff 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 220
              }}>
                <div>
                  <span className="badge badge-accent" style={{ marginBottom: 16 }}>
                    Workspace interno
                  </span>
                  <h2 style={{ 
                    fontSize: 26, 
                    fontWeight: 800, 
                    color: 'var(--text-primary)', 
                    marginBottom: 12,
                    letterSpacing: '-0.5px',
                    textWrap: 'balance'
                  }}>
                    AD Media Solution Email Hub
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 520 }}>
                    Genera correos HTML profesionales, responsivos y compatibles con todos los clientes de correo tradicionales y modernos. Impulsado por configuraciones de marca dinámicas.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 20, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Biblioteca</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>{brandCount} marcas disponibles</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Motor HTML</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>{TEMPLATES.length} plantillas compatibles con GHL</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Item 2: Stats Summary (span-1) */}
            <div className="glass-shell">
              <div className="glass-core" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10, margin: 0 }}>
                  Estadísticas Rápidas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Marcas Registradas</span>
                    <span style={{ 
                      fontSize: 20, 
                      fontWeight: 800, 
                      color: 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums'
                    }}>{brandCount}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Plantillas Listas</span>
                    <span style={{ 
                      fontSize: 20, 
                      fontWeight: 800, 
                      color: 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums'
                    }}>{TEMPLATES.length}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Emails esta semana</span>
                    <span style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums'
                    }}>{emailsThisWeek}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>Con <ThumbsUp size={15} /></span>
                    <span style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: 'var(--accent-light)',
                      fontVariantNumeric: 'tabular-nums'
                    }}>{upPercent === null ? '—' : `${upPercent}%`}</span>
                  </div>
                </div>
                <div style={{ 
                  marginTop: 'auto', 
                  padding: '12px 14px', 
                  background: 'rgba(99, 102, 241, 0.05)', 
                  border: '1px dashed var(--border-accent)', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  color: 'var(--text-accent)',
                  textAlign: 'center'
                }}>
                  {history.length} emails recientes en el historial
                </div>
              </div>
            </div>

            {/* Bento Item 3: Quick Actions (span-1) */}
            <div className="glass-shell">
              <div className="glass-core" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10, margin: 0 }}>
                  Acciones Rápidas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
                  <Link href="/editor" className="btn btn-primary group" style={{ display: 'flex', justifyContent: 'space-between', paddingRight: 8 }}>
                    <span>Crear email</span>
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-all duration-300" style={{ fontSize: 12 }} aria-hidden="true">
                      <ArrowUpRight size={15} />
                    </span>
                  </Link>
                  <Link href="/brands" className="btn btn-secondary group" style={{ display: 'flex', justifyContent: 'space-between', paddingRight: 8 }}>
                    <span>Administrar marcas</span>
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-all duration-300" style={{ fontSize: 12 }} aria-hidden="true">
                      <ArrowUpRight size={15} />
                    </span>
                  </Link>
                  <Link href="/brands?action=new" className="btn btn-secondary group" style={{ display: 'flex', justifyContent: 'space-between', paddingRight: 8 }}>
                    <span>Nueva marca</span>
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-all duration-300" style={{ fontSize: 12 }} aria-hidden="true">
                      <Plus size={15} />
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Bento Item 4: Templates grid (span-2) */}
            <div className="glass-shell" style={{ gridColumn: 'span 2' }}>
              <div className="glass-core" style={{ height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Plantillas de Conversión Disponibles
                  </h3>
                  <Link href="/editor" style={{ fontSize: 13, color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 600 }}>
                    Ver todas →
                  </Link>
                </div>
                <div className="templates-grid">
                  {TEMPLATES.map(t => (
                    <Link
                      key={t.type}
                      href={`/editor?template=${t.type}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="glass-shell glass-shell-hoverable" style={{ padding: 4 }}>
                        <div className="glass-core" style={{ 
                          padding: '14px 16px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 14,
                          background: 'transparent',
                          border: 'none',
                          boxShadow: 'none'
                        }}>
                          <TemplateIcon type={t.type} size={25} color="var(--accent)" />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.name}
                            </div>
                            <div style={{ 
                              fontSize: 12, 
                              color: 'var(--text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {t.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Toast */}
        {toast && <div className="toast success" aria-live="polite">{toast}</div>}
      </main>
    </div>
  );
}
