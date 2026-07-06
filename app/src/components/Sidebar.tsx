'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: '⚡', label: 'Dashboard' },
  { href: '/editor', icon: '✉️', label: 'Email Editor' },
  { href: '/brands', icon: '🏢', label: 'Marcas' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">EM</div>
          <div className="sidebar-logo-text">
            Email Builder
            <span>AD Media Solution</span>
          </div>
        </Link>
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
  );
}
