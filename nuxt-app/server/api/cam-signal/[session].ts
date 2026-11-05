import { defineEventHandler, readBody } from 'h3';
import fs from 'fs';
import path from 'path';
import { extractTextFromImage } from '../../services/tesseractOcr';
import { parseCedula } from '../../services/cedulaParser';
import { getRelayUrl } from '../../utils/config';

interface SessionState {
  photo: string | null;
  status: 'waiting' | 'captured' | 'waiting_reverse' | 'waiting_front' | 'processed';
  cardType?: 'new_mrz' | 'legacy_yellow';
  ocrResult: any;
  step?: 'scan_any' | 'scan_front' | 'scan_reverse' | 'completed';
}

const sessions: Record<string, SessionState> = {};

const saveOcrAttemptLog = (session: string, base64Image: string, tesseractText: string, parseResult: any) => {
  try {
    const attemptsDir = path.resolve(process.env.GYMOS_DATA_PATH || process.cwd(), 'ocr-attempts');
    if (!fs.existsSync(attemptsDir)) {
      fs.mkdirSync(attemptsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imgPath = path.join(attemptsDir, `attempt-${timestamp}-${session}.jpg`);
    const jsonPath = path.join(attemptsDir, `attempt-${timestamp}-${session}.json`);

    fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));

    const logData = {
      timestamp: new Date().toISOString(),
      session,
      rawText: tesseractText,
      parseResult,
    };

    fs.writeFileSync(jsonPath, JSON.stringify(logData, null, 2), 'utf-8');
  } catch (err) {
    console.error('[OCR-LOG] Error guardando intento:', err);
  }
};

const mergeOcrResult = (previous: any, current: any) => {
  const merged = { ...(previous ?? {}) };
  for (const field of ['cedula', 'firstName', 'lastName', 'birthDate', 'gender', 'bloodType']) {
    if (!merged[field] && current?.[field]) merged[field] = current[field];
  }
  return merged;
};

async function processOcr(session: string, imageBase64: string, clientStep?: string) {
  try {
    const tesseractData = await extractTextFromImage(imageBase64);
    const result = parseCedula(tesseractData.text, tesseractData);

    saveOcrAttemptLog(session, imageBase64, tesseractData.text, result);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[OCR][cam-signal] sesión:', session, 'clientStep:', clientStep);
      console.log('[OCR][cam-signal] resultado parseado:', result);
    }

    const currentSaved = sessions[session].ocrResult;
    const effectiveStep = clientStep || sessions[session].step || 'scan_any';

    // ─── CASO: Solicitud explícita de REVERSO (después de haber capturado frontal) ───
    if (effectiveStep === 'scan_reverse') {
      const hasReverseData = !!(result.data?.birthDate || result.data?.bloodType);

      if (hasReverseData) {
        const mergedResult = mergeOcrResult(currentSaved, result.data);
        sessions[session].ocrResult = mergedResult;
        sessions[session].status = 'processed';
        sessions[session].step = 'completed';

        return {
          success: true,
          ocrSuccess: true,
          step: 'completed',
          message: 'Cédula amarilla leída completamente (Frontal + Reverso).',
        };
      } else {
        sessions[session].status = 'waiting_reverse';
        sessions[session].step = 'scan_reverse';

        return {
          success: true,
          ocrSuccess: false,
          ocrPartial: false,
          step: 'scan_reverse',
          error: 'No se pudo leer la fecha de nacimiento ni el tipo de sangre en el reverso. Intenta de nuevo.',
        };
      }
    }

    // ─── CASO: Solicitud explícita de FRONTAL (después de haber capturado reverso primero) ───
    if (effectiveStep === 'scan_front') {
      const hasFrontalData = !!(result.data?.cedula || result.data?.lastName);

      if (hasFrontalData) {
        const mergedResult = mergeOcrResult(currentSaved, result.data);
        sessions[session].ocrResult = mergedResult;
        sessions[session].status = 'processed';
        sessions[session].step = 'completed';

        return {
          success: true,
          ocrSuccess: true,
          step: 'completed',
          message: 'Cédula amarilla leída completamente (Reverso + Frontal).',
        };
      } else {
        sessions[session].status = 'waiting_front';
        sessions[session].step = 'scan_front';

        return {
          success: true,
          ocrSuccess: false,
          ocrPartial: false,
          step: 'scan_front',
          error: 'No se pudo leer el número de cédula o los nombres del frontal. Intenta de nuevo.',
        };
      }
    }

    // ─── CASO: Primer escaneo universal (scan_any) — auto-detección ───
    if (result.success && result.data) {
      const isMrz = !!(result.data.rawMrz && result.data.rawMrz.length === 3);

      // Cédula Nueva con zona MRZ → completado en 1 paso
      if (isMrz) {
        sessions[session].cardType = 'new_mrz';
        sessions[session].ocrResult = result.data;
        sessions[session].status = 'processed';
        sessions[session].step = 'completed';

        return {
          success: true,
          ocrSuccess: true,
          isMrz: true,
          step: 'completed',
          message: 'Cédula nueva leída con éxito.',
        };
      }

      sessions[session].cardType = 'legacy_yellow';
      const hasFrontalData = !!(result.data.cedula || result.data.lastName);
      const hasReverseData = !!(result.data.birthDate || result.data.bloodType);
      const detectedReverse = !!result.data.isReverseScan;

      // Reverso de cédula amarilla escaneado primero → pedir frontal
      if (detectedReverse && hasReverseData) {
        sessions[session].ocrResult = result.data;
        sessions[session].status = 'waiting_front';
        sessions[session].step = 'scan_front';

        return {
          success: true,
          ocrSuccess: false,
          ocrPartial: true,
          step: 'scan_front',
          message: '¡Reverso capturado! Ahora voltea la cédula y escanea el FRONTAL (cara con foto y número).',
          capturedReverse: true,
        };
      }

      // Frontal de cédula amarilla escaneado primero → pedir reverso
      if (hasFrontalData && !detectedReverse) {
        const mergedResult = mergeOcrResult(sessions[session].ocrResult, result.data);
        sessions[session].ocrResult = mergedResult;
        sessions[session].status = 'waiting_reverse';
        sessions[session].step = 'scan_reverse';

        return {
          success: true,
          ocrSuccess: false,
          ocrPartial: true,
          step: 'scan_reverse',
          message: '¡Frontal capturado! Ahora voltea la cédula y escanea el REVERSO.',
          capturedFront: true,
        };
      }

      // Tiene datos mixtos (poco probable pero posible) → tratar como frontal
      if (hasFrontalData) {
        sessions[session].ocrResult = result.data;

        if (hasReverseData) {
          sessions[session].status = 'processed';
          sessions[session].step = 'completed';
          return {
            success: true,
            ocrSuccess: true,
            step: 'completed',
            message: 'Cédula leída con éxito.',
          };
        }

        sessions[session].status = 'waiting_reverse';
        sessions[session].step = 'scan_reverse';
        return {
          success: true,
          ocrSuccess: false,
          ocrPartial: true,
          step: 'scan_reverse',
          message: '¡Frontal capturado! Ahora voltea la cédula y escanea el REVERSO.',
          capturedFront: true,
        };
      }
    }

    // Nada legible → error genérico, mantener en scan_any
    const currentStep = sessions[session].step;
    sessions[session].status = currentStep === 'scan_front' ? 'waiting_front' : currentStep === 'scan_reverse' ? 'waiting_reverse' : 'waiting';
    if (!['scan_front', 'scan_reverse'].includes(currentStep!)) {
      sessions[session].step = 'scan_any';
    }

    return {
      success: true,
      ocrSuccess: false,
      ocrPartial: false,
      step: sessions[session].step,
      error: result.error || 'No se pudieron extraer datos de la cédula. Intenta enfocar mejor el documento.',
    };
  } catch (error: any) {
    const currentStep = sessions[session].step;
    sessions[session].status = currentStep === 'scan_front' ? 'waiting_front' : currentStep === 'scan_reverse' ? 'waiting_reverse' : 'waiting';

    return {
      success: true,
      ocrSuccess: false,
      ocrPartial: false,
      step: sessions[session].step,
      error: error.message,
    };
  }
}

export default defineEventHandler(async (event) => {
  const session = event.context.params?.session as string;
  const method = event.node.req.method;

  if (!sessions[session]) {
    sessions[session] = { photo: null, status: 'waiting', ocrResult: null, step: 'scan_any' };
  }

  if (method === 'GET') {
    const relayUrl = getRelayUrl();
    if (relayUrl && (!sessions[session] || sessions[session].status === 'waiting' || sessions[session].status === 'waiting_front' || sessions[session].status === 'waiting_reverse')) {
      try {
        const relayRes = await fetch(`${relayUrl}/api/cam-signal?session=${session}`);
        if (relayRes.ok) {
          const relayData: any = await relayRes.json();
          if (relayData.status === 'captured' && relayData.photo) {
            // Delete from relay to avoid re-fetching
            fetch(`${relayUrl}/api/cam-signal?session=${session}`, { method: 'DELETE' }).catch(() => {});

            if (relayData.type === 'photo_avatar') {
              sessions[session].photo = relayData.photo;
              sessions[session].status = 'processed';
              return { status: 'processed', photo: relayData.photo };
            } else {
              const imageBase64 = relayData.photo;
              const clientStep = relayData.step || sessions[session].step || 'scan_any';
              sessions[session].photo = imageBase64;
              sessions[session].status = 'captured';

              await processOcr(session, imageBase64, clientStep);
            }
          }
        }
      } catch (err) {
        // silent fallback
      }
    }

    const data = sessions[session];
    if (data.status === 'processed' || data.status === 'waiting_reverse' || data.status === 'waiting_front') {
      return { ...data };
    }
    return { status: data.status, step: data.step };
  }

  if (method === 'POST') {
    const body = await readBody(event);

    if (body.type === 'reset') {
      sessions[session] = { photo: null, status: 'waiting', ocrResult: null, step: 'scan_any' };
      const relayUrl = getRelayUrl();
      if (relayUrl) {
        fetch(`${relayUrl}/api/cam-signal?session=${session}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session, type: 'reset' })
        }).catch(() => {});
      }
      return { success: true, status: 'waiting', step: 'scan_any' };
    }

    if (body.type === 'photo') {
      const imageBase64 = body.payload;
      const clientStep = body.step;
      sessions[session].photo = imageBase64;
      sessions[session].status = 'captured';

      return await processOcr(session, imageBase64, clientStep);
    } else if (body.type === 'photo_avatar') {
      const imageBase64 = body.payload;
      sessions[session].photo = imageBase64;
      sessions[session].status = 'processed';
      return { success: true, photoSuccess: true };
    }

    return { success: false, error: 'Unknown type' };
  }
});
