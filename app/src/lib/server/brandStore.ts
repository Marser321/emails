// Store de marcas sobre data/brands.json — port async de la lógica original de lib/brands.ts
import { Brand, DEFAULT_BRAND } from '@/lib/types';
import { readJson, writeJson, withFileLock, fileExists, generateId } from './storage';

const FILE = 'brands.json';

async function loadBrands(): Promise<Brand[]> {
  return readJson<Brand[]>(FILE, []);
}

export async function getAllBrands(): Promise<Brand[]> {
  return loadBrands();
}

export async function getBrandById(id: string): Promise<Brand | undefined> {
  const brands = await loadBrands();
  return brands.find(b => b.id === id);
}

export async function searchBrands(query: string, category?: string): Promise<Brand[]> {
  let brands = await loadBrands();

  if (query) {
    const q = query.toLowerCase();
    brands = brands.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q)
    );
  }

  if (category && category !== 'Todas') {
    brands = brands.filter(b => b.category === category);
  }

  // Sort: favorites first, then alphabetically
  brands.sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return brands;
}

export async function createBrand(data: Partial<Brand>): Promise<Brand> {
  return withFileLock(FILE, async () => {
    const brands = await loadBrands();
    const now = new Date().toISOString();

    const brand: Brand = {
      ...DEFAULT_BRAND,
      ...data,
      // Respeta un id provisto (permite subir assets/logo antes de guardar la marca)
      id: data.id || generateId(),
      createdAt: now,
      updatedAt: now,
    } as Brand;

    brands.push(brand);
    await writeJson(FILE, brands);
    return brand;
  });
}

export async function updateBrand(id: string, data: Partial<Brand>): Promise<Brand | null> {
  return withFileLock(FILE, async () => {
    const brands = await loadBrands();
    const index = brands.findIndex(b => b.id === id);
    if (index === -1) return null;

    brands[index] = {
      ...brands[index],
      ...data,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    await writeJson(FILE, brands);
    return brands[index];
  });
}

export async function deleteBrand(id: string): Promise<boolean> {
  return withFileLock(FILE, async () => {
    const brands = await loadBrands();
    const filtered = brands.filter(b => b.id !== id);
    if (filtered.length === brands.length) return false;
    await writeJson(FILE, filtered);
    return true;
  });
}

export async function importBrands(imported: Partial<Brand>[]): Promise<number> {
  return withFileLock(FILE, async () => {
    const existing = await loadBrands();
    const existingNames = new Set(existing.map(b => b.name.toLowerCase()));
    let count = 0;

    for (const brand of imported) {
      if (!brand.name) continue;
      // Skip duplicates by name
      if (existingNames.has(brand.name.toLowerCase())) continue;

      const now = new Date().toISOString();
      existing.push({
        ...DEFAULT_BRAND,
        ...brand,
        id: brand.id || generateId(),
        createdAt: now,
        updatedAt: now,
      } as Brand);
      existingNames.add(brand.name.toLowerCase());
      count++;
    }

    await writeJson(FILE, existing);
    return count;
  });
}

// Siembra las marcas demo SOLO si brands.json todavía no existe
export async function seedIfEmpty(): Promise<void> {
  if (await fileExists(FILE)) return;

  const samples: Partial<Brand>[] = [
    {
      name: 'AMO Managements',
      category: 'Crédito',
      colors: { primary: '#0B2A4A', accent: '#29ABE2', gradientStart: '#29ABE2', gradientEnd: '#1B6FC4' },
      fonts: { heading: 'Montserrat', body: 'Verdana' },
      logo: { type: 'text', value: 'AMO|MANAGEMENTS' },
      footer: {
        tagline: 'Mandy, la Chica del Crédito',
        subtitle: 'Restauración de crédito',
        disclaimer: 'Este correo no forma parte del sitio web de Facebook ni de Meta Platforms, Inc., ni está avalado por Meta. Los resultados pueden variar según cada caso. AMO Managements no garantiza la eliminación de información precisa y verificable de tu reporte de crédito.',
      },
      isFavorite: true,
    },
    {
      name: 'Luxe Properties',
      category: 'Real Estate',
      colors: { primary: '#1a1a2e', accent: '#c9a84c', gradientStart: '#c9a84c', gradientEnd: '#d4af37' },
      fonts: { heading: 'Montserrat', body: 'Verdana' },
      logo: { type: 'text', value: 'LUXE|PROPERTIES' },
      footer: {
        tagline: 'Tu hogar soñado te espera',
        subtitle: 'Bienes Raíces de Lujo',
        disclaimer: 'Las imágenes son ilustrativas. Los precios pueden variar sin previo aviso.',
      },
      isFavorite: false,
    },
    {
      name: 'VitaFit Studio',
      category: 'Fitness',
      colors: { primary: '#0d1117', accent: '#22c55e', gradientStart: '#22c55e', gradientEnd: '#16a34a' },
      fonts: { heading: 'Montserrat', body: 'Verdana' },
      logo: { type: 'text', value: 'VITA|FIT' },
      footer: {
        tagline: 'Transforma tu cuerpo, transforma tu vida',
        subtitle: 'Fitness & Wellness',
        disclaimer: 'Consulta a tu médico antes de comenzar cualquier programa de ejercicios.',
      },
      isFavorite: false,
    },
    {
      name: 'NovaTech Solutions',
      category: 'Tecnología',
      colors: { primary: '#0f172a', accent: '#8b5cf6', gradientStart: '#8b5cf6', gradientEnd: '#6d28d9' },
      fonts: { heading: 'Montserrat', body: 'Verdana' },
      logo: { type: 'text', value: 'NOVA|TECH' },
      footer: {
        tagline: 'Innovación sin límites',
        subtitle: 'Soluciones Tecnológicas',
        disclaimer: 'Las especificaciones del producto pueden cambiar sin previo aviso.',
      },
      isFavorite: true,
    },
  ];

  for (const s of samples) {
    await createBrand(s);
  }
}
