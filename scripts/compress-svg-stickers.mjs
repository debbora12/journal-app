import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
mkdirSync(join(ROOT, 'public/stickers'), { recursive: true });

const items = [
  { id: 'stk-star-silver', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/Frame_2-removebg-preview.png' },
  { id: 'stk-star-gold',   url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/image_10-removebg-preview.png' },
  { id: 'stk-heart-pink',  url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/Frame_3-removebg-preview.png' },
  { id: 'stk-pin-red',     url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/image_3-removebg-preview.png' },
  { id: 'stk-clip-metal',  url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/image_2-removebg-preview.png' },
];

for (const s of items) {
  const res = await fetch(s.url);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = join(ROOT, 'public/stickers', `${s.id}.webp`);
  const info = await sharp(buf)
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(out);
  console.log(`${s.id}: ${Math.round(buf.length/1024)}KB → ${Math.round(info.size/1024)}KB`);
}
console.log('Done.');
