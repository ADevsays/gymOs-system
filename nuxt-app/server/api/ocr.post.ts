import { defineEventHandler, readBody } from 'h3';
import { extractTextFromImage } from '../services/tesseractOcr';
import { parseCedula } from '../services/cedulaParser';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  if (!body || !body.image) {
    return { success: false, error: "No image provided" };
  }

  try {
    const tesseractData = await extractTextFromImage(body.image);
    const result = parseCedula(tesseractData.text, tesseractData);

    if (result.success) {
      return { success: true, data: result.data, rawText: tesseractData.text };
    } else {
      return { success: false, error: result.error, rawText: tesseractData.text };
    }

  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
