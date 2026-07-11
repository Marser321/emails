import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const presets = [
  ['keynote','editorial'],['workshop','structured'],['confirmation','editorial'],['access-pass','structured'],
  ['personal-note','editorial'],['next-steps','structured'],['offer-focus','editorial'],['promo-grid','structured'],
  ['countdown','editorial'],['calendar-card','structured'],['editorial-digest','editorial'],['visual-roundup','structured'],
  ['product-story','editorial'],['single-offer','structured'],['market-brief','editorial'],['portfolio-review','structured'],
  ['welcome-path','editorial'],['getting-started','structured'],
];

const output = path.join(process.cwd(), 'public', 'template-thumbnails');
await fs.mkdir(output, { recursive: true });

for (const [id, mode] of presets) {
  const editorial = mode === 'editorial';
  const accent = ['offer-focus','countdown','market-brief'].includes(id) ? '#c88f57' : '#188ab9';
  const background = ['offer-focus','countdown','market-brief'].includes(id) ? '#132333' : '#f8f4eb';
  const ink = background === '#132333' ? '#f8f4eb' : '#10263a';
  const body = editorial
    ? `<rect x="72" y="194" width="330" height="12" rx="6" fill="${accent}"/><rect x="72" y="226" width="458" height="28" rx="6" fill="${ink}" opacity=".94"/><rect x="72" y="276" width="396" height="10" rx="5" fill="${ink}" opacity=".34"/><rect x="72" y="299" width="438" height="10" rx="5" fill="${ink}" opacity=".24"/><line x1="72" y1="344" x2="528" y2="344" stroke="${ink}" opacity=".17"/><rect x="72" y="378" width="268" height="11" rx="5" fill="${ink}" opacity=".7"/><rect x="72" y="410" width="356" height="9" rx="4" fill="${ink}" opacity=".28"/><rect x="72" y="434" width="318" height="9" rx="4" fill="${ink}" opacity=".22"/>`
    : `<rect x="72" y="186" width="456" height="78" rx="12" fill="${accent}" opacity=".13" stroke="${accent}"/><rect x="98" y="210" width="250" height="12" rx="6" fill="${ink}" opacity=".82"/><rect x="98" y="235" width="190" height="8" rx="4" fill="${ink}" opacity=".3"/><rect x="72" y="292" width="456" height="134" rx="12" fill="#ffffff" stroke="${ink}" opacity=".82"/><rect x="98" y="320" width="286" height="12" rx="6" fill="${ink}"/><rect x="98" y="352" width="370" height="9" rx="4" fill="${ink}" opacity=".34"/><rect x="98" y="378" width="330" height="9" rx="4" fill="${ink}" opacity=".24"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720"><rect width="600" height="720" fill="#e9e4da"/><rect x="38" y="26" width="524" height="668" rx="22" fill="${background}"/><rect x="38" y="26" width="524" height="116" rx="22" fill="#0a2538"/><rect x="38" y="120" width="524" height="22" fill="#0a2538"/><circle cx="286" cy="78" r="15" fill="${accent}"/><rect x="308" y="69" width="92" height="18" rx="5" fill="#fff" opacity=".92"/>${body}<rect x="182" y="520" width="236" height="48" rx="8" fill="${accent}"/><rect x="228" y="539" width="144" height="10" rx="5" fill="#fff"/><rect x="38" y="618" width="524" height="76" fill="#0a2538"/><rect x="210" y="650" width="180" height="9" rx="4" fill="#fff" opacity=".52"/></svg>`;
  await sharp(Buffer.from(svg)).resize(300, 360).webp({ quality: 82 }).toFile(path.join(output, `${id}.webp`));
}

console.log(`Generated ${presets.length} template thumbnails in ${output}`);
