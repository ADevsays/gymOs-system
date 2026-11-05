import { db } from '~~/server/lib/db';
import { members, subscriptions, payments, cashMovements, cashRegisters, plans } from '~~/drizzle/schema';
import { eq, like, or, desc, sql, and, inArray, ne } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { calendarDaysBetween, parseCalendarDate, startOfCalendarDay } from '~/utils/calendarDate';

export interface PaginatedMembersResult {
  members: any[];
  total: number;
  hasMore: boolean;
}

export const getMembersList = async (
  searchQuery?: string,
  limit?: number,
  offset?: number
): Promise<PaginatedMembersResult> => {
  const term = searchQuery ? `%${searchQuery}%` : null;

  const whereClause = and(
    eq(members.isArchived, false),
    term ? or(
      like(members.firstName, term),
      like(members.lastName, term),
      like(members.cedula, term)
    ) : undefined
  );

  const totalRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(members)
    .where(whereClause);
  const total = totalRes[0]?.count || 0;

  let query = db
    .select()
    .from(members)
    .where(whereClause)
    .orderBy(desc(members.createdAt));

  if (limit !== undefined && limit > 0) {
    query = (query as any).limit(limit);
    if (offset !== undefined && offset > 0) {
      query = (query as any).offset(offset);
    }
  }

  const results = await query;
  const memberIds = results.map(m => m.id);

  const activeSubMap = new Map<number, any>();
  if (memberIds.length > 0) {
    const activeSubs = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          inArray(subscriptions.memberId, memberIds),
          eq(subscriptions.status, 'active')
        )
      )
      .orderBy(desc(subscriptions.endDate));

    for (const sub of activeSubs) {
      if (!activeSubMap.has(sub.memberId)) {
        activeSubMap.set(sub.memberId, sub);
      }
    }
  }

  const enhancedResults = results.map((m) => ({
    ...m,
    activeSubscription: activeSubMap.get(m.id) || null
  }));

  const currentOffset = offset || 0;
  const hasMore = limit !== undefined && limit > 0 ? (currentOffset + results.length) < total : false;

  return {
    members: enhancedResults,
    total,
    hasMore
  };
};

export const getUpcomingExpiringMembers = async (limit = 10) => {
  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      photoPath: members.photoPath,
      cedula: members.cedula,
      createdAt: members.createdAt,
      subId: subscriptions.id,
      subPlanName: subscriptions.planName,
      subPlanPrice: subscriptions.planPrice,
      subStartDate: subscriptions.startDate,
      subEndDate: subscriptions.endDate,
      subStatus: subscriptions.status,
    })
    .from(subscriptions)
    .innerJoin(members, eq(subscriptions.memberId, members.id))
    .where(
      and(
        eq(members.isArchived, false),
        eq(subscriptions.status, 'active'),
        sql`lower(${subscriptions.planName}) NOT LIKE '%especial%'`
      )
    )
    .orderBy(subscriptions.endDate)
    .limit(limit);

  return rows.map(r => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    photoPath: r.photoPath,
    cedula: r.cedula,
    createdAt: r.createdAt,
    activeSubscription: {
      id: r.subId,
      memberId: r.id,
      planName: r.subPlanName,
      planPrice: r.subPlanPrice,
      startDate: r.subStartDate,
      endDate: r.subEndDate,
      status: r.subStatus,
    }
  }));
};

export const getUpcomingBirthdayMembers = async (limit = 10) => {
  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      photoPath: members.photoPath,
      cedula: members.cedula,
      birthDate: members.birthDate,
    })
    .from(members)
    .where(and(eq(members.isArchived, false), sql`${members.birthDate} IS NOT NULL`, sql`${members.birthDate} != ''`));

  const today = startOfCalendarDay();

  return rows
    .map((member) => {
      if (!member.birthDate) return null;

      const birthDate = parseCalendarDate(member.birthDate);
      let birthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

      // En años no bisiestos, el cumpleaños del 29 de febrero se celebra el 28.
      if (birthDate.getMonth() === 1 && birthDate.getDate() === 29 && birthday.getMonth() !== 1) {
        birthday = new Date(today.getFullYear(), 1, 28);
      }

      if (birthday < today) {
        birthday = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
      }

      const daysUntil = calendarDaysBetween(birthday, today);
      return { ...member, daysUntil, birthdayDate: birthday.toISOString().slice(0, 10) };
    })
    .filter((member): member is NonNullable<typeof member> => Boolean(member && member.daysUntil <= 7))
    .sort((a, b) => a.daysUntil - b.daysUntil || a.firstName.localeCompare(b.firstName, 'es'))
    .slice(0, limit);
};

export const getMemberDetail = async (id: number) => {
  const member = await db.select().from(members).where(eq(members.id, id)).limit(1);
  const m = member[0];
  if (!m) return null;

  const subs = await db.select().from(subscriptions).where(eq(subscriptions.memberId, id)).orderBy(desc(subscriptions.endDate));
  const memberPayments = await db.select().from(payments).where(eq(payments.memberId, id)).orderBy(desc(payments.paidAt));

  const ltvRes = await db.select({ total: sql<number>`SUM(${payments.amount})` }).from(payments).where(eq(payments.memberId, id));
  const ltv = ltvRes[0]?.total || 0;

  // Buscar si tiene beneficiarios a cargo
  const beneficiariesSubs = await db.select().from(subscriptions).where(eq(subscriptions.payerId, id));
  const beneficiaries = [];
  for (const sub of beneficiariesSubs) {
    const bMember = await db.select().from(members).where(eq(members.id, sub.memberId)).limit(1);
    if (bMember[0]) {
      beneficiaries.push({ ...bMember[0], subscription: sub });
    }
  }

  // Buscar si alguien más pagó su plan actual (Payer)
  let payer = null;
  const activeSub = subs.find(s => s.status === 'active' || new Date(s.endDate) >= new Date());
  if (activeSub && activeSub.payerId) {
    const pMember = await db.select().from(members).where(eq(members.id, activeSub.payerId)).limit(1);
    payer = pMember[0] || null;
  }

  return {
    ...m,
    subscriptions: subs,
    payments: memberPayments,
    beneficiaries,
    payer,
    ltv
  };
};

export const archiveMember = async (id: number) => {
  await db.update(members).set({ isArchived: true }).where(eq(members.id, id));
  return true;
};

export const getMemberByCedula = async (cedula: string) => {
  const existing = await db.select({ id: members.id }).from(members).where(eq(members.cedula, cedula)).limit(1);
  return existing[0]?.id ?? null;
};

export const updateMember = async (id: number, data: any) => {
  const currentMember = await db.select().from(members).where(eq(members.id, id)).limit(1);
  if (!currentMember[0]) throw new Error('Miembro no encontrado');

  const updatePayload: Record<string, any> = { ...data };

  // Immutability rule: Only allow changing cedula once if current is a temporary PENDIENTE ID
  if (updatePayload.cedula) {
    const cleanCedula = String(updatePayload.cedula).replace(/\D/g, '');
    const isCurrentlyPending = currentMember[0].cedula.startsWith('PENDIENTE');

    if (isCurrentlyPending && cleanCedula.length >= 6 && cleanCedula.length <= 10) {
      const existing = await db.select({ id: members.id }).from(members).where(eq(members.cedula, cleanCedula)).limit(1);
      if (existing[0] && existing[0].id !== id) {
        throw new Error('La cédula ingresada ya pertenece a otro socio registrado');
      }
      updatePayload.cedula = cleanCedula;
    } else {
      delete updatePayload.cedula;
    }
  }

  if (updatePayload.phone) {
    updatePayload.phone = String(updatePayload.phone).replace(/\D/g, '');
  }

  if (updatePayload.eps !== undefined) {
    updatePayload.eps = updatePayload.eps ? String(updatePayload.eps).trim() : null;
  }

  await db.update(members)
    .set({
      ...updatePayload,
      updatedAt: new Date().toISOString()
    })
    .where(eq(members.id, id));
  return true;
};

export const createMemberWithSubscription = async (memberData: any, plan: any) => {
  return db.transaction((tx) => {
    // 1. Crear el Pagador Principal
    const memberInsert = tx.insert(members).values({
      cedula: memberData.cedula,
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      birthDate: memberData.birthDate || null,
      gender: memberData.gender || null,
      bloodType: memberData.bloodType || null,
      phone: memberData.phone || null,
      eps: memberData.eps || null,
      notes: memberData.notes || null
    }).returning({ id: members.id }).get();
    
    if (!memberInsert) {
      throw new Error('No se pudo crear el miembro principal');
    }
    const memberId = memberInsert.id;

    const now = new Date();
    let startDate = new Date();
    if (memberData.startDate && typeof memberData.startDate === 'string') {
      const [y, m, d] = memberData.startDate.split('-').map(Number);
      if (y && m && d) {
        startDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
      }
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const priceToCharge = memberData.customPrice !== undefined && memberData.customPrice !== null 
                          ? memberData.customPrice 
                          : plan.price;

    // 2. Crear Suscripción del Pagador
    const subInsert = tx.insert(subscriptions).values({
      memberId: memberId,
      planId: plan.id,
      planName: plan.name,
      planPrice: priceToCharge,
      customPriceReason: memberData.customPriceReason || null,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active'
    }).returning({ id: subscriptions.id }).get();
    
    if (!subInsert) {
      throw new Error('No se pudo crear la suscripción principal');
    }
    const subscriptionId = subInsert.id;

    // Process transfer receipt if provided
    let savedReceiptPath: string | null = null;
    if (memberData.transferReceipt && typeof memberData.transferReceipt === 'string') {
      try {
        const base64Data = memberData.transferReceipt.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const uploadsBase = process.env.GYMOS_DATA_PATH
          ? path.join(process.env.GYMOS_DATA_PATH, 'uploads')
          : path.join(process.cwd(), 'public', 'uploads');
        const receiptsDir = path.join(uploadsBase, 'receipts');

        if (!fs.existsSync(receiptsDir)) {
          fs.mkdirSync(receiptsDir, { recursive: true });
        }

        const hash = crypto.randomBytes(4).toString('hex');
        const fileName = `receipt_${Date.now()}_${hash}.jpg`;
        const filePath = path.join(receiptsDir, fileName);
        fs.writeFileSync(filePath, buffer);
        savedReceiptPath = `/uploads/receipts/${fileName}`;
      } catch (err) {
        console.error('Error saving transfer receipt image:', err);
      }
    }

    // 3. Registrar Pago
    const paymentInsert = tx.insert(payments).values({
      memberId: memberId,
      subscriptionId: subscriptionId,
      amount: priceToCharge,
      method: memberData.paymentMethod || 'cash',
      paidAt: startDate.toISOString(),
      receiptPath: savedReceiptPath,
      transferReference: memberData.transferReference || null
    }).returning({ id: payments.id }).get();

    const paymentId = paymentInsert?.id;

    // Link into cash_movements if session open or today's movement
    const openSession = tx.select().from(cashRegisters).where(eq(cashRegisters.status, 'open')).limit(1).get();

    tx.insert(cashMovements).values({
      cashRegisterId: openSession ? openSession.id : null,
      type: 'income',
      category: 'membership',
      concept: `Membresía ${plan.name} - ${memberData.firstName} ${memberData.lastName}`,
      amount: priceToCharge,
      paymentMethod: memberData.paymentMethod || 'cash',
      memberId: memberId,
      paymentId: paymentId || null,
      receiptPath: savedReceiptPath,
      notes: memberData.transferReference ? `Ref: ${memberData.transferReference}` : null,
      createdAt: startDate.toISOString(),
    }).run();

    // 4. Manejar Beneficiarios (si los hay)
    if (memberData.beneficiaries && Array.isArray(memberData.beneficiaries)) {
      for (const ben of memberData.beneficiaries) {
        let benId = ben.id; // Si ya existía
        
        // Quick Create si no existía pero nos mandaron datos básicos
        if (!benId && ben.cedula && ben.firstName && ben.lastName) {
          const benInsert = tx.insert(members).values({
            cedula: ben.cedula,
            firstName: ben.firstName,
            lastName: ben.lastName,
          }).returning({ id: members.id }).get();
          benId = benInsert?.id;
        }

        // Crear Suscripción Beneficiaria (Vinculada)
        if (benId) {
          tx.insert(subscriptions).values({
            memberId: benId,
            payerId: memberId, // Vinculación
            planId: plan.id,
            planName: plan.name,
            planPrice: 0, // El pagador principal cubrió el costo total
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            status: 'active'
          }).run();
        }
      }
    }

    return memberId;
  });
};

export interface RenewMemberPayload {
  planId: number;
  paymentMethod: 'cash' | 'transfer';
  startDate?: string;
  customPrice?: number;
  customPriceReason?: string;
  transferReference?: string;
  transferReceipt?: string;
}

export const renewMemberSubscription = async (memberId: number, payload: RenewMemberPayload) => {
  return db.transaction((tx) => {
    // 1. Verify member
    const memberRes = tx.select().from(members).where(eq(members.id, memberId)).limit(1).get();
    if (!memberRes) {
      throw new Error('Socio no encontrado');
    }

    // 2. Fetch plan
    const planRes = tx.select().from(plans).where(eq(plans.id, payload.planId)).limit(1).get();
    if (!planRes) {
      throw new Error('Plan no encontrado');
    }

    // 3. Find current active subscription
    const currentSubs = tx.select().from(subscriptions)
      .where(and(eq(subscriptions.memberId, memberId), eq(subscriptions.status, 'active')))
      .orderBy(desc(subscriptions.endDate))
      .all();

    const now = new Date();
    let startDate = new Date();

    if (payload.startDate && typeof payload.startDate === 'string') {
      const [y, m, d] = payload.startDate.split('-').map(Number);
      if (y && m && d) {
        startDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
      }
    } else if (currentSubs.length > 0) {
      const activeSub = currentSubs[0];
      const activeEndDate = new Date(activeSub.endDate);
      if (activeEndDate > now) {
        startDate = activeEndDate;
      }
    }

    // Mark previous subscriptions as completed
    if (currentSubs.length > 0) {
      for (const sub of currentSubs) {
        tx.update(subscriptions).set({ status: 'completed' }).where(eq(subscriptions.id, sub.id)).run();
      }
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + planRes.durationDays);

    const priceToCharge = payload.customPrice !== undefined && payload.customPrice !== null
      ? payload.customPrice
      : planRes.price;

    // 4. Save transfer receipt if uploaded
    let savedReceiptPath: string | null = null;
    if (payload.transferReceipt && typeof payload.transferReceipt === 'string') {
      try {
        const base64Data = payload.transferReceipt.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const publicDir = path.join(process.cwd(), 'public');
        const receiptsDir = path.join(publicDir, 'uploads', 'receipts');

        if (!fs.existsSync(receiptsDir)) {
          fs.mkdirSync(receiptsDir, { recursive: true });
        }

        const hash = crypto.randomBytes(4).toString('hex');
        const fileName = `receipt_${Date.now()}_${hash}.jpg`;
        const filePath = path.join(receiptsDir, fileName);
        fs.writeFileSync(filePath, buffer);
        savedReceiptPath = `/uploads/receipts/${fileName}`;
      } catch (err) {
        console.error('Error saving transfer receipt image:', err);
      }
    }

    // 5. Insert new subscription
    const newSub = tx.insert(subscriptions).values({
      memberId: memberId,
      planId: planRes.id,
      planName: planRes.name,
      planPrice: priceToCharge,
      customPriceReason: payload.customPriceReason || null,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active',
    }).returning({ id: subscriptions.id }).get();

    if (!newSub) {
      throw new Error('No se pudo generar la nueva suscripción');
    }

    // 6. Insert payment
    const newPayment = tx.insert(payments).values({
      memberId: memberId,
      subscriptionId: newSub.id,
      amount: priceToCharge,
      method: payload.paymentMethod || 'cash',
      paidAt: startDate.toISOString(),
      receiptPath: savedReceiptPath,
      transferReference: payload.transferReference || null,
    }).returning({ id: payments.id }).get();

    // 7. Record cash movement
    const openSession = tx.select().from(cashRegisters).where(eq(cashRegisters.status, 'open')).limit(1).get();

    tx.insert(cashMovements).values({
      cashRegisterId: openSession ? openSession.id : null,
      type: 'income',
      category: 'membership',
      concept: `Renovación ${planRes.name} - ${memberRes.firstName} ${memberRes.lastName}`,
      amount: priceToCharge,
      paymentMethod: payload.paymentMethod || 'cash',
      memberId: memberId,
      paymentId: newPayment?.id || null,
      receiptPath: savedReceiptPath,
      notes: payload.transferReference ? `Ref: ${payload.transferReference}` : null,
      createdAt: startDate.toISOString(),
    }).run();

    return {
      success: true,
      subscriptionId: newSub.id,
      paymentId: newPayment?.id,
    };
  });
};

export interface RefundMemberPayload {
  amount: number;
  paymentMethod: 'cash' | 'transfer';
  reason?: string;
}

export const refundMemberSubscription = async (memberId: number, payload: RefundMemberPayload) => {
  return db.transaction((tx) => {
    const memberRes = tx.select().from(members).where(eq(members.id, memberId)).limit(1).get();
    if (!memberRes) {
      throw new Error('Socio no encontrado');
    }

    const activeSubs = tx.select().from(subscriptions)
      .where(and(eq(subscriptions.memberId, memberId), eq(subscriptions.status, 'active')))
      .orderBy(desc(subscriptions.endDate))
      .all();

    if (activeSubs.length === 0) {
      throw new Error('El socio no tiene una suscripción activa para cancelar');
    }

    const currentSub = activeSubs[0];

    for (const sub of activeSubs) {
      tx.update(subscriptions)
        .set({ status: 'cancelled' })
        .where(eq(subscriptions.id, sub.id))
        .run();
    }

    const refundAmount = Number(payload.amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      throw new Error('El monto a reembolsar debe ser mayor a 0');
    }

    const now = new Date();
    const openSession = tx.select().from(cashRegisters).where(eq(cashRegisters.status, 'open')).limit(1).get();

    tx.insert(cashMovements).values({
      cashRegisterId: openSession ? openSession.id : null,
      type: 'expense',
      category: 'membership',
      concept: `Reembolso Membresía ${currentSub.planName || ''} - ${memberRes.firstName} ${memberRes.lastName}`,
      amount: refundAmount,
      paymentMethod: payload.paymentMethod || 'cash',
      memberId: memberId,
      notes: payload.reason ? `Motivo: ${payload.reason}` : null,
      createdAt: now.toISOString(),
    }).run();

    return {
      success: true,
      refundedAmount: refundAmount,
      subscriptionId: currentSub.id,
    };
  });
};
