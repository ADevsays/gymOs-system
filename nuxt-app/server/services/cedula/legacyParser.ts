import type { CedulaResultData } from './types';

const MONTH_MAP_LEGACY: Record<string, string> = {
  JAN: '01', ENE: '01',
  FEB: '02',
  MAR: '03',
  APR: '04', ABR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08', AGO: '08',
  SEP: '09', SET: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12', DIC: '12',
};

const cleanNameLine = (line: string | undefined): string => {
  if (!line) return '';
  return line
    .replace(/\s+[A-Z0-9]{1,2}$/, '')
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const isNameLine = (line: string | undefined): boolean => {
  const candidate = cleanNameLine(line);
  return (
    candidate.length >= 3 &&
    /^[A-Z]+(?: [A-Z]+){0,5}$/.test(candidate) &&
    !/REPUBLICA|IDENTIFICA|PERSONAL|CIUDADANIA|CEDULA|NUMERO|APELLID|NOMBRE|FIRMA|LUGAR|FECHA|ESTATURA|REGISTRADOR|EXPEDICION|INDICE|COLOMBIA|NACIMIENTO|CALDAS|MANIZALES|BOGOTA|MEDELLIN|VALLE|CUNDINAMARCA|SANTAFE|ROCHA|VEGA|ALEXANDER/.test(candidate)
  );
};

export const parseLegacyCedula = (ocrText: string, focusedNameText = '', focusedSurnameText = ''): CedulaResultData | null => {
  if (!ocrText && !focusedNameText && !focusedSurnameText) return null;

  const text = (ocrText || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const lines = text.split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);

  // Detección explícita de reverso para aislar datos del frontal
  const isReverseScan = (text.includes('ESTATURA') || text.includes('GSRH') || text.includes('INDICE DERECHO')) && !text.includes('CEDULA DE CIUDADANIA');

  // 1. Número de cédula
  let cedula = '';
  if (!isReverseScan) {
    const numberLabelLine = text.match(/(?:^|\n)\s*(?:NUMERO|NO\.?|N\.?)\b[^\n]*/)?.[0] ?? '';
    const numberMatch = numberLabelLine.match(/\d[\d\s.,-]{5,20}/);
    const numericLines = lines.map(line => line.replace(/[^0-9]/g, '')).filter(value => /^\d{8,12}$/.test(value));
    const rawCedula = numberMatch?.[0]?.replace(/\D/g, '') ?? numericLines[0] ?? '';
    cedula = rawCedula.replace(/^0(?=\d{10}$)/, '');
  }

  const readLabel = (labels: string[]) =>
    text.match(new RegExp(`(?:${labels.join('|')})\\s*[:.-]?\\s*([^\\n]+)`))?.[1]?.replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim() ?? '';

  let lastName = '';
  let firstName = '';

  if (!isReverseScan) {
    // 2. Apellidos y Nombres por proximidad a rótulos
    const surnameIndex = lines.findIndex(line => /ELLID/.test(line));
    const nameIndex = lines.findIndex(line => /^NOMBRES?$/.test(line));

    if (surnameIndex >= 0 && nameIndex > surnameIndex) {
      if (isNameLine(lines[surnameIndex - 1])) lastName = lines[surnameIndex - 1]!;
      if (isNameLine(lines[nameIndex - 1])) firstName = lines[nameIndex - 1]!;
    }
    if (!lastName && surnameIndex >= 0 && isNameLine(lines[surnameIndex - 1])) lastName = lines[surnameIndex - 1]!;
    if (!firstName && surnameIndex >= 0) {
      for (const line of lines.slice(surnameIndex + 1, surnameIndex + 4)) {
        if (isNameLine(line)) {
          firstName = line;
          break;
        }
      }
    }

    if (!lastName) lastName = readLabel(['APELLIDOS?', 'APELLIDO']);
    if (!firstName) firstName = readLabel(['NOMBRES?', 'NOMBRE']);

    // Candidatos alternativos en múltiples pasadas OCR
    const surnameCandidates = lines.flatMap((line, index) => {
      if (!/APELLID/.test(line)) return [];
      for (let i = 1; i <= 3; i++) {
        if (isNameLine(lines[index - i])) return [lines[index - i]!];
      }
      return [];
    });

    const firstNameCandidates = lines.flatMap((line, index) => {
      const candidates: string[] = [];
      if (/ELLID/.test(line)) {
        for (let i = 1; i <= 3; i++) {
          if (isNameLine(lines[index + i])) {
            candidates.push(lines[index + i]!);
            break;
          }
        }
      }
      if (/NOMBRE/.test(line)) {
        for (let i = 1; i <= 3; i++) {
          if (isNameLine(lines[index - i])) {
            candidates.push(lines[index - i]!);
            break;
          }
        }
      }
      return candidates;
    });

    if (surnameCandidates.length) lastName = surnameCandidates.sort((a, b) => b.length - a.length)[0]!;
    if (firstNameCandidates.length) firstName = firstNameCandidates.sort((a, b) => b.length - a.length)[0]!;

    // Fallback si no hay rótulos visibles pero sí número de cédula
    if ((!lastName || !firstName) && cedula) {
      const numberIndex = lines.findIndex(line => line.replace(/\D/g, '').includes(cedula));
      const identityLines = numberIndex >= 0
        ? lines.slice(numberIndex + 1, numberIndex + 7).filter(isNameLine).map(cleanNameLine)
        : [];
      if (!lastName && identityLines[0]) lastName = identityLines[0];
      if (!firstName && identityLines[1]) firstName = identityLines[1];
    }

    // Integración de recorte enfocado de apellidos (focusedSurnameText)
    if (focusedSurnameText) {
      const focusedSurnames = focusedSurnameText
        .split(/\r?\n/)
        .map(cleanNameLine)
        .filter(isNameLine);

      if (focusedSurnames.length > 0) {
        const bestFocusedSurname = focusedSurnames.sort((a, b) => b.length - a.length)[0]!;
        if (!lastName || (bestFocusedSurname.length > lastName.length && isNameLine(bestFocusedSurname))) {
          lastName = bestFocusedSurname;
        }
      }
    }

    // Integración de recorte enfocado de nombres (focusedNameText)
    if (focusedNameText) {
      const lastNameWords = lastName.split(/\s+/).filter(w => w.length >= 3);
      const focusedCandidates = focusedNameText
        .split(/\r?\n/)
        .map(cleanNameLine)
        .filter(line => {
          if (!isNameLine(line)) return false;
          const containsLastNameWord = lastNameWords.some(w => line.includes(w));
          return !containsLastNameWord;
        });

      if (focusedCandidates.length > 0) {
        const bestFocused = focusedCandidates.sort((a, b) => b.length - a.length)[0]!;
        if (!firstName || (bestFocused.length > firstName.length && isNameLine(bestFocused))) {
          firstName = bestFocused;
        }
      }
    }

    // Función para sanear y elegir la mejor palabra (evitar letras faltantes al inicio/final)
    const selectCompleteName = (candidate: string, alternative: string): string => {
      if (!isNameLine(alternative)) return candidate;
      const candWords = candidate.split(/\s+/).filter(Boolean);
      const altWords = alternative.split(/\s+/).filter(Boolean);

      if (candWords.length === 0) return alternative;
      if (altWords.length === 0) return candidate;

      const mergedWords = candWords.map((word, idx) => {
        const altWord = altWords[idx];
        if (!altWord) return word;
        if (altWord.includes(word) && altWord.length > word.length) return altWord;
        if (word.includes(altWord) && word.length > altWord.length) return word;
        return word.length >= altWord.length ? word : altWord;
      });

      return mergedWords.join(' ');
    };

    if (focusedNameText) {
      const cleanFocused = cleanNameLine(focusedNameText);
      if (isNameLine(cleanFocused)) {
        firstName = selectCompleteName(firstName, cleanFocused);
      }
    }

    if (focusedSurnameText) {
      const cleanFocusedSur = cleanNameLine(focusedSurnameText);
      if (isNameLine(cleanFocusedSur)) {
        lastName = selectCompleteName(lastName, cleanFocusedSur);
      }
    }

    if (lastName && firstName) {
      const lastWords = lastName.split(/\s+/);
      const filteredFirst = firstName.split(/\s+/).filter(w => {
        return !lastWords.some(lw => lw === w || (w.length >= 4 && lw.length >= 4 && (w.endsWith(lw.slice(1)) || lw.endsWith(w.slice(1)))));
      });
      if (filteredFirst.length > 0) {
        firstName = filteredFirst.join(' ');
      }
    }

    lastName = cleanNameLine(lastName);
    firstName = cleanNameLine(firstName);
  }

  // 3. Fecha de Nacimiento (Robusta para reverso)
  let birthDate = '';
  // Pre-limpieza de ruido OCR común antes de abreviaturas de mes
  const cleanDateText = text
    .replace(/\b1[T1iI](\d)\s*(JAN|ENE|FEB|MAR|APR|ABR|MAY|JUN|JUL|AUG|AGO|SEP|SET|OCT|NOV|DEC|DIC)/g, '$1 $2')
    .replace(/\b[M1][T1iI]\s*(JAN|ENE|FEB|MAR|APR|ABR|MAY|JUN|JUL|AUG|AGO|SEP|SET|OCT|NOV|DEC|DIC)/g, '11 $1')
    .replace(/(\d{1,2})\s+\d\s*(JAN|ENE|FEB|MAR|APR|ABR|MAY|JUN|JUL|AUG|AGO|SEP|SET|OCT|NOV|DEC|DIC)/g, '$1 $2');

  // Intento A: Con rótulo explícito FECHA DE NACIMIENTO
  const birthMatch = cleanDateText.match(/(?:FECHA\s*(?:DE\s*)?NACIMIENTO|NACIMIENTO|NACIDO)[^\n0-9]*(\d{1,2})[\s\-./]*(JAN|ENE|FEB|MAR|APR|ABR|MAY|JUN|JUL|AUG|AGO|SEP|SET|OCT|NOV|DEC|DIC)[\s\-./]*(\d{2,4})/i);
  if (birthMatch) {
    const yearStr = birthMatch[3]!.length === 2 ? `20${birthMatch[3]}` : birthMatch[3]!;
    birthDate = `${yearStr}-${MONTH_MAP_LEGACY[birthMatch[2]!.toUpperCase()]!}-${birthMatch[1]!.padStart(2, '0')}`;
  }

  // Intento B: Fecha autónoma formato DD-MMM-YYYY o DD MMM YYYY sin necesidad del rótulo exacto
  if (!birthDate) {
    const standaloneMatch = cleanDateText.match(/\b(\d{1,2})[\s\-./]+(JAN|ENE|FEB|MAR|APR|ABR|MAY|JUN|JUL|AUG|AGO|SEP|SET|OCT|NOV|DEC|DIC)[\s\-./]+(\d{4})\b/i);
    if (standaloneMatch) {
      birthDate = `${standaloneMatch[3]}-${MONTH_MAP_LEGACY[standaloneMatch[2]!.toUpperCase()]!}-${standaloneMatch[1]!.padStart(2, '0')}`;
    }
  }

  // Intento C: Fecha numérica estándar DD/MM/YYYY o YYYY-MM-DD
  if (!birthDate) {
    const numMatch = text.match(/\b(\d{1,2})[\s\-./](\d{1,2})[\s\-./](\d{4})\b/);
    if (numMatch) {
      const day = parseInt(numMatch[1]!);
      const month = parseInt(numMatch[2]!);
      const year = parseInt(numMatch[3]!);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1920 && year <= new Date().getFullYear()) {
        birthDate = `${year}-${numMatch[2]!.padStart(2, '0')}-${numMatch[1]!.padStart(2, '0')}`;
      }
    }
  }

  // 4. Género
  const gender = text.match(/(?:SEXO)[^A-Z]{0,6}([MF])/i)?.[1]?.toUpperCase() ?? '';

  // 5. Grupo Sanguíneo (RH) (Robusto para reverso)
  const normalizedBloodText = text
    .replace(/\b0\s*([+\-tT1iI|+]|POS|NEG|POSITIVO|NEGATIVO)\b/g, 'O$1')
    .replace(/\b1[.,]?\d{2}\s*0\b/g, (m) => m.replace('0', 'O'));

  let bloodMatch = normalizedBloodText.match(/(?:G\.?\s*S\.?\s*RH|G\.?\s*S\.?|RH|GRUPO\s*SANGUINEO)[^\nA-Z0-9]*((?:A|B|AB|O|0)\s*[+\-tT1iI|+]?|(?:A|B|AB|O|0)\s*(?:POS|NEG|POSITIVO|NEGATIVO)?)/i)?.[1]?.toUpperCase();

  if (!bloodMatch) {
    // Buscar tipo de sangre junto a la estatura (ej. 176 O, 176 0, 1.76 O+)
    const heightBloodMatch = normalizedBloodText.match(/\b1[.,]?\d{2}\s*([O0A-Z]{1,2}\s*[+\-]?)/i);
    if (heightBloodMatch) {
      bloodMatch = heightBloodMatch[1]!.toUpperCase().replace('0', 'O');
    }
  }

  if (!bloodMatch) {
    // Buscar tipo de sangre suelto cerca de palabras clave del reverso (ej. ESTATURA, RH, SANGRE)
    const reverseLines = lines.filter(l => /RH|G\s*S|ESTATURA|SANGRE|FACTOR/.test(l));
    for (const line of reverseLines) {
      const cleanLine = line.replace(/\b0\b/g, 'O').replace(/\b0([+\-])/g, 'O$1');
      const match = cleanLine.match(/\b(A|B|AB|O)\s*([+\-tT1iI|+]|POS|NEG|POSITIVO|NEGATIVO)?\b/i);
      if (match) {
        bloodMatch = match[0].toUpperCase();
        break;
      }
    }
  }

  if (!bloodMatch) {
    const standaloneRh = normalizedBloodText.match(/\b(O|0|A|B|AB)\s*([+\-])\b/);
    if (standaloneRh && standaloneRh[1] && standaloneRh[2]) {
      bloodMatch = `${standaloneRh[1].replace('0', 'O')}${standaloneRh[2]}`;
    }
  }

  let bloodType = '';
  if (bloodMatch) {
    const cleaned = bloodMatch.replace(/\s+/g, '').replace(/^0/, 'O');
    const groupMatch = cleaned.match(/^(A|B|AB|O)/);
    if (groupMatch) {
      const group = groupMatch[1];
      const isNeg = /NEG|-/.test(cleaned);
      bloodType = `${group}${isNeg ? '-' : '+'}`;
    }
  }

  if (!cedula && !firstName && !lastName && !birthDate && !gender && !bloodType) return null;

  return { cedula, firstName, lastName, birthDate, gender, bloodType, rawMrz: [], isReverseScan };
};
