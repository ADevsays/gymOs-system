import { db } from '~~/server/lib/db';
import { cashRegisters, cashMovements, saleItems, products, members, payments } from '~~/drizzle/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';

export interface ProductSaleItemInput {
  productId: number;
  quantity: number;
}

export const getOpenRegisterSession = async () => {
  const openSessions = await db
    .select()
    .from(cashRegisters)
    .where(eq(cashRegisters.status, 'open'))
    .orderBy(desc(cashRegisters.openedAt))
    .limit(1);

  return openSessions[0] || null;
};

export const openRegister = async (openingBalance: number, notes?: string) => {
  const existing = await getOpenRegisterSession();
  if (existing) {
    throw new Error('Ya existe una sesión de caja abierta actualmente.');
  }

  const inserted = await db
    .insert(cashRegisters)
    .values({
      openedAt: new Date().toISOString(),
      openingBalance: Number(openingBalance) || 0,
      status: 'open',
      notes: notes || null,
    })
    .returning();

  return inserted[0];
};

export const closeRegister = async (id: number, countedCash: number, notes?: string) => {
  const session = await db.select().from(cashRegisters).where(eq(cashRegisters.id, id)).limit(1);
  if (!session[0]) {
    throw new Error('Sesión de caja no encontrada');
  }

  // Calculate live cash metrics for this session
  const movements = await db
    .select()
    .from(cashMovements)
    .where(eq(cashMovements.cashRegisterId, id));

  const cashIncome = movements
    .filter((m) => m.type === 'income' && m.paymentMethod === 'cash')
    .reduce((sum, m) => sum + m.amount, 0);

  const cashExpenses = movements
    .filter((m) => m.type === 'expense' && m.paymentMethod === 'cash')
    .reduce((sum, m) => sum + m.amount, 0);

  const transferIncome = movements
    .filter((m) => m.type === 'income' && m.paymentMethod === 'transfer')
    .reduce((sum, m) => sum + m.amount, 0);

  const transferExpenses = movements
    .filter((m) => m.type === 'expense' && m.paymentMethod === 'transfer')
    .reduce((sum, m) => sum + m.amount, 0);

  const expectedCash = (session[0].openingBalance || 0) + cashIncome - cashExpenses;
  const difference = Number(countedCash) - expectedCash;

  const updated = await db
    .update(cashRegisters)
    .set({
      closedAt: new Date().toISOString(),
      closingBalance: Number(countedCash),
      expectedCash,
      difference,
      status: 'closed',
      notes: notes || session[0].notes,
    })
    .where(eq(cashRegisters.id, id))
    .returning();

  return {
    ...updated[0],
    cashIncome,
    cashExpenses,
    transferIncome,
    transferExpenses,
    netTransfer: transferIncome - transferExpenses,
  };
};

export const getRegisterSessionDetails = async () => {
  const openSession = await getOpenRegisterSession();

  // If there's an open session, calculate metrics for that session; otherwise for today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const movements = openSession
    ? await db.select().from(cashMovements).where(eq(cashMovements.cashRegisterId, openSession.id))
    : await db.select().from(cashMovements).where(gte(cashMovements.createdAt, todayStartIso));

  let totalIncome = 0;
  let totalExpenses = 0;
  let membershipIncome = 0;
  let productIncome = 0;
  let sporadicIncome = 0;
  let cashIncome = 0;
  let transferIncome = 0;
  let cashExpenses = 0;
  let transferExpenses = 0;

  for (const m of movements) {
    if (m.type === 'income') {
      totalIncome += m.amount;
      if (m.category === 'membership') membershipIncome += m.amount;
      else if (m.category === 'product') productIncome += m.amount;
      else if (m.category === 'sporadic') sporadicIncome += m.amount;

      if (m.paymentMethod === 'cash') cashIncome += m.amount;
      else if (m.paymentMethod === 'transfer') transferIncome += m.amount;
    } else if (m.type === 'expense') {
      totalExpenses += m.amount;
      if (m.paymentMethod === 'cash') cashExpenses += m.amount;
      else if (m.paymentMethod === 'transfer') transferExpenses += m.amount;
    }
  }

  const openingBalance = openSession ? openSession.openingBalance : 0;
  const expectedCashInDrawer = openingBalance + cashIncome - cashExpenses;
  const netBalance = totalIncome - totalExpenses;
  const netTransfer = transferIncome - transferExpenses;

  return {
    isOpen: !!openSession,
    session: openSession,
    kpis: {
      openingBalance,
      totalIncome,
      totalExpenses,
      netBalance,
      cashIncome,
      cashExpenses,
      expectedCashInDrawer,
      transferIncome,
      transferExpenses,
      netTransfer,
      membershipIncome,
      productIncome,
      sporadicIncome,
    },
  };
};

export const getMovementsByPeriod = async (
  period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily',
  customStartDate?: string,
  customEndDate?: string
) => {
  const now = new Date();
  let startDate = new Date();
  let endIso: string | null = null;

  if (period === 'daily') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    // Current week Monday
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  } else if (period === 'custom') {
    if (customStartDate) {
      const [sy, sm, sd] = customStartDate.split('-').map(Number);
      startDate = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }

    if (customEndDate) {
      const [ey, em, ed] = customEndDate.split('-').map(Number);
      const endDate = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      endIso = endDate.toISOString();
    }
  }

  const startIso = startDate.toISOString();

  const conditions = [gte(cashMovements.createdAt, startIso)];
  if (endIso) {
    conditions.push(lte(cashMovements.createdAt, endIso));
  }

  const movements = await db
    .select()
    .from(cashMovements)
    .where(and(...conditions))
    .orderBy(desc(cashMovements.createdAt));

  // Attach sale items if any movement is a product sale
  const enhancedMovements = await Promise.all(
    movements.map(async (m) => {
      if (m.category === 'product') {
        const items = await db.select().from(saleItems).where(eq(saleItems.cashMovementId, m.id));
        return { ...m, items };
      }
      return { ...m, items: [] };
    })
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  let membershipTotal = 0;
  let productTotal = 0;
  let sporadicTotal = 0;

  for (const m of movements) {
    if (m.type === 'income') {
      totalIncome += m.amount;
      if (m.category === 'membership') membershipTotal += m.amount;
      else if (m.category === 'product') productTotal += m.amount;
      else if (m.category === 'sporadic') sporadicTotal += m.amount;
    } else {
      totalExpenses += m.amount;
    }
  }

  return {
    period,
    startDate: startIso,
    endDate: endIso,
    summary: {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      membershipTotal,
      productTotal,
      sporadicTotal,
    },
    movements: enhancedMovements,
  };
};

export const recordProductSale = async (data: {
  items: ProductSaleItemInput[];
  paymentMethod: string;
  memberId?: number;
  customerName?: string;
  notes?: string;
}) => {
  if (!data.items || data.items.length === 0) {
    throw new Error('Debe agregar al menos un producto a la venta');
  }

  const openSession = await getOpenRegisterSession();

  return db.transaction((tx) => {
    let totalAmount = 0;
    const itemsToInsert: any[] = [];
    const itemNames: string[] = [];

    for (const item of data.items) {
      const prodRes = tx.select().from(products).where(eq(products.id, item.productId)).limit(1).all();
      const prod = prodRes[0];
      if (!prod) throw new Error(`Producto ID ${item.productId} no encontrado`);
      if (prod.stock < item.quantity) {
        throw new Error(`Stock insuficiente para "${prod.name}". Disponible: ${prod.stock}`);
      }

      const unitPrice = prod.price;
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      itemsToInsert.push({
        productId: prod.id,
        productName: prod.name,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      });

      itemNames.push(`${item.quantity}x ${prod.name}`);

      // Deduct stock
      tx.update(products)
        .set({
          stock: prod.stock - item.quantity,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(products.id, prod.id))
        .run();
    }

    // Insert movement
    const movementInsert = tx
      .insert(cashMovements)
      .values({
        cashRegisterId: openSession ? openSession.id : null,
        type: 'income',
        category: 'product',
        concept: `Venta: ${itemNames.join(', ')}`,
        amount: totalAmount,
        paymentMethod: data.paymentMethod || 'cash',
        memberId: data.memberId || null,
        customerName: data.customerName || (data.memberId ? null : 'Cliente General'),
        notes: data.notes || null,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();

    if (!movementInsert) {
      throw new Error('No se pudo registrar el movimiento de venta');
    }

    // Insert sale items
    for (const itm of itemsToInsert) {
      tx.insert(saleItems)
        .values({
          cashMovementId: movementInsert.id,
          productId: itm.productId,
          productName: itm.productName,
          quantity: itm.quantity,
          unitPrice: itm.unitPrice,
          subtotal: itm.subtotal,
        })
        .run();
    }

    return movementInsert;
  });
};

export interface ProductPurchaseItemInput {
  productId: number;
  quantity: number;
  unitPrice?: number;
}

export const recordProductPurchase = async (data: {
  items: ProductPurchaseItemInput[];
  paymentMethod: string;
  customerName?: string;
  notes?: string;
}) => {
  if (!data.items || data.items.length === 0) {
    throw new Error('Debe agregar al menos un producto a la compra');
  }

  const openSession = await getOpenRegisterSession();

  return db.transaction((tx) => {
    let totalAmount = 0;
    const itemsToInsert: any[] = [];
    const itemNames: string[] = [];

    for (const item of data.items) {
      const prodRes = tx.select().from(products).where(eq(products.id, item.productId)).limit(1).all();
      const prod = prodRes[0];
      if (!prod) throw new Error(`Producto ID ${item.productId} no encontrado`);
      if (item.quantity <= 0) {
        throw new Error(`La cantidad debe ser mayor a 0 para "${prod.name}"`);
      }

      const unitPrice = item.unitPrice !== undefined && item.unitPrice >= 0 
        ? item.unitPrice 
        : (prod.cost && prod.cost > 0 ? prod.cost : prod.price);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      itemsToInsert.push({
        productId: prod.id,
        productName: prod.name,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      });

      itemNames.push(`${item.quantity}x ${prod.name}`);

      // Increase stock
      tx.update(products)
        .set({
          stock: prod.stock + item.quantity,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(products.id, prod.id))
        .run();
    }

    // Insert expense movement
    const movementInsert = tx
      .insert(cashMovements)
      .values({
        cashRegisterId: openSession ? openSession.id : null,
        type: 'expense',
        category: 'product',
        concept: `Compra inventario: ${itemNames.join(', ')}`,
        amount: totalAmount,
        paymentMethod: data.paymentMethod || 'cash',
        customerName: data.customerName || 'Proveedor',
        notes: data.notes || null,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();

    if (!movementInsert) {
      throw new Error('No se pudo registrar el movimiento de compra');
    }

    // Insert purchase items linked to movement
    for (const itm of itemsToInsert) {
      tx.insert(saleItems)
        .values({
          cashMovementId: movementInsert.id,
          productId: itm.productId,
          productName: itm.productName,
          quantity: itm.quantity,
          unitPrice: itm.unitPrice,
          subtotal: itm.subtotal,
        })
        .run();
    }

    return movementInsert;
  });
};

export const recordSporadicIncome = async (data: {
  concept: string;
  amount: number;
  paymentMethod: string;
  customerName?: string;
  notes?: string;
}) => {
  const openSession = await getOpenRegisterSession();

  const inserted = await db
    .insert(cashMovements)
    .values({
      cashRegisterId: openSession ? openSession.id : null,
      type: 'income',
      category: 'sporadic',
      concept: data.concept,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod || 'cash',
      customerName: data.customerName || 'Cliente Ocasional',
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
    })
    .returning();

  return inserted[0];
};

export const recordExpense = async (data: {
  concept: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
}) => {
  const openSession = await getOpenRegisterSession();

  const inserted = await db
    .insert(cashMovements)
    .values({
      cashRegisterId: openSession ? openSession.id : null,
      type: 'expense',
      category: 'expense',
      concept: data.concept,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod || 'cash',
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
    })
    .returning();

  return inserted[0];
};

export const getCashHistory = async () => {
  return await db
    .select()
    .from(cashRegisters)
    .where(eq(cashRegisters.status, 'closed'))
    .orderBy(desc(cashRegisters.openedAt));
};

export const deleteCashMovement = async (id: number) => {
  const movementRes = await db
    .select()
    .from(cashMovements)
    .where(eq(cashMovements.id, id))
    .limit(1);

  const movement = movementRes[0];
  if (!movement) {
    throw new Error('Movimiento no encontrado');
  }

  if (movement.paymentId) {
    throw new Error('Los pagos de membresía deben anularse o gestionarse desde el módulo de Socios.');
  }

  return db.transaction((tx) => {
    // If it is a product movement (sale or purchase), revert inventory stock
    if (movement.category === 'product') {
      const items = tx
        .select()
        .from(saleItems)
        .where(eq(saleItems.cashMovementId, id))
        .all();

      for (const item of items) {
        if (movement.type === 'income') {
          // Sale reversal: add stock back (+)
          tx.update(products)
            .set({
              stock: sql`${products.stock} + ${item.quantity}`,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(products.id, item.productId))
            .run();
        } else if (movement.type === 'expense') {
          // Purchase reversal: deduct stock back (-)
          tx.update(products)
            .set({
              stock: sql`${products.stock} - ${item.quantity}`,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(products.id, item.productId))
            .run();
        }
      }

      tx.delete(saleItems)
        .where(eq(saleItems.cashMovementId, id))
        .run();
    }

    tx.delete(cashMovements)
      .where(eq(cashMovements.id, id))
      .run();

    return { id, success: true };
  });
};

export const updateCashMovement = async (
  id: number,
  data: {
    concept?: string;
    amount?: number;
    paymentMethod?: string;
    customerName?: string;
    notes?: string;
  }
) => {
  const movementRes = await db
    .select()
    .from(cashMovements)
    .where(eq(cashMovements.id, id))
    .limit(1);

  const movement = movementRes[0];
  if (!movement) {
    throw new Error('Movimiento no encontrado');
  }

  if (movement.paymentId) {
    throw new Error('Los pagos de membresía deben gestionarse desde el módulo de Socios.');
  }

  const updates: Record<string, any> = {};

  if (movement.category !== 'product') {
    if (data.concept !== undefined && data.concept.trim()) {
      updates.concept = data.concept.trim();
    }
    if (data.amount !== undefined && Number(data.amount) > 0) {
      updates.amount = Number(data.amount);
    }
  }

  if (data.paymentMethod && (data.paymentMethod === 'cash' || data.paymentMethod === 'transfer')) {
    updates.paymentMethod = data.paymentMethod;
  }

  if (data.customerName !== undefined) {
    updates.customerName = data.customerName ? data.customerName.trim() : null;
  }

  if (data.notes !== undefined) {
    updates.notes = data.notes ? data.notes.trim() : null;
  }

  if (Object.keys(updates).length === 0) {
    return movement;
  }

  const updated = await db
    .update(cashMovements)
    .set(updates)
    .where(eq(cashMovements.id, id))
    .returning();

  return updated[0];
};
