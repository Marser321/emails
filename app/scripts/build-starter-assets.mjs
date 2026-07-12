import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const metadataPath = path.join(root, 'assets', 'starter-pack.json');
const publicRoot = path.join(root, 'public', 'email-assets');
const sourceRoot = process.env.STARTER_ASSET_SOURCE_DIR;
const definitions = JSON.parse(await readFile(metadataPath, 'utf8'));
const manifest = [];

for (const definition of definitions) {
  const outputPath = path.join(publicRoot, definition.relativePath);
  const sourcePath = sourceRoot ? path.join(sourceRoot, `${definition.sourceKey}.png`) : outputPath;
  const source = await readFile(sourcePath);
  const emailBuffer = await sharp(source)
    .rotate()
    .resize(definition.width, definition.height, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, emailBuffer);

  const extensionless = path.basename(definition.relativePath, path.extname(definition.relativePath));
  const thumbnailRelativePath = path.join(path.dirname(definition.relativePath), 'thumbnails', `${extensionless}.webp`).replaceAll('\\', '/');
  const thumbnailPath = path.join(publicRoot, thumbnailRelativePath);
  const thumbWidth = 320;
  const thumbHeight = definition.kind === 'hero' ? 160 : 320;
  const thumbnailBuffer = await sharp(emailBuffer)
    .resize(thumbWidth, thumbHeight, { fit: 'cover', position: 'attention' })
    .webp({ quality: 78 })
    .toBuffer();
  await mkdir(path.dirname(thumbnailPath), { recursive: true });
  await writeFile(thumbnailPath, thumbnailBuffer);

  const file = await stat(outputPath);
  manifest.push({
    id: definition.id,
    filename: path.basename(definition.relativePath),
    brandId: definition.brandId,
    brand: definition.brand,
    url: `/email-assets/${definition.relativePath}`,
    thumbnailUrl: `/email-assets/${thumbnailRelativePath}`,
    size: file.size,
    modifiedAt: `${definition.createdAt}T00:00:00.000Z`,
    createdAt: `${definition.createdAt}T00:00:00.000Z`,
    kind: definition.kind,
    altText: definition.altText,
    width: definition.width,
    height: definition.height,
    mimeType: 'image/jpeg',
    hasAlpha: false,
    variant: 'email',
    author: definition.author,
    sourcePrompt: definition.prompt,
    intendedUse: definition.intendedUse,
    adset: definition.adset,
    path: definition.relativePath,
  });
}

await writeFile(path.join(publicRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Starter pack listo: ${manifest.length} assets JPEG y ${manifest.length} thumbnails WebP.`);
