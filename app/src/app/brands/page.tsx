'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BrandModal from '@/components/BrandModal';
import {
  searchBrands,
  deleteBrand,
  toggleFavorite,
  duplicateBrand,
  exportBrands,
  importBrands,
} from '@/lib/brands';
import { Brand, BRAND_CATEGORIES } from '@/lib/types';

function BrandsContent() {
  const searchParams = useSearchParams();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const refreshBrands = useCallback(() => {
    searchBrands(search, category)
      .then(setBrands)
      .catch(() => setBrands([]));
  }, [search, category]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    refreshBrands();
  }, [mounted, refreshBrands]);

  // Handle URL actions
  useEffect(() => {
    if (!mounted) return;
    const action = searchParams.get('action');
    if (action === 'new') {
      setEditingBrand(null);
      setModalOpen(true);
    } else if (action === 'export') {
      handleExport();
    } else if (action === 'import') {
      handleImportClick();
    }
  }, [searchParams, mounted]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Eliminar la marca "${name}"?`)) {
      await deleteBrand(id);
      refreshBrands();
      showToast(`🗑️ "${name}" eliminada`);
    }
  };

  const handleToggleFav = async (id: string) => {
    await toggleFavorite(id);
    refreshBrands();
  };

  const handleDuplicate = async (id: string) => {
    const dup = await duplicateBrand(id);
    if (dup) {
      refreshBrands();
      showToast(`📋 "${dup.name}" creada`);
    }
  };

  const handleExport = async () => {
    const json = await exportBrands();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brands-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 Marcas exportadas');
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const count = await importBrands(reader.result as string);
        if (count >= 0) {
          refreshBrands();
          showToast(`📥 ${count} marcas importadas`);
        } else {
          showToast('❌ Error al importar');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingBrand(null);
    refreshBrands();
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setModalOpen(true);
  };

  if (!mounted) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 24, color: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}>Cargando...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content fade-up-reveal">
        {/* Page Header */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ 
                fontSize: '10px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.2em', 
                color: 'var(--accent-light)', 
                fontWeight: 700,
                marginBottom: 8
              }}>
                Gestor de Clientes
              </p>
              <h1 style={{ textWrap: 'balance' }}>Marcas</h1>
              <p style={{ fontSize: '15px' }}>{brands.length} marcas registradas en tu catálogo de AD Media Solution</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={handleImportClick} style={{ gap: 6 }}>
                <span aria-hidden="true">📥</span> Importar
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ gap: 6 }}>
                <span aria-hidden="true">📤</span> Exportar
              </button>
              <button className="btn btn-primary btn-sm group" onClick={() => { setEditingBrand(null); setModalOpen(true); }} style={{ gap: 6, paddingRight: 10 }}>
                <span aria-hidden="true">➕</span> Nueva marca
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/15 group-hover:scale-110 transition-all duration-300" style={{ fontSize: 10 }} aria-hidden="true">
                  ↗
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="page-body">
          {/* Search & Filters */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: 1, minWidth: 260 }}>
              <span className="search-icon" aria-hidden="true">🔍</span>
              <input
                id="brand-search-input"
                type="text"
                className="form-input"
                placeholder="Buscar marca por nombre o palabra clave…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 42 }}
              />
            </div>
            <select
              aria-label="Filtrar por categoría"
              className="form-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ width: 220 }}
            >
              <option value="Todas">Todas las categorías</option>
              {BRAND_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Brands Grid */}
          {brands.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">🏢</div>
              <h3 style={{ textWrap: 'balance' }}>No hay marcas</h3>
              <p>{search ? 'No se encontraron marcas con ese criterio' : 'Crea tu primera marca para empezar a generar emails personalizados'}</p>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingBrand(null); setModalOpen(true); }}>
                ➕ Crear marca
              </button>
            </div>
          ) : (
            <div className="grid-brands">
              {brands.map(brand => (
                <div key={brand.id} className="glass-shell glass-shell-hoverable" onClick={() => handleEdit(brand)} style={{ cursor: 'pointer', position: 'relative' }}>
                  <div className="glass-core" style={{ height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 150 }}>
                    
                    {/* Top Content Row */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 16, letterSpacing: '-0.3px' }}>
                          {brand.name}
                        </div>
                        {/* Favorite Badge */}
                        <button
                          className="brand-card-fav"
                          onClick={e => { e.stopPropagation(); handleToggleFav(brand.id); }}
                          title={brand.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                          aria-label={brand.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                          style={{
                            position: 'static',
                            width: 24,
                            height: 24,
                            fontSize: 12,
                            background: brand.isFavorite ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.03)',
                            color: brand.isFavorite ? '#fbbf24' : 'var(--text-muted)',
                            border: '1px solid',
                            borderColor: brand.isFavorite ? 'rgba(251,191,36,0.2)' : 'var(--border-subtle)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          {brand.isFavorite ? '★' : '☆'}
                        </button>
                      </div>
                      
                      <div style={{ marginBottom: 12 }}>
                        <span className="badge badge-muted" style={{ padding: '2px 8px', fontSize: 10 }}>
                          {brand.category}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Metadata & Color Preview */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                      {/* Premium Circle Palette Chips */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span 
                          style={{ width: 12, height: 12, borderRadius: '50%', background: brand.colors.primary, border: '1px solid rgba(255,255,255,0.1)' }} 
                          title={`Primario: ${brand.colors.primary}`} 
                        />
                        <span 
                          style={{ width: 12, height: 12, borderRadius: '50%', background: brand.colors.accent, border: '1px solid rgba(255,255,255,0.1)' }} 
                          title={`Acento: ${brand.colors.accent}`} 
                        />
                        <span 
                          style={{ 
                            width: 24, 
                            height: 12, 
                            borderRadius: '6px', 
                            background: `linear-gradient(90deg, ${brand.colors.gradientStart}, ${brand.colors.gradientEnd})`, 
                            border: '1px solid rgba(255,255,255,0.1)' 
                          }} 
                          title="Gradiente Decorativo" 
                        />
                      </div>

                      {/* Hover Actions in container */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary"
                          onClick={e => { e.stopPropagation(); handleDuplicate(brand.id); }}
                          title="Duplicar marca"
                          aria-label={`Duplicar marca ${brand.name}`}
                          style={{ padding: 4, width: 28, height: 28, fontSize: 12, borderRadius: '6px' }}
                        >
                          📋
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={e => { e.stopPropagation(); handleDelete(brand.id, brand.name); }}
                          title="Eliminar marca"
                          aria-label={`Eliminar marca ${brand.name}`}
                          style={{ padding: 4, width: 28, height: 28, fontSize: 12, borderRadius: '6px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Brand Modal */}
        {modalOpen && (
          <BrandModal
            brand={editingBrand}
            onClose={handleModalClose}
            onSaved={() => {
              refreshBrands();
              showToast(editingBrand ? '✅ Marca actualizada' : '✅ Marca creada');
              handleModalClose();
            }}
          />
        )}

        {/* Toast */}
        {toast && <div className="toast success" aria-live="polite"><span>✅</span> {toast}</div>}
      </main>
    </div>
  );
}

export default function BrandsPage() {
  return (
    <Suspense fallback={
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 24, color: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}>Cargando...</div>
        </main>
      </div>
    }>
      <BrandsContent />
    </Suspense>
  );
}
