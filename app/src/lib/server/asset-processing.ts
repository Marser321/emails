import sharp from 'sharp';
import type { EmailAsset } from '@/lib/types';

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif']);

export class InvalidAssetImageError extends Error {
  constructor(message = 'La imagen no tiene un formato válido') {
    super(message);
    this.name = 'InvalidAssetImageError';
  }
}

export interface ProcessedAssetImage {
  emailBuffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
  extension: 'png' | 'jpg';
  mimeType: 'image/png' | 'image/jpeg';
  hasAlpha: boolean;
}

export async function processAssetImage(input: Buffer, kind: EmailAsset['kind']): Promise<ProcessedAssetImage> {
  const image = sharp(input, { animated: false, failOn: 'error' }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || !ALLOWED_FORMATS.has(metadata.format || '')) {
    throw new InvalidAssetImageError();
  }

  let emailBuffer: Buffer;
  let extension: ProcessedAssetImage['extension'];
  let mimeType: ProcessedAssetImage['mimeType'];

  if (kind === 'logo' || kind === 'icon') {
    const maxWidth = kind === 'icon' ? 96 : 600;
    const maxHeight = kind === 'icon' ? 96 : 300;
    emailBuffer = await image.clone()
      .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    extension = 'png';
    mimeType = 'image/png';
  } else {
    const target = kind === 'hero'
      ? { width: 1200, height: 600 }
      : kind === 'tile'
        ? { width: 800, height: 800 }
        : { width: 1200, height: 1200 };
    emailBuffer = await image.clone()
      .resize(target.width, target.height, { fit: kind === 'other' ? 'inside' : 'cover', withoutEnlargement: kind === 'other' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    extension = 'jpg';
    mimeType = 'image/jpeg';
  }

  const output = await sharp(emailBuffer).metadata();
  const thumbnailBuffer = await sharp(emailBuffer).resize(320, 320, { fit: 'cover' }).webp({ quality: 76 }).toBuffer();
  return {
    emailBuffer,
    thumbnailBuffer,
    width: output.width || metadata.width,
    height: output.height || metadata.height,
    extension,
    mimeType,
    hasAlpha: output.hasAlpha ?? false,
  };
}
