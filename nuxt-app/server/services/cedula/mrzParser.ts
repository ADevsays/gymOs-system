import { parse } from 'mrz';
import type { CedulaResultData } from './types';

const formatMrzBirthDate = (raw: string | null | undefined): string => {
  if (!raw || raw.length !== 6) return raw ?? '';
  const yy = raw.slice(0, 2);
  const mm = raw.slice(2, 4);
  const dd = raw.slice(4, 6);
  const year = parseInt(yy) <= new Date().getFullYear() % 100 ? `20${yy}` : `19${yy}`;
  return `${year}-${mm}-${dd}`;
};

const cleanMrzLine = (line: string): string => {
  return line
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9<]/g, '<')
    .toUpperCase();
};

// En MRZ colombiano TD1, el NUIP real está en la línea 2, posiciones 19–29 (0-index: 18–28)
const extractNuipFromMrz = (line2: string): string => {
  const optional = line2.slice(18, 29).replace(/</g, '').replace(/^0+/, '');
  return optional || '';
};

export const parseMrzCedula = (mrzText: string): CedulaResultData | null => {
  if (!mrzText) return null;

  const lines = mrzText
    .split('\n')
    .map((l: string) => cleanMrzLine(l))
    .filter((l: string) => l.length >= 25 && l.includes('<'));

  // El bloque MRZ TD1 consiste en exactamente 3 líneas de 30 caracteres
  const mrzLines = lines.slice(-3).map((line: string) => line.padEnd(30, '<').substring(0, 30));

  if (mrzLines.length !== 3) return null;

  try {
    const parsed = parse(mrzLines);
    if (!parsed || (!parsed.valid && !parsed.fields.documentNumber && !parsed.fields.lastName)) {
      return null;
    }

    return {
      cedula: extractNuipFromMrz(mrzLines[1]!) || parsed.fields.documentNumber || '',
      firstName: parsed.fields.firstName ?? '',
      lastName: parsed.fields.lastName ?? '',
      birthDate: formatMrzBirthDate(parsed.fields.birthDate),
      gender: parsed.fields.sex === 'male' ? 'M' : 'F',
      bloodType: '', // En la cédula nueva el RH no viene en el MRZ
      rawMrz: mrzLines,
    };
  } catch {
    return null;
  }
};
