import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
mkdirSync(join(ROOT, 'public/stickers/dates'), { recursive: true });

const BASE = 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/';

const MONTHS = [
  { id: 'jan',       file: 'jan.png' },
  { id: 'march',     file: 'march.png' },
  { id: 'april',     file: 'april.png' },
  { id: 'may',       file: 'may.png' },
  { id: 'june',      file: 'june.png' },
  { id: 'july',      file: 'july.png' },
  { id: 'august',    file: 'august.png' },
  { id: 'september', file: 'september.png' },
  { id: 'october',   file: 'october.png' },
  { id: 'november',  file: 'november.png' },
  { id: 'december',  file: 'december.png' },
];

console.log('Compressing date stickers...');
for (const m of MONTHS) {
  try {
    const url = BASE + encodeURIComponent(m.file);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const out = join(ROOT, 'public/stickers/dates', `${m.id}.webp`);
    const info = await sharp(buf)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(out);
    console.log(`  ${m.id}: ${Math.round(buf.length / 1024)}KB → ${Math.round(info.size / 1024)}KB`);
  } catch (e) {
    console.error(`  ${m.id}: FAILED — ${e.message}`);
  }
}
console.log('\nDone.');
