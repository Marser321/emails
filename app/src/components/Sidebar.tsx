'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, LayoutDashboard, LogOut, Mail, Menu, Sparkles, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/', Icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/editor', Icon: Mail, label: 'Email Editor' },
  { href: '/brands', Icon: Building2, label: 'Marcas' },
];

// Modo público (iframe GHL sin login): no mostramos el botón de cerrar sesión.
const OPEN_ACCESS = process.env.NEXT_PUBLIC_OPEN_ACCESS === 'true';

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } finally {
      window.location.assign('/login');
    }
  }

  return (
    <>
      <button type="button" className="mobile-nav-trigger" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación">
        <Menu size={22} />
      </button>
      {mobileOpen && <button className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Cerrar navegación" />}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-header">
          <Link href="/" className="sidebar-logo" onClick={() => setMobileOpen(false)}>
            <Image src="/logo-icon.png" alt="AD Media Solution" width={42} height={42} priority />
            <span className="sidebar-logo-text">Email Studio<small>AD Media Solution</small></span>
          </Link>
          <button type="button" className="sidebar-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Cerrar navegación">
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-workspace"><Sparkles size={15} /><span>Workspace interno</span></div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Principal</div>
          {navItems.map(({ href, Icon, label }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`sidebar-link ${pathname === href ? 'active' : ''}`}>
              <Icon className="icon" size={19} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!OPEN_ACCESS && (
            <button type="button" className="sidebar-signout" onClick={signOut}><LogOut size={18} /> Cerrar sesión</button>
          )}
          <small>Diseño y envío profesional</small>
        </div>
      </aside>
    </>
  );
}
