import { db } from '../lib/db';
import { members, subscriptions, payments, plans } from '../../drizzle/schema';
import { eq, inArray } from 'drizzle-orm';
import { tokenizeCsv, normalizeCsvRows, type NormalizedMemberRow } from '../utils/csvNormalizer';

export interface ImportPreviewResponse {
  totalRawRows: number;
  emptyRowsCount: number;
  readyToImportCount: number;
  duplicateInFileCount: number;
  alreadyInDbCount: number;
  pendingCedulasCount: number;
  newPlanTypes: string[];
  newStatuses: string[];
  warningsCount: number;
  sampleRows: NormalizedMemberRow[];
  reportRows: Array<{
    rowRef: string;
    fullName: string;
    cedula: string;
    status: 'ready' | 'duplicate_in_file' | 'already_in_db';
    warnings: string[];
  }>;
}

export interface ImportExecutionResponse {
  success: boolean;
  importedCount: number;
  skippedEmptyCount: number;
  skippedDuplicateFileCount: number;
  skippedAlreadyInDbCount: number;
  pendingCedulasCount: number;
  newPlansCreated: string[];
  report: Array<{
    rowRef: string;
    fullName: string;
    cedula: string;
    action: 'imported' | 'skipped_duplicate_file' | 'skipped_already_in_db' | 'skipped_empty';
    warnings: string[];
  }>;
}

interface DbPlan {
  id: number;
  name: string;
  type: string;
  price: number;
  durationDays: number;
  description: string | null;
  maxMembers: number;
  isActive: boolean | null;
}

const ALLOWED_PLAN_SPECS: Record<string, { name: string; type: string; price: number; durationDays: number; description: string; maxMembers: number }> = {
  ESTUDIANTE: { name: 'Estudiante', type: 'standard', price: 80000, durationDays: 30, description: 'Plan para estudiantes', maxMembers: 1 },
  QUINCENA: { name: 'Quincena', type: 'standard', price: 50000, durationDays: 15, description: 'Plan de 15 días', maxMembers: 1 },
  PAREJA: { name: 'Pareja', type: 'group', price: 87500, durationDays: 30, description: 'Plan pareja', maxMembers: 2 },
  PROMO2X1: { name: 'Promo 2x1', type: 'promo', price: 60000, durationDays: 30, description: 'Promoción 2x1', maxMembers: 2 },
  TIQUETERA: { name: 'Tiquetera', type: 'standard', price: 60000, durationDays: 30, description: 'Plan tiquetera', maxMembers: 1 },
  ESPECIAL: { name: 'Especial', type: 'standard', price: 0, durationDays: 365, description: 'Plan especial (Trabajadores / Cortesía)', maxMembers: 1 },
};

export function matchAllowedPlanKey(rawPlanType: string): string | null {
  const norm = (rawPlanType || '').trim().toUpperCase().replace(/\s+/g, '');
  if (norm.includes('ESTUDIANTE')) return 'ESTUDIANTE';
  if (norm.includes('QUINCENA')) return 'QUINCENA';
  if (norm.includes('PAREJA')) return 'PAREJA';
  if (norm.includes('PROMO2X1') || norm.includes('2X1')) return 'PROMO2X1';
  if (norm.includes('TIQUETERA')) return 'TIQUETERA';
  if (norm.includes('ESPECIAL')) return 'ESPECIAL';
  return null;
}

export function resolveImportPlan(
  rawPlanType: string,
  amount: number,
  allPlans: DbPlan[],
  lastPaymentDate?: string | null,
  status?: string | null
): {
  plan: DbPlan;
  isEspecial: boolean;
  priceToCharge: number;
  customPriceReason: string | null;
  matchedSpecKey: string | null;
} {
  const norm = (rawPlanType || '').trim().toUpperCase().replace(/\s+/g, '');

  const findByName = (target: string) =>
    allPlans.find(p => p.name.toUpperCase().replace(/\s+/g, '') === target.toUpperCase().replace(/\s+/g, ''));

  const normalPlan = findByName('Plan Mensual Pro') || findByName('Normal') || allPlans[0]!;

  const isWorkerCase = amount === 0 && (!lastPaymentDate || lastPaymentDate === null) && (status || '').toUpperCase().includes('ACT');

  if (isWorkerCase || (norm.includes('ESPECIAL') && amount === 0)) {
    const spec = ALLOWED_PLAN_SPECS.ESPECIAL!;
    const existing = findByName(spec.name);
    if (existing) {
      return {
        plan: existing,
        isEspecial: true,
        priceToCharge: 0,
        customPriceReason: null,
        matchedSpecKey: 'ESPECIAL'
      };
    } else {
      const virtualPlan: DbPlan = {
        id: -1,
        name: spec.name,
        type: spec.type,
        price: 0,
        durationDays: spec.durationDays,
        description: spec.description,
        maxMembers: spec.maxMembers,
        isActive: true
      };
      return {
        plan: virtualPlan,
        isEspecial: true,
        priceToCharge: 0,
        customPriceReason: null,
        matchedSpecKey: 'ESPECIAL'
      };
    }
  }

  if (norm.includes('ESPECIAL')) {
    return {
      plan: normalPlan,
      isEspecial: true,
      priceToCharge: amount,
      customPriceReason: 'Tarifa especial importada',
      matchedSpecKey: null
    };
  }

  const matchedKey = matchAllowedPlanKey(rawPlanType);
  if (matchedKey && matchedKey !== 'ESPECIAL') {
    const spec = ALLOWED_PLAN_SPECS[matchedKey]!;
    const existing = findByName(spec.name);
    if (existing) {
      const isCustom = amount > 0 && amount !== existing.price;
      return {
        plan: existing,
        isEspecial: false,
        priceToCharge: amount > 0 ? amount : existing.price,
        customPriceReason: isCustom ? 'Tarifa especial importada' : null,
        matchedSpecKey: matchedKey
      };
    } else {
      const virtualPlan: DbPlan = {
        id: -1,
        name: spec.name,
        type: spec.type,
        price: spec.price,
        durationDays: spec.durationDays,
        description: spec.description,
        maxMembers: spec.maxMembers,
        isActive: true
      };
      const isCustom = amount > 0 && amount !== spec.price;
      return {
        plan: virtualPlan,
        isEspecial: false,
        priceToCharge: amount > 0 ? amount : spec.price,
        customPriceReason: isCustom ? 'Tarifa especial importada' : null,
        matchedSpecKey: matchedKey
      };
    }
  }

  // Default / Normal
  const isCustom = amount > 0 && amount !== normalPlan.price;
  return {
    plan: normalPlan,
    isEspecial: false,
    priceToCharge: amount > 0 ? amount : normalPlan.price,
    customPriceReason: isCustom ? 'Tarifa especial importada' : null,
    matchedSpecKey: null
  };
}

export const previewMemberCsv = async (csvContent: string): Promise<ImportPreviewResponse> => {
  const tokenized = tokenizeCsv(csvContent);
  const parsed = normalizeCsvRows(tokenized);

  const allPlans = await db.select().from(plans);
  const newPlanTypes = new Set<string>();

  const realCedulas = parsed.rows
    .filter(r => !r.isPendingCedula)
    .map(r => r.cedula);

  const existingInDbSet = new Set<string>();
  if (realCedulas.length > 0) {
    const batchSize = 400;
    for (let i = 0; i < realCedulas.length; i += batchSize) {
      const batch = realCedulas.slice(i, i + batchSize);
      const found = await db.select({ cedula: members.cedula }).from(members).where(inArray(members.cedula, batch));
      for (const f of found) {
        existingInDbSet.add(f.cedula);
      }
    }
  }

  const newStatuses = new Set<string>();
  const KNOWN_STATUSES = new Set(['ACTIVO', 'VENCIDO', 'ACTIVE', 'EXPIRED']);

  let alreadyInDbCount = 0;
  let duplicateInFileCount = 0;
  let readyToImportCount = 0;
  let pendingCedulasCount = 0;
  let warningsCount = 0;

  const reportRows: ImportPreviewResponse['reportRows'] = [];

  for (const row of parsed.rows) {
    const resolved = resolveImportPlan(row.planType, row.amount, allPlans, row.lastPaymentDate, row.status);

    if (resolved.plan.id === -1) {
      newPlanTypes.add(resolved.plan.name);
    }

    if (row.status && !KNOWN_STATUSES.has(row.status)) {
      newStatuses.add(row.status);
    }

    if (row.isPendingCedula) {
      pendingCedulasCount++;
    }

    const isDuplicateInFile = !row.isPendingCedula && parsed.duplicateCedulas.includes(row.cedula);
    const isAlreadyInDb = !row.isPendingCedula && existingInDbSet.has(row.cedula);

    const rowWarnings = [...row.warnings];

    if (resolved.isEspecial) {
      if (resolved.matchedSpecKey === 'ESPECIAL') {
        rowWarnings.push('Plan Especial asignado (Trabajador / Acceso $0)');
      } else {
        rowWarnings.push(`Plan Especial asignado a ${resolved.plan.name} ($${resolved.priceToCharge.toLocaleString()})`);
      }
    }

    let rowStatus: 'ready' | 'duplicate_in_file' | 'already_in_db' = 'ready';

    if (isDuplicateInFile) {
      rowStatus = 'duplicate_in_file';
      duplicateInFileCount++;
    } else if (isAlreadyInDb) {
      rowStatus = 'already_in_db';
      rowWarnings.push(`Cédula ${row.cedula} ya registrada en el sistema (Omitida)`);
      alreadyInDbCount++;
    } else {
      readyToImportCount++;
    }

    warningsCount += rowWarnings.length;

    reportRows.push({
      rowRef: row.rowRef,
      fullName: row.fullName,
      cedula: row.cedula,
      status: rowStatus,
      warnings: rowWarnings
    });
  }

  return {
    totalRawRows: parsed.totalRawRows,
    emptyRowsCount: parsed.emptyRowsCount,
    readyToImportCount,
    duplicateInFileCount,
    alreadyInDbCount,
    pendingCedulasCount,
    newPlanTypes: Array.from(newPlanTypes),
    newStatuses: Array.from(newStatuses),
    warningsCount,
    sampleRows: parsed.rows.slice(0, 10),
    reportRows
  };
};

export const executeMemberCsvImport = async (csvContent: string): Promise<ImportExecutionResponse> => {
  const tokenized = tokenizeCsv(csvContent);
  const parsed = normalizeCsvRows(tokenized);

  const allPlans = await db.select().from(plans);
  const newPlansCreated: string[] = [];

  const realCedulas = parsed.rows
    .filter(r => !r.isPendingCedula)
    .map(r => r.cedula);

  const existingInDbSet = new Set<string>();
  if (realCedulas.length > 0) {
    const batchSize = 400;
    for (let i = 0; i < realCedulas.length; i += batchSize) {
      const batch = realCedulas.slice(i, i + batchSize);
      const found = await db.select({ cedula: members.cedula }).from(members).where(inArray(members.cedula, batch));
      for (const f of found) {
        existingInDbSet.add(f.cedula);
      }
    }
  }

  const report: ImportExecutionResponse['report'] = [];

  let importedCount = 0;
  let skippedDuplicateFileCount = 0;
  let skippedAlreadyInDbCount = 0;
  let pendingCedulasCount = 0;

  db.transaction((tx) => {
    for (const row of parsed.rows) {
      const isDuplicateInFile = !row.isPendingCedula && parsed.duplicateCedulas.includes(row.cedula);
      const isAlreadyInDb = !row.isPendingCedula && existingInDbSet.has(row.cedula);
      const rowWarnings = [...row.warnings];

      if (isDuplicateInFile) {
        skippedDuplicateFileCount++;
        report.push({
          rowRef: row.rowRef,
          fullName: row.fullName,
          cedula: row.cedula,
          action: 'skipped_duplicate_file',
          warnings: rowWarnings
        });
        continue;
      }

      if (isAlreadyInDb) {
        skippedAlreadyInDbCount++;
        rowWarnings.push(`Cédula ya registrada en la base de datos (${row.cedula})`);
        report.push({
          rowRef: row.rowRef,
          fullName: row.fullName,
          cedula: row.cedula,
          action: 'skipped_already_in_db',
          warnings: rowWarnings
        });
        continue;
      }

      let resolved = resolveImportPlan(row.planType, row.amount, allPlans, row.lastPaymentDate, row.status);

      // If this row requires one of the allowed plans and it doesn't exist yet, create it on demand!
      if (resolved.matchedSpecKey && resolved.plan.id === -1) {
        const spec = ALLOWED_PLAN_SPECS[resolved.matchedSpecKey]!;
        let existing = allPlans.find(p => p.name.toUpperCase().replace(/\s+/g, '') === spec.name.toUpperCase().replace(/\s+/g, ''));
        if (!existing) {
          const inserted = tx.insert(plans).values({
            name: spec.name,
            type: spec.type,
            price: spec.price,
            durationDays: spec.durationDays,
            description: spec.description,
            maxMembers: spec.maxMembers,
            isActive: true
          }).returning().get();
          if (inserted) {
            allPlans.push(inserted);
            newPlansCreated.push(spec.name);
            existing = inserted;
          }
        }
        resolved.plan = existing || allPlans[0]!;
      }

      if (row.isPendingCedula) {
        pendingCedulasCount++;
      }

      const nowIso = new Date().toISOString();
      const memberCreatedDate = row.registrationDate || row.lastPaymentDate || nowIso;
      const subStartDate = row.lastPaymentDate || row.registrationDate || nowIso;

      let subEndDate = row.expiryDate;
      if (resolved.matchedSpecKey === 'ESPECIAL') {
        subEndDate = '2099-12-31';
      } else if (!subEndDate) {
        const startD = new Date(subStartDate);
        startD.setDate(startD.getDate() + resolved.plan.durationDays);
        subEndDate = startD.toISOString().split('T')[0]!;
      }

      const todayIsoDate = nowIso.split('T')[0]!;
      const isExpired = resolved.matchedSpecKey === 'ESPECIAL'
        ? false
        : (row.status.toUpperCase().includes('VENC') || subEndDate < todayIsoDate);

      // Consolidate medical/additional notes including EPS into notes field
      const notesParts: string[] = [];
      if (row.eps) {
        notesParts.push(`EPS: ${row.eps}`);
      }
      if (row.isPendingCedula) {
        notesParts.push(`[Importado con Cédula Pendiente de la fila ${row.rowRef}]`);
      }
      if (resolved.matchedSpecKey === 'ESPECIAL') {
        notesParts.push('[Personal / Acceso Autorizado]');
      }
      const memberNotes = notesParts.length > 0 ? notesParts.join(' | ') : null;

      // 1. Insert Member
      const insertedMember = tx.insert(members).values({
        cedula: row.cedula,
        firstName: row.firstName,
        lastName: row.lastName,
        birthDate: row.birthDate,
        phone: row.phone,
        bloodType: row.bloodType,
        notes: memberNotes,
        createdAt: memberCreatedDate,
        updatedAt: nowIso
      }).returning({ id: members.id }).get();

      if (!insertedMember) {
        rowWarnings.push('Error al insertar miembro en base de datos');
        continue;
      }

      const memberId = insertedMember.id;

      // 2. Insert Subscription
      const insertedSub = tx.insert(subscriptions).values({
        memberId,
        planId: resolved.plan.id,
        planName: resolved.plan.name,
        planPrice: resolved.priceToCharge,
        customPriceReason: resolved.customPriceReason,
        startDate: subStartDate,
        endDate: subEndDate,
        status: isExpired ? 'expired' : 'active',
        createdAt: subStartDate
      }).returning({ id: subscriptions.id }).get();

      const subscriptionId = insertedSub?.id;

      // 3. Insert Historical Payment (without cash register movement to protect today's ledger)
      if (resolved.priceToCharge >= 0) {
        tx.insert(payments).values({
          memberId,
          subscriptionId: subscriptionId || null,
          amount: resolved.priceToCharge,
          method: 'cash',
          paidAt: subStartDate,
          notes: resolved.matchedSpecKey === 'ESPECIAL' ? 'Importado (Plan Especial Personal / Cortesía)' : (resolved.customPriceReason ? `Importado (${resolved.customPriceReason})` : `Importado desde hoja de cálculo (${row.rowRef})`),
          createdAt: subStartDate
        }).run();
      }

      importedCount++;
      report.push({
        rowRef: row.rowRef,
        fullName: row.fullName,
        cedula: row.cedula,
        action: 'imported',
        warnings: rowWarnings
      });
    }
  });

  return {
    success: true,
    importedCount,
    skippedEmptyCount: parsed.emptyRowsCount,
    skippedDuplicateFileCount,
    skippedAlreadyInDbCount,
    pendingCedulasCount,
    newPlansCreated,
    report
  };
};
