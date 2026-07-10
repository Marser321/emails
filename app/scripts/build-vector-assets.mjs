import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const iconRoot = path.join(root, 'public', 'email-assets', 'shared', 'icons');
const brandRoot = path.join(root, 'public', 'email-assets');
const icons = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1 19.3 19.3 0 0 1-6-6A19.7 19.7 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>',
  location: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};

await mkdir(iconRoot, { recursive: true });
for (const [name, content] of Object.entries(icons)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#155fd1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
  const svgPath = path.join(iconRoot, `${name}.svg`);
  await writeFile(svgPath, svg);
  await Promise.all([48, 96].map(size => sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(iconRoot, `${name}-${size}.png`))));
}

await mkdir(path.join(brandRoot, 'ad-media', 'logos'), { recursive: true });
await Promise.all([
  sharp(path.join(root, 'public', 'logo.png')).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize({ width: 600, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(path.join(brandRoot, 'ad-media', 'logos', 'wordmark-dark.png')),
  sharp(path.join(root, 'public', 'logo-white.png')).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize({ width: 600, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(path.join(brandRoot, 'ad-media', 'logos', 'wordmark-white.png')),
  sharp(path.join(root, 'public', 'logo-icon.png')).resize(192, 192, { fit: 'contain' }).png({ compressionLevel: 9 }).toFile(path.join(brandRoot, 'ad-media', 'logos', 'symbol-192.png')),
]);

const amoLogoRoot = path.join(brandRoot, 'amo', 'logos');
await mkdir(amoLogoRoot, { recursive: true });
const lockup = (dark = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="180" viewBox="0 0 720 180">
  <rect width="720" height="180" fill="none"/>
  <text x="18" y="112" font-family="Montserrat, Arial, sans-serif" font-size="112" font-weight="800" letter-spacing="-7" fill="${dark ? '#ffffff' : '#0B2A4A'}">AMO</text>
  <rect x="252" y="40" width="5" height="96" rx="2.5" fill="#29ABE2"/>
  <text x="282" y="93" font-family="Montserrat, Arial, sans-serif" font-size="38" font-weight="750" letter-spacing="2.5" fill="${dark ? '#ffffff' : '#0B2A4A'}">MANAGEMENTS</text>
  <text x="285" y="126" font-family="Montserrat, Arial, sans-serif" font-size="16" font-weight="600" letter-spacing="3" fill="#29ABE2">CRÉDITO · EDUCACIÓN · ACOMPAÑAMIENTO</text>
</svg>`;
for (const [name, svg] of [['lockup-dark', lockup(false)], ['lockup-white', lockup(true)]]) {
  await writeFile(path.join(amoLogoRoot, `${name}.svg`), svg);
  await sharp(Buffer.from(svg)).resize({ width: 600 }).png({ compressionLevel: 9 }).toFile(path.join(amoLogoRoot, `${name}.png`));
}

console.log(`Assets vectoriales listos: ${Object.keys(icons).length} iconos, logos AD Media y lockup AMO.`);
