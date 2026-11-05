import { parseMrzCedula } from './cedula/mrzParser';
import { parseLegacyCedula } from './cedula/legacyParser';
import type { ParseCedulaResponse } from './cedula/types';

export * from './cedula/types';
export { parseMrzCedula } from './cedula/mrzParser';
export { parseLegacyCedula } from './cedula/legacyParser';

export const parseCedula = (ocrText: string, tesseractData: any): ParseCedulaResponse => {
  const legacyText = tesseractData?.legacyText ?? ocrText;
  const mrzText = tesseractData?.mrzText ?? ocrText;
  const focusedSurnameText = tesseractData?.focusedSurnameText ?? '';
  const focusedNameText = tesseractData?.focusedNameText ?? '';

  // 1. Si la imagen contiene palabras clave de cédula amarilla, priorizar el parser Legacy
  if (legacyText && /APELLID|NOMBRE|IDENTIFICACION PERSONAL|FECHA DE NACIMIENTO|SANGRE|ESTATURA|ESTADO CIVIL|SEXO|RH/.test(legacyText.toUpperCase())) {
    const legacyData = parseLegacyCedula(legacyText, focusedNameText, focusedSurnameText);
    if (legacyData) {
      return { success: true, data: legacyData };
    }
  }

  // 2. Intentar parsear como cédula nueva con MRZ (3 líneas)
  const mrzData = parseMrzCedula(mrzText);
  if (mrzData) {
    return { success: true, data: mrzData };
  }

  // 3. Fallback al parser Legacy si el MRZ no produjo un resultado válido
  const legacyFallback = parseLegacyCedula(legacyText, focusedNameText, focusedSurnameText);
  if (legacyFallback) {
    return { success: true, data: legacyFallback };
  }

  return { success: false, error: 'No se pudieron extraer datos de la cédula.' };
};
