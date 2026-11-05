import { createWorker, PSM, Worker } from 'tesseract.js';
import { parse as parseMrz } from 'mrz';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

let workerInstance: Worker | null = null;
let isInitializing = false;

function resolveOcrPaths() {
  const isPackaged = Boolean(process.env.GYMOS_RESOURCES_PATH);
  const resourcesBase = process.env.GYMOS_RESOURCES_PATH || process.cwd();

  let tessdataPath = isPackaged
    ? path.resolve(resourcesBase, 'tessdata')
    : path.resolve(resourcesBase, 'app/assets/models/tessdata');

  if (!fs.existsSync(path.join(tessdataPath, 'ocrb.traineddata'))) {
    if (fs.existsSync(path.join(resourcesBase, 'ocrb.traineddata'))) {
      tessdataPath = resourcesBase;
    } else if (fs.existsSync(path.resolve(process.cwd(), 'ocrb.traineddata'))) {
      tessdataPath = process.cwd();
    }
  }

  const serverDir = isPackaged
    ? path.resolve(resourcesBase, '..', 'server')
    : process.cwd();

  let workerPath = path.resolve(serverDir, 'node_modules/tesseract.js/src/worker-script/node/index.js');
  let corePath = path.resolve(serverDir, 'node_modules/tesseract.js-core');

  if (!fs.existsSync(workerPath)) {
    const rootWorker = path.resolve(process.cwd(), '../node_modules/tesseract.js/src/worker-script/node/index.js');
    if (fs.existsSync(rootWorker)) workerPath = rootWorker;
  }
  if (!fs.existsSync(corePath)) {
    const rootCore = path.resolve(process.cwd(), '../node_modules/tesseract.js-core');
    if (fs.existsSync(rootCore)) corePath = rootCore;
  }

  return {
    tessdataPath,
    workerPath: fs.existsSync(workerPath) ? workerPath : undefined,
    corePath: fs.existsSync(corePath) ? corePath : undefined,
  };
}

export const getWorker = async (): Promise<Worker> => {
  if (workerInstance) return workerInstance;
  
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!workerInstance) throw new Error('Tesseract worker failed to initialize');
    return workerInstance;
  }

  isInitializing = true;
  try {
    const { tessdataPath, workerPath, corePath } = resolveOcrPaths();
    console.log('[Tesseract] Initializing worker with paths:', { tessdataPath, workerPath, corePath });

    workerInstance = await createWorker('ocrb', 1, {
      workerPath,
      corePath,
      langPath: tessdataPath,
      cachePath: tessdataPath,
      gzip: false,
      logger: (m) => {
        if (m.status !== 'recognizing text') {
          console.log(`[Tesseract] ${m.status}: ${Math.round((m.progress || 0) * 100)}%`);
        }
      }
    });

    await workerInstance.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });
    console.log('[Tesseract] Worker initialized successfully and ready for recognition.');
  } catch (err: any) {
    console.error('[Tesseract] Worker initialization failed:', err);
    workerInstance = null;
    throw err;
  } finally {
    isInitializing = false;
  }
  
  if (!workerInstance) throw new Error('Tesseract worker failed to initialize');
  return workerInstance;
};

const isHeicBuffer = (buf: Buffer): boolean => {
  if (buf.length < 12) return false;
  const ftyp = buf.subarray(4, 8).toString('ascii');
  const brand = buf.subarray(8, 12).toString('ascii').toLowerCase();
  return ftyp === 'ftyp' && ['heic', 'heix', 'mif1', 'msf1'].includes(brand);
};

const toNormalizedJpegBuffer = async (rawBuffer: Buffer): Promise<Buffer> => {
  let jpegBuffer: Buffer;

  if (isHeicBuffer(rawBuffer)) {
    const { default: convert } = await import('heic-convert');
    const uint8Array = new Uint8Array(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.byteLength);
    const output = await convert({ buffer: uint8Array, format: 'JPEG', quality: 0.92 });
    jpegBuffer = Buffer.from(output);
  } else {
    jpegBuffer = rawBuffer;
  }

  return sharp(jpegBuffer)
    .resize(1600, null, { withoutEnlargement: true })
    .grayscale()
    .normalize()
    .jpeg({ quality: 90 })
    .toBuffer();
};

const getMrzLines = (text: string): string[] => text
  .split(/\r?\n/)
  .map(line => line.replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, '<').toUpperCase())
  .filter(line => line.length >= 25 && line.includes('<'))
  .slice(-3)
  .map(line => line.padEnd(30, '<').substring(0, 30));

const isValidMrz = (text: string): boolean => {
  const lines = getMrzLines(text);
  if (lines.length !== 3) return false;
  try {
    const parsed = parseMrz(lines);
    return Boolean(parsed.fields.documentNumber && parsed.fields.birthDate);
  } catch {
    return false;
  }
};

export const extractTextFromImage = async (base64Image: string) => {
  const TIMEOUT_MS = 60000;

  const processOcr = async () => {
    let worker: Worker;
    try {
      worker = await getWorker();
    } catch (err) {
      workerInstance = null;
      throw err;
    }

    try {
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const rawBuffer = Buffer.from(base64Data, 'base64');
      const processedBuffer = await toNormalizedJpegBuffer(rawBuffer);

      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });

      const mrz = await worker.recognize(processedBuffer);

      // La cédula nueva termina aquí si la lectura es un MRZ ICAO válido
      if (isValidMrz(mrz.data.text)) {
        return {
          text: mrz.data.text,
          mrzText: mrz.data.text,
          legacyText: '',
          focusedSurnameText: '',
          focusedNameText: '',
        };
      }

      // Proceso Legacy para cédulas amarillas o reversos
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:/- ',
        tessedit_pageseg_mode: PSM.AUTO,
      });

      const enhancedLegacyBuffer = await sharp(processedBuffer)
        .sharpen({ sigma: 1.2 })
        .linear(1.35, -25)
        .jpeg({ quality: 95 })
        .toBuffer();

      const legacy = await worker.recognize(enhancedLegacyBuffer).catch(() => ({ data: { text: '' } }));
      const legacyFallback = await worker.recognize(processedBuffer).catch(() => ({ data: { text: '' } }));
      const dimensions = await sharp(enhancedLegacyBuffer).metadata();

      const width = dimensions?.width ?? 1000;
      const height = dimensions?.height ?? 600;

      // Recorte 1: Franja de Apellidos (cédula amarilla)
      const surnameCropBuffer = await sharp(processedBuffer)
        .extract({
          left: Math.round(width * 0.02),
          top: Math.round(height * 0.28),
          width: Math.max(1, Math.round(width * 0.55)),
          height: Math.max(1, Math.round(height * 0.20)),
        })
        .resize(1600, null)
        .sharpen({ sigma: 1.0 })
        .jpeg({ quality: 95 })
        .toBuffer();

      // Recorte 2: Franja de Nombres (cédula amarilla)
      const nameCropBuffer = await sharp(processedBuffer)
        .extract({
          left: Math.round(width * 0.02),
          top: Math.round(height * 0.44),
          width: Math.max(1, Math.round(width * 0.55)),
          height: Math.max(1, Math.round(height * 0.20)),
        })
        .resize(1600, null)
        .sharpen({ sigma: 1.0 })
        .jpeg({ quality: 95 })
        .toBuffer();

      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ',
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });

      const focusedSurname = await worker.recognize(surnameCropBuffer).catch(() => ({ data: { text: '' } }));
      const focusedName = await worker.recognize(nameCropBuffer).catch(() => ({ data: { text: '' } }));

      // Recorte de la región izquierda completa
      let legacyRegionText = '';
      if (width > 0 && height > 0) {
        const leftRegion = await sharp(enhancedLegacyBuffer)
          .extract({
            left: 0,
            top: Math.round(height * 0.15),
            width: Math.max(1, Math.round(width * 0.70)),
            height: Math.max(1, Math.round(height * 0.75)),
          })
          .jpeg({ quality: 95 })
          .toBuffer();

        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:/- ',
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        });

        const regionResult = await worker.recognize(leftRegion).catch(() => ({ data: { text: '' } }));
        legacyRegionText = regionResult.data.text;
      }

      const legacyText = `${legacyRegionText}\n${legacy.data.text}\n${legacyFallback.data.text}`;

      return {
        text: `${mrz.data.text}\n${legacyText}`,
        mrzText: mrz.data.text,
        legacyText,
        focusedSurnameText: focusedSurname.data.text,
        focusedNameText: focusedName.data.text,
      };
    } catch (err) {
      workerInstance = null;
      throw err;
    }
  };

  // Timeout protector para evitar cuelgues infinitos
  return Promise.race([
    processOcr(),
    new Promise<{ text: string; mrzText: string; legacyText: string; focusedSurnameText: string; focusedNameText: string }>((_, reject) =>
      setTimeout(() => {
        workerInstance = null;
        reject(new Error('Timeout en procesamiento OCR'));
      }, TIMEOUT_MS)
    ),
  ]);
};
