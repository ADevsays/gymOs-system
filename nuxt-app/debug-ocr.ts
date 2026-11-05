import fs from 'fs';
import path from 'path';
import { createWorker, PSM } from 'tesseract.js';
import { parseCedula } from './server/services/cedulaParser.js';
import sharp from 'sharp';

async function toNormalizedJpegBuffer(rawBuffer: Buffer): Promise<Buffer> {
  const isHeic = rawBuffer.length > 12 &&
    rawBuffer.slice(4, 8).toString('ascii') === 'ftyp' &&
    ['heic', 'heix', 'mif1', 'msf1'].includes(rawBuffer.slice(8, 12).toString('ascii').toLowerCase());

  let jpegBuffer: Buffer;

  if (isHeic) {
    console.log('📱 Formato HEIC detectado. Decodificando con heic-convert...');
    const heicConvert = await import('heic-convert');
    const convert = (heicConvert as any).default ?? heicConvert;
    const outputBuffer = await convert({
      buffer: rawBuffer,
      format: 'JPEG',
      quality: 0.92,
    });
    jpegBuffer = Buffer.from(outputBuffer);
    console.log('✅ Conversión HEIC→JPEG exitosa.');
  } else {
    console.log('🖼️ Formato estándar detectado (JPG/PNG/WEBP). Procesando con sharp...');
    jpegBuffer = rawBuffer;
  }

  return sharp(jpegBuffer)
    .resize(1600, null, { withoutEnlargement: true })
    .grayscale()
    .normalize()
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function runDebugger() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('❌ Por favor, indica la ruta de la imagen. Ejemplo: npx tsx debug-ocr.ts public/cedula.heic');
    return;
  }

  const imagePath = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ No se encontró la imagen en: ${imagePath}`);
    return;
  }

  console.log(`\n🔍 Iniciando OCR en: ${imagePath}...\n`);

  const rawBuffer = fs.readFileSync(imagePath);
  
  console.log('⚙️ Normalizando imagen (max 1600px, escala de grises, contraste)...');
  const processedBuffer = await toNormalizedJpegBuffer(rawBuffer);
  console.log(`✅ Buffer procesado: ${Math.round(processedBuffer.length / 1024)} KB\n`);

  const tessdataPath = path.resolve(process.cwd(), 'app/assets/models/tessdata');
  
  const worker = await createWorker('ocrb', 1, {
    langPath: tessdataPath,
    gzip: false,
    logger: m => process.stdout.write(`\r⚙️ Tesseract: ${m.status} - ${Math.round(m.progress * 100)}%  `)
  });

  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
  });

  console.log(`\n\n📸 Leyendo texto...`);
  const { data } = await worker.recognize(processedBuffer);
  await worker.terminate();

  console.log(`\n\n================ TEXTO CRUDO EXTRAÍDO ================`);
  console.log(data.text);
  console.log(`======================================================\n`);

  const result = parseCedula(data.text, null);

  if (result.success) {
    console.log(`✅ ¡ÉXITO! Datos extraídos:`);
    console.table(result.data);
  } else {
    console.log(`❌ FRACASO: ${result.error}`);
    console.log('\n⚠️ Asegúrate de que la foto sea del REVERSO de la cédula nueva (3 líneas con "<<<<")');
  }
}

runDebugger().catch(console.error);
