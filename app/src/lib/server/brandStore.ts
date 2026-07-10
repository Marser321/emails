import { Brand, DEFAULT_BRAND } from '@/lib/types';
import { supabase } from './supabase';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

// Convert snake_case from DB to camelCase for Brand object
function mapBrandFromDB(dbBrand: any): Brand {
  return {
    id: dbBrand.id,
    name: dbBrand.name,
    category: dbBrand.category,
    colors: dbBrand.colors,
    fonts: dbBrand.fonts,
    logo: dbBrand.logo,
    footer: dbBrand.footer,
    voice: dbBrand.voice,
    isFavorite: dbBrand.is_favorite,
    createdAt: dbBrand.created_at,
    updatedAt: dbBrand.updated_at,
  };
}

export async function getAllBrands(): Promise<Brand[]> {
  const { data, error } = await supabase.from('brands').select('*').order('name');
  if (error) {
    console.error('Error getting all brands:', error);
    return [];
  }
  return (data || []).map(mapBrandFromDB);
}

export async function getBrandById(id: string): Promise<Brand | undefined> {
  const { data, error } = await supabase.from('brands').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return mapBrandFromDB(data);
}

export async function searchBrands(query: string, category?: string): Promise<Brand[]> {
  let qb = supabase.from('brands').select('*');
  
  if (category && category !== 'Todas') {
    qb = qb.eq('category', category);
  }

  const { data, error } = await qb;
  if (error) {
    console.error('Error searching brands:', error);
    return [];
  }

  let brands = (data || []).map(mapBrandFromDB);

  if (query) {
    const q = query.toLowerCase();
    brands = brands.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q)
    );
  }

  // Sort: favorites first, then alphabetically
  brands.sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return brands;
}

export async function createBrand(data: Partial<Brand>): Promise<Brand> {
  const now = new Date().toISOString();
  const newBrand: Brand = {
    ...DEFAULT_BRAND,
    ...data,
    id: data.id || generateId(),
    createdAt: now,
    updatedAt: now,
  } as Brand;

  const { error } = await supabase.from('brands').insert({
    id: newBrand.id,
    name: newBrand.name,
    category: newBrand.category,
    colors: newBrand.colors,
    fonts: newBrand.fonts,
    logo: newBrand.logo,
    footer: newBrand.footer,
    voice: newBrand.voice || null,
    is_favorite: newBrand.isFavorite,
    created_at: newBrand.createdAt,
    updated_at: newBrand.updatedAt,
  });

  if (error) {
    console.error('Error creating brand:', error);
    throw new Error(error.message);
  }

  return newBrand;
}

export async function updateBrand(id: string, data: Partial<Brand>): Promise<Brand | null> {
  const now = new Date().toISOString();
  
  const updates: any = { updated_at: now };
  if (data.name !== undefined) updates.name = data.name;
  if (data.category !== undefined) updates.category = data.category;
  if (data.colors !== undefined) updates.colors = data.colors;
  if (data.fonts !== undefined) updates.fonts = data.fonts;
  if (data.logo !== undefined) updates.logo = data.logo;
  if (data.footer !== undefined) updates.footer = data.footer;
  if (data.voice !== undefined) updates.voice = data.voice;
  if (data.isFavorite !== undefined) updates.is_favorite = data.isFavorite;

  const { data: updatedData, error } = await supabase
    .from('brands')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedData) {
    console.error('Error updating brand:', error);
    return null;
  }

  return mapBrandFromDB(updatedData);
}

export async function deleteBrand(id: string): Promise<boolean> {
  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) {
    console.error('Error deleting brand:', error);
    return false;
  }
  return true;
}

export async function importBrands(imported: Partial<Brand>[]): Promise<number> {
  const existing = await getAllBrands();
  const existingNames = new Set(existing.map(b => b.name.toLowerCase()));
  
  const toInsert = [];
  const now = new Date().toISOString();

  for (const brand of imported) {
    if (!brand.name) continue;
    if (existingNames.has(brand.name.toLowerCase())) continue;

    const b = {
      ...DEFAULT_BRAND,
      ...brand,
      id: brand.id || generateId(),
      createdAt: now,
      updatedAt: now,
    } as Brand;
    
    toInsert.push({
      id: b.id,
      name: b.name,
      category: b.category,
      colors: b.colors,
      fonts: b.fonts,
      logo: b.logo,
      footer: b.footer,
      voice: b.voice || null,
      is_favorite: b.isFavorite,
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    });
    existingNames.add(b.name.toLowerCase());
  }

  if (toInsert.length === 0) return 0;

  const { error } = await supabase.from('brands').insert(toInsert);
  if (error) {
    console.error('Error importing brands:', error);
    return 0;
  }

  return toInsert.length;
}

export async function seedIfEmpty(): Promise<void> {
  const { count, error } = await supabase.from('brands').select('*', { count: 'exact', head: true });
  if (error || count === null || count > 0) return;

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
