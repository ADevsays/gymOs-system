import sharp from 'sharp';
import { join, dirname } from 'path';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, '..', 'nuxt-app', 'public', 'img', 'logo-agod.png');

const sizes = [16, 32, 48, 256];

function createIcoBuffer(pngBuffers) {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataOffset = headerSize + numImages * dirEntrySize;

  let totalSize = dataOffset;
  for (const buf of pngBuffers) totalSize += buf.length;

  const ico = Buffer.alloc(totalSize);
  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(numImages, 4);

  let offset = dataOffset;
  for (let i = 0; i < numImages; i++) {
    const size = sizes[i];
    const pos = headerSize + i * dirEntrySize;
    ico.writeUInt8(size < 256 ? size : 0, pos);
    ico.writeUInt8(size < 256 ? size : 0, pos + 1);
    ico.writeUInt8(0, pos + 2);
    ico.writeUInt8(0, pos + 3);
    ico.writeUInt16LE(1, pos + 4);
    ico.writeUInt16LE(32, pos + 6);
    ico.writeUInt32LE(pngBuffers[i].length, pos + 8);
    ico.writeUInt32LE(offset, pos + 12);
    pngBuffers[i].copy(ico, offset);
    offset += pngBuffers[i].length;
  }

  return ico;
}

async function main() {
  const pngBuffers = [];
  for (const size of sizes) {
    const buf = await sharp(inputPath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    pngBuffers.push(buf);
  }

  const ico = createIcoBuffer(pngBuffers);
  const outPath = join(__dirname, 'assets', 'icon.ico');
  writeFileSync(outPath, ico);
  console.log(`Icon generated: ${outPath} (${(ico.length / 1024).toFixed(1)} KB)`);

  const distIco = join(__dirname, 'dist', 'icon.ico');
  try {
    writeFileSync(distIco, ico);
    console.log(`Also copied to: ${distIco}`);
  } catch {}
}

main();
