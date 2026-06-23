import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const STICKERS = [
  { id: 'png-1',  url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/f5ceee0c-85a5-4a57-aafd-495829b233bf.png' },
  { id: 'png-2',  url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/efff2121-b5c0-4ef6-82b5-dd350187d04e.png' },
  { id: 'png-3',  url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/e39d01c3-95ef-4cd6-991c-042bdebfde6a.png' },
  { id: 'png-4',  url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/dfdbf69c-936a-4de0-97ea-b4d4188b8788.png' },
  { id: 'png-5',  url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/dc459b3e-f7ba-4569-9758-78c1b56ce880.png' },
  { id: 'png-6',  url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/d60a51f5-8b20-478e-af94-2f2dc0f07cb5.png' },
  { id: 'png-7',  url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/d0787db4-e704-4f21-8a58-44b2ecb3befe.png' },
  { id: 'png-8',  url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/cb49f39d-99fd-44e7-9535-9f20b89b30bb.png' },
  { id: 'png-9',  url: 'https://raw.githubusercontent.com/debbora12/journal-assets/main/sem-bg/c869f5f4-72d1-4315-b38c-41205ade9aef.png' },
];

const COVER_URL = 'https://raw.githubusercontent.com/debbora12/journal-assets/main/covers/Design%20sem%20nome.png';

mkdirSync(join(ROOT, 'public/stickers'), { recursive: true });
mkdirSync(join(ROOT, 'public/covers'), { recursive: true });

console.log('Downloading and compressing stickers...');
for (const s of STICKERS) {
  try {
    const buf = await fetchBuffer(s.url);
    const outPath = join(ROOT, 'public/stickers', `${s.id}.webp`);
    const info = await sharp(buf)
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, lossless: false })
      .toFile(outPath);
    const origKB = Math.round(buf.length / 1024);
    const newKB = Math.round(info.size / 1024);
    console.log(`  ${s.id}: ${origKB}KB → ${newKB}KB`);
  } catch (e) {
    console.error(`  ${s.id}: FAILED — ${e.message}`);
  }
}

console.log('\nDownloading and compressing caderno cover...');
try {
  const buf = await fetchBuffer(COVER_URL);
  const outPath = join(ROOT, 'public/covers/caderno.webp');
  const info = await sharp(buf)
    .resize(1800, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, lossless: false })
    .toFile(outPath);
  const origKB = Math.round(buf.length / 1024);
  const newKB = Math.round(info.size / 1024);
  console.log(`  caderno: ${origKB}KB → ${newKB}KB`);
} catch (e) {
  console.error(`  caderno: FAILED — ${e.message}`);
}

console.log('\nDone.');
