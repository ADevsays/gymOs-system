import { getWorker } from '../services/tesseractOcr';

export default defineNitroPlugin(() => {
  // Pre-load the Tesseract OCR engine and traineddata model into memory in background on server boot
  setTimeout(() => {
    getWorker()
      .then(() => {
        console.log('[OCR] Tesseract worker pre-warmed successfully.');
      })
      .catch((err) => {
        console.warn('[OCR] Background pre-warm failed:', err.message);
      });
  }, 1000);
});
