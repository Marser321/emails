import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processAssetImage } from './asset-processing';

async function transparentLogo(): Promise<Buffer> {
  const mark = await sharp({ create: { width: 80, height: 30, channels: 4, background: { r: 41, g: 171, b: 226, alpha: 1 } } }).png().toBuffer();
  return sharp({ create: { width: 160, height: 80, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mark, left: 40, top: 25 }])
    .png()
    .toBuffer();
}

describe('asset processing', () => {
  it('preserves alpha and PNG format for logos', async () => {
    const result = await processAssetImage(await transparentLogo(), 'logo');
    expect(result.mimeType).toBe('image/png');
    expect(result.extension).toBe('png');
    expect(result.hasAlpha).toBe(true);
    expect((await sharp(result.emailBuffer).metadata()).hasAlpha).toBe(true);
  });

  it('flattens non-logo assets to optimized JPEG', async () => {
    const result = await processAssetImage(await transparentLogo(), 'other');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.extension).toBe('jpg');
    expect(result.hasAlpha).toBe(false);
  });
});
