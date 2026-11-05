export interface NormalizedMemberRow {
  rowRef: string;
  fullName: string;
  firstName: string;
  lastName: string;
  cedula: string;
  isPendingCedula: boolean;
  phone: string | null;
  registrationDate: string | null;
  lastPaymentDate: string | null;
  expiryDate: string | null;
  planType: string;
  amount: number;
  status: string;
  bloodType: string | null;
  eps: string | null;
  birthDate: string | null;
  warnings: string[];
  isEmptyRow: boolean;
}

export interface CsvParseResult {
  rows: NormalizedMemberRow[];
  totalRawRows: number;
  emptyRowsCount: number;
  duplicateCedulas: string[];
}

const SPANISH_MONTHS: Record<string, string> = {
  ene: '01', enero: '01',
  feb: '02', febrero: '02',
  mar: '03', marzo: '03',
  abr: '04', abril: '04',
  may: '05', mayo: '05',
  jun: '06', junio: '06',
  jul: '07', julio: '07',
  ago: '08', agosto: '08',
  sep: '09', sept: '09', set: '09', septiembre: '09', setiembre: '09',
  oct: '10', octubre: '10',
  nov: '11', noviembre: '11',
  dic: '12', diciembre: '12',
};

export function tokenizeCsv(csvContent: string): string[][] {
  const cleanContent = csvContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!cleanContent.trim()) return [];

  const lines = cleanContent.split('\n');
  const sample = lines.slice(0, 5).join('\n');
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentToken = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanContent.length; i++) {
    const char = cleanContent[i];
    const nextChar = cleanContent[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentToken += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        currentToken += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentToken.trim());
        currentToken = '';
      } else if (char === '\n') {
        currentRow.push(currentToken.trim());
        result.push(currentRow);
        currentRow = [];
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
  }

  if (currentToken || currentRow.length > 0) {
    currentRow.push(currentToken.trim());
    result.push(currentRow);
  }

  return result;
}

export function capitalizeWords(text: string): string {
  if (!text) return '';
  const cleaned = text.trim().replace(/\s+/g, ' ');
  return cleaned
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { firstName: 'Sin Nombre', lastName: '.' };
  }
  if (words.length === 1) {
    return { firstName: words[0]!, lastName: '.' };
  }
  if (words.length === 2) {
    return { firstName: words[0]!, lastName: words[1]! };
  }
  if (words.length === 3) {
    return { firstName: words[0]!, lastName: `${words[1]} ${words[2]}` };
  }
  return {
    firstName: `${words[0]} ${words[1]}`,
    lastName: words.slice(2).join(' ')
  };
}

export function cleanMoney(raw: string | undefined): number {
  if (!raw) return 0;
  const digitsOnly = String(raw).replace(/[^0-9]/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

export function parseFlexibleDate(raw: string | undefined, fieldName = 'Fecha'): { date: string | null; warning?: string } {
  if (!raw) return { date: null };
  const str = raw.trim().toLowerCase();

  if (!str || str === '00/00/0000' || str === '0/0/0000' || str === '00/00/00' || str === 'null' || str === 'undefined' || str === '-') {
    return { date: null };
  }

  // Check numeric formats D/M/YYYY or DD/MM/YYYY or YYYY-MM-DD
  const numMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (numMatch) {
    let day = parseInt(numMatch[1]!, 10);
    let month = parseInt(numMatch[2]!, 10);
    let year = parseInt(numMatch[3]!, 10);

    if (year < 100) {
      year = year <= 30 ? 2000 + year : 1900 + year;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { date: formatted };
    }
  }

  // Check ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]!, 10);
    const month = parseInt(isoMatch[2]!, 10);
    const day = parseInt(isoMatch[3]!, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { date: formatted };
    }
  }

  // Check text format: "15 ene 1990", "3 marzo 85", "24 de diciembre de 2001"
  const textMatch = str.replace(/\bde\b/g, ' ').replace(/\s+/g, ' ').trim().match(/^(\d{1,2})\s+([a-zñáéíóú]+)\s+(\d{2,4})$/);
  if (textMatch) {
    const day = parseInt(textMatch[1]!, 10);
    const monthStr = textMatch[2]!.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let year = parseInt(textMatch[3]!, 10);

    if (year < 100) {
      year = year <= 30 ? 2000 + year : 1900 + year;
    }

    const monthNum = SPANISH_MONTHS[monthStr] || SPANISH_MONTHS[monthStr.slice(0, 3)];
    if (monthNum && day >= 1 && day <= 31) {
      const formatted = `${year}-${monthNum}-${String(day).padStart(2, '0')}`;
      return { date: formatted };
    }
  }

  return {
    date: null,
    warning: `${fieldName} no reconocida ("${raw}")`
  };
}

export function cleanBloodType(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/\s+/g, '').replace('0', 'O');
  const match = cleaned.match(/^(A|B|AB|O)[+\-]?$/);
  if (match) {
    const group = match[1];
    const sign = cleaned.includes('-') ? '-' : '+';
    return `${group}${sign}`;
  }
  return cleaned || null;
}

export function normalizeCsvRows(matrix: string[][]): CsvParseResult {
  if (matrix.length === 0) {
    return { rows: [], totalRawRows: 0, emptyRowsCount: 0, duplicateCedulas: [] };
  }

  // Detect header row: if row 0 has "NOMBRE" or "CEDULA" or "ID"
  let startIndex = 0;
  const firstRowJoined = matrix[0]?.join(' ').toUpperCase() || '';
  if (firstRowJoined.includes('NOMBRE') || firstRowJoined.includes('CEDULA') || firstRowJoined.includes('TELEFONO')) {
    startIndex = 1;
  }

  const normalizedRows: NormalizedMemberRow[] = [];
  let emptyRowsCount = 0;
  const cedulaCountMap = new Map<string, number>();

  for (let i = startIndex; i < matrix.length; i++) {
    const cols = matrix[i] || [];
    const rowRef = (cols[0] || `Fila-${i + 1}`).trim();

    // Check if row is completely empty (except possibly rowRef)
    const otherColsJoined = cols.slice(1).join('').trim();
    if (!otherColsJoined) {
      emptyRowsCount++;
      continue;
    }

    const rawFullName = cols[1] || '';
    const rawCedula = cols[2] || '';
    const rawPhone = cols[3] || '';
    const rawRegDate = cols[4] || '';
    const rawLastPayDate = cols[5] || '';
    const rawExpiryDate = cols[6] || '';
    const rawPlan = cols[7] || '';
    const rawAmount = cols[8] || '';
    const rawStatus = cols[9] || '';
    const rawBlood = cols[10] || '';
    const rawEps = cols[11] || '';
    const rawBirthDate = cols[12] || '';

    const warnings: string[] = [];

    // 1. Name
    const fullName = capitalizeWords(rawFullName);
    const { firstName, lastName } = splitFullName(fullName);
    if (!fullName) {
      warnings.push('Nombre no proporcionado');
    }

    // 2. Cedula
    const digitsCedula = rawCedula.replace(/\D/g, '');
    let cedula = '';
    let isPendingCedula = false;

    if (digitsCedula.length >= 6 && digitsCedula.length <= 10) {
      cedula = digitsCedula;
      cedulaCountMap.set(cedula, (cedulaCountMap.get(cedula) || 0) + 1);
    } else {
      cedula = `PENDIENTE-${rowRef.replace(/[^A-Z0-9]/gi, '').toUpperCase() || Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      isPendingCedula = true;
      warnings.push(`Cédula pendiente (generado ID temporal ${cedula})`);
    }

    // 3. Phone
    const digitsPhone = rawPhone.replace(/\D/g, '');
    let phone: string | null = null;
    if (!digitsPhone) {
      warnings.push('Dato incompleto: sin teléfono');
    } else if (digitsPhone.length === 10) {
      phone = digitsPhone;
    } else {
      phone = digitsPhone;
      warnings.push(`Teléfono inconsistente (${digitsPhone.length} dígitos: "${rawPhone}")`);
    }

    // 4. Dates
    const regDateParsed = parseFlexibleDate(rawRegDate, 'Fecha inscripción');
    if (regDateParsed.warning) warnings.push(regDateParsed.warning);

    const lastPayParsed = parseFlexibleDate(rawLastPayDate, 'Fecha último pago');
    if (lastPayParsed.warning) warnings.push(lastPayParsed.warning);

    const expiryParsed = parseFlexibleDate(rawExpiryDate, 'Fecha vencimiento');
    if (expiryParsed.warning) warnings.push(expiryParsed.warning);

    const birthParsed = parseFlexibleDate(rawBirthDate, 'Fecha nacimiento');
    if (birthParsed.warning) warnings.push(birthParsed.warning);

    // 5. Plan & Amount
    const planType = (rawPlan.trim().replace(/\s+/g, ' ').toUpperCase()) || 'NORMAL';
    const amount = cleanMoney(rawAmount);

    // 6. Status
    const status = (rawStatus.trim().replace(/\s+/g, ' ').toUpperCase()) || 'ACTIVO';

    // 7. Blood type & EPS
    const bloodType = cleanBloodType(rawBlood);
    const eps = rawEps.trim().replace(/\s+/g, ' ') || null;

    normalizedRows.push({
      rowRef,
      fullName,
      firstName,
      lastName,
      cedula,
      isPendingCedula,
      phone,
      registrationDate: regDateParsed.date,
      lastPaymentDate: lastPayParsed.date,
      expiryDate: expiryParsed.date,
      planType,
      amount,
      status,
      bloodType,
      eps,
      birthDate: birthParsed.date,
      warnings,
      isEmptyRow: false
    });
  }

  // Detect duplicate cedulas within the file
  const duplicateCedulas: string[] = [];
  for (const [ced, count] of cedulaCountMap.entries()) {
    if (count > 1) {
      duplicateCedulas.push(ced);
    }
  }

  // Tag rows that have duplicated cedula
  for (const row of normalizedRows) {
    if (!row.isPendingCedula && duplicateCedulas.includes(row.cedula)) {
      row.warnings.push(`Cédula duplicada en el archivo (${row.cedula}) - Requiere revisión manual`);
    }
  }

  return {
    rows: normalizedRows,
    totalRawRows: matrix.length - startIndex,
    emptyRowsCount,
    duplicateCedulas
  };
}
