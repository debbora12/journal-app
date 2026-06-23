import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/';

console.log('Compressing number stickers...');
for (let i = 0; i <= 9; i++) {
  try {
    const res = await fetch(BASE + `${i}.png`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const out = join(ROOT, 'public/stickers/dates', `num-${i}.webp`);
    const info = await sharp(buf)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(out);
    console.log(`  ${i}: ${Math.round(buf.length / 1024)}KB → ${Math.round(info.size / 1024)}KB`);
  } catch (e) {
    console.error(`  ${i}: FAILED — ${e.message}`);
  }
}
console.log('\nDone.');
