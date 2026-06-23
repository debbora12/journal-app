import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
mkdirSync(join(ROOT, 'public/papers'), { recursive: true });
mkdirSync(join(ROOT, 'public/backgrounds'), { recursive: true });

// Only the ones that didn't finish + bg3
const REMAINING = [
  { id: 'paper18', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2018.png' },
  { id: 'paper27', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2027.png' },
  { id: 'paper28', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2028.png' },
  { id: 'paper46', url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/Paper%2046.png' },
];

const BG_URL = 'https://raw.githubusercontent.com/debbora12/journal-assets/main/backgrounds/Gemini_Generated_Image_np18tnnp18tnnp18.png';

async function compressOne(url, outPath, resize) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // Stream into buffer in chunks to avoid peak memory
  const buf = Buffer.from(await res.arrayBuffer());
  const info = await sharp(buf)
    .resize(resize.w, resize.h, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(outPath);
  return { origKB: Math.round(buf.length / 1024), newKB: Math.round(info.size / 1024) };
}

console.log('Compressing remaining papers...');
for (const p of REMAINING) {
  try {
    const out = join(ROOT, 'public/papers', `${p.id}.webp`);
    const r = await compressOne(p.url, out, { w: 800, h: 800 });
    console.log(`  ${p.id}: ${r.origKB}KB → ${r.newKB}KB`);
  } catch (e) {
    console.error(`  ${p.id}: FAILED — ${e.message}`);
  }
}

console.log('\nCompressing bg3...');
try {
  const out = join(ROOT, 'public/backgrounds/bg3.webp');
  const r = await compressOne(BG_URL, out, { w: 1920, h: 1080 });
  console.log(`  bg3: ${r.origKB}KB → ${r.newKB}KB`);
} catch (e) {
  console.error(`  bg3: FAILED — ${e.message}`);
}

console.log('\nDone.');
