import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
mkdirSync(join(ROOT, 'public/papers'), { recursive: true });
mkdirSync(join(ROOT, 'public/backgrounds'), { recursive: true });

const PAPERS = [
  { id: 'paper08', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2008.png' },
  { id: 'paper09', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2009.png' },
  { id: 'paper12', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2012.png' },
  { id: 'paper17', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2017.png' },
  { id: 'paper18', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2018.png' },
  { id: 'paper27', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2027.png' },
  { id: 'paper28', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2028.png' },
  { id: 'paper46', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2046.png' },
];

const BG_URL = 'https://raw.githubusercontent.com/debbora12/journal-assets/main/backgrounds/Gemini_Generated_Image_np18tnnp18tnnp18.png';

console.log('Compressing papers...');
for (const p of PAPERS) {
  try {
    const res = await fetch(p.url);
    const buf = Buffer.from(await res.arrayBuffer());
    const out = join(ROOT, 'public/papers', `${p.id}.webp`);
    // Papers displayed at ~180×180 in journal, keep good quality for texture detail
    const info = await sharp(buf)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(out);
    console.log(`  ${p.id}: ${Math.round(buf.length/1024)}KB → ${Math.round(info.size/1024)}KB`);
  } catch (e) {
    console.error(`  ${p.id}: FAILED — ${e.message}`);
  }
}

console.log('\nCompressing background bg3...');
try {
  const res = await fetch(BG_URL);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = join(ROOT, 'public/backgrounds/bg3.webp');
  const info = await sharp(buf)
    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(out);
  console.log(`  bg3: ${Math.round(buf.length/1024)}KB → ${Math.round(info.size/1024)}KB`);
} catch (e) {
  console.error(`  bg3: FAILED — ${e.message}`);
}

console.log('\nDone.');
