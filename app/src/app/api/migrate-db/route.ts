import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { supabase } from '@/lib/server/supabase';
import { dataPath } from '@/lib/server/storage';
import { Brand, EmailHistoryEntry } from '@/lib/types';

export async function GET() {
  try {
    let migratedBrands = 0;
    let migratedHistory = 0;
    let migratedAssets = 0;

    // 1. Settings
    try {
      const settingsStr = await fs.readFile(dataPath('settings.json'), 'utf8');
      const settings = JSON.parse(settingsStr);
      
      const updates: any = { updated_at: new Date().toISOString(), migrated_from_local_storage: true };
      if (settings.geminiApiKey) updates.gemini_api_key = settings.geminiApiKey;
      if (settings.anthropicApiKey) updates.anthropic_api_key = settings.anthropicApiKey;
      if (settings.defaultEngine) updates.default_engine = settings.defaultEngine;
      
      await supabase.from('settings').update(updates).eq('id', 'default');
    } catch (e) {
      console.log('No settings.json to migrate or error:', e);
    }

    // 2. Brands
    try {
      const brandsStr = await fs.readFile(dataPath('brands.json'), 'utf8');
      const brands: Brand[] = JSON.parse(brandsStr);

      for (const b of brands) {
        const { error } = await supabase.from('brands').insert({
          id: b.id,
          name: b.name,
          category: b.category,
          colors: b.colors,
          fonts: b.fonts,
          logo: b.logo,
          footer: b.footer,
          voice: b.voice || null,
          is_favorite: b.isFavorite,
          created_at: b.createdAt || new Date().toISOString(),
          updated_at: b.updatedAt || new Date().toISOString(),
        }).select();
        
        // Ignore unique constraint errors in case of re-run
        if (!error) migratedBrands++;
      }
    } catch (e) {
      console.log('No brands.json to migrate or error:', e);
    }

    // 3. History
    try {
      const historyDir = dataPath('history');
      const files = await fs.readdir(historyDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const histStr = await fs.readFile(path.join(historyDir, file), 'utf8');
        const history: EmailHistoryEntry[] = JSON.parse(histStr);
        
        for (const h of history) {
          const { error } = await supabase.from('history').insert({
            id: h.id,
            brand_id: h.brandId,
            template_type: h.templateType,
            engine: h.engine,
            model: h.model,
            prompt: h.prompt || null,
            subject: h.subject,
            content: h.content,
            html_snapshot: h.htmlSnapshot || null,
            rating: h.rating || null,
            notes: h.notes || null,
            created_at: h.createdAt || new Date().toISOString(),
            updated_at: h.updatedAt || new Date().toISOString(),
          }).select();
          
          if (!error) migratedHistory++;
        }
      }
    } catch (e) {
      console.log('No history to migrate or error:', e);
    }

    // 4. Assets
    try {
      const assetsDir = dataPath('assets');
      const brandDirs = await fs.readdir(assetsDir);
      
      for (const bDir of brandDirs) {
        const fullBDir = path.join(assetsDir, bDir);
        const stat = await fs.stat(fullBDir);
        if (!stat.isDirectory()) continue;
        
        const files = await fs.readdir(fullBDir);
        for (const file of files) {
          const filePath = path.join(fullBDir, file);
          const fileStat = await fs.stat(filePath);
          if (!fileStat.isFile()) continue;
          
          const buffer = await fs.readFile(filePath);
          
          const { error } = await supabase
            .storage
            .from('assets')
            .upload(`${bDir}/${file}`, buffer, {
              upsert: true
            });
            
          if (!error) migratedAssets++;
        }
      }
    } catch (e) {
      console.log('No assets to migrate or error:', e);
    }

    return NextResponse.json({
      success: true,
      migratedBrands,
      migratedHistory,
      migratedAssets
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
