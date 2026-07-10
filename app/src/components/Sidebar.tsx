'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: '⚡', label: 'Dashboard' },
  { href: '/editor', icon: '✉️', label: 'Email Editor' },
  { href: '/brands', icon: '🏢', label: 'Marcas' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isHidden = localStorage.getItem('email-builder-sidebar-hidden') === 'true';
    setHidden(isHidden);
    if (isHidden) {
      document.body.classList.add('sidebar-hidden');
    } else {
      document.body.classList.remove('sidebar-hidden');
    }
  }, []);

  const toggleSidebar = () => {
    const nextHidden = !hidden;
    setHidden(nextHidden);
    localStorage.setItem('email-builder-sidebar-hidden', String(nextHidden));
    if (nextHidden) {
      document.body.classList.add('sidebar-hidden');
    } else {
      document.body.classList.remove('sidebar-hidden');
    }
  };

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header" style={{ position: 'relative' }}>
          <Link href="/" className="sidebar-logo" style={{ paddingRight: '24px' }}>
            <div className="sidebar-logo-icon" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
              <img src="/logo-icon.png" alt="AD" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="sidebar-logo-text">
              Email Builder
              <span>AD Media Solution</span>
            </div>
          </Link>
          <button 
            type="button" 
            onClick={toggleSidebar} 
            className="sidebar-close-btn"
            title="Ocultar menú lateral"
            aria-label="Ocultar menú lateral"
          >
            ←
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Principal</div>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          <div className="sidebar-section-label">Herramientas</div>
          <Link
            href="/brands?action=import"
            className="sidebar-link"
          >
            <span className="icon" aria-hidden="true">📥</span>
            <span>Importar marcas</span>
          </Link>
          <Link
            href="/brands?action=export"
            className="sidebar-link"
          >
            <span className="icon" aria-hidden="true">📤</span>
            <span>Exportar marcas</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            <span style={{ opacity: 0.6 }}>Powered by</span><br/>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>AD Media Solution</span>
          </div>
        </div>
      </aside>

      {mounted && hidden && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="sidebar-floating-toggle"
          title="Mostrar menú lateral"
          aria-label="Mostrar menú lateral"
        >
          ☰
        </button>
      )}
    </>
  );
}
