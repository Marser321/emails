import { describe, expect, it } from 'vitest';
import { TEMPLATE_PRESETS, applyPresetPreservingContent, presetsForObjective } from './template-presets';
import { renderEmail } from './templates';
import { DEFAULT_BRAND, type Brand } from './types';

describe('template presets', () => {
  it('provides exactly two visual compositions for every objective', () => {
    expect(TEMPLATE_PRESETS).toHaveLength(18);
    for (const preset of TEMPLATE_PRESETS) {
      expect(preset.defaultContent.blocks?.length).toBeGreaterThanOrEqual(5);
      expect(preset.thumbnail).toBe(`/template-thumbnails/${preset.id}.webp`);
    }
    expect(new Set(TEMPLATE_PRESETS.map(preset => preset.id)).size).toBe(18);
    expect(presetsForObjective('masterclass')).toHaveLength(2);
  });

  it('preserves semantic copy from blocks while replacing composition', () => {
    // D3: el contenido del usuario vive en content.blocks[] (no en campos legacy);
    // aplicar un preset preserva ese contenido y solo cambia la composición.
    const preset = TEMPLATE_PRESETS.find(item => item.id === 'workshop')!;
    const edited = structuredClone(preset.defaultContent);
    const textBlock = edited.blocks!.find(block => block.type === 'text');
    if (textBlock && textBlock.type === 'text') { textBlock.headline = 'Titular propio'; textBlock.body = 'Texto propio'; }
    const result = applyPresetPreservingContent(preset, edited);
    expect(result.presetId).toBe('workshop');
    expect(result.blocks?.find(block => block.type === 'text')).toMatchObject({ headline: 'Titular propio', body: 'Texto propio' });
    // Los campos legacy de contenido ya no se propagan.
    expect(result.headline).toBeUndefined();
    expect(result.body).toBeUndefined();
  });

  it('renders all 18 presets for both starter brand palettes with inline typography', () => {
    const brands: Brand[] = [
      { ...DEFAULT_BRAND, id: 'ad', name: 'AD Media', createdAt: '', updatedAt: '' },
      { ...DEFAULT_BRAND, id: 'amo', name: 'AMO', colors: { primary: '#173b34', accent: '#c88f57', gradientStart: '#c88f57', gradientEnd: '#9f6d3e' }, createdAt: '', updatedAt: '' },
    ];
    for (const preset of TEMPLATE_PRESETS) {
      for (const brand of brands) {
        const html = renderEmail(brand, preset.defaultContent);
        expect(html).toContain('role="presentation"');
        expect(html).toContain('data-block-id=');
        expect(html).toContain(preset.defaultContent.typography?.bodyColor);
      }
    }
  });
});
