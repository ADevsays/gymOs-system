import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const plans = sqliteTable('plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull().default('standard'), // 'standard', 'group', 'promo'
  price: real('price').notNull(),
  durationDays: integer('duration_days').notNull(),
  description: text('description'),
  maxMembers: integer('max_members').notNull().default(1),
  validUntil: text('valid_until'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const members = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cedula: text('cedula').unique().notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  birthDate: text('birth_date'),
  gender: text('gender'),                   // 'M' | 'F'
  bloodType: text('blood_type'),
  issueDate: text('issue_date'),
  issueCity: text('issue_city'),
  phone: text('phone'),
  eps: text('eps'),
  email: text('email'),
  photoPath: text('photo_path'),
  cedulaFrontPath: text('cedula_front_path'),
  notes: text('notes'),
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').notNull().references(() => members.id),
  payerId: integer('payer_id').references(() => members.id), // Beneficiary payer
  planId: integer('plan_id').notNull().references(() => plans.id),
  planName: text('plan_name').notNull(),
  planPrice: real('plan_price').notNull(),  // Snapshot del precio al crear (RN-06)
  customPriceReason: text('custom_price_reason'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').notNull().references(() => members.id),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id),
  amount: real('amount').notNull(),         // Negativo = ajuste/devolución
  method: text('method').notNull().default('cash'),
  paidAt: text('paid_at').notNull(),
  notes: text('notes'),
  receiptPath: text('receipt_path'),
  transferReference: text('transfer_reference'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const gymConfig = sqliteTable('gym_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  // Claves: gym_name, gym_logo, expiry_warning_days, churn_threshold_days,
  //         backup_path, pin_hash
});

export const productCategories = sqliteTable('product_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  color: text('color'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  categoryId: integer('category_id').references(() => productCategories.id),
  category: text('category').notNull().default('bebidas'), // 'bebidas' | 'proteinas' | 'snacks' | 'suplementos' | 'accesorios' | 'otros'
  price: real('price').notNull(),
  cost: real('cost').default(0),
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').default(5),
  photoPath: text('photo_path'),
  barcode: text('barcode'),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const cashRegisters = sqliteTable('cash_registers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  openedAt: text('opened_at').notNull(),
  closedAt: text('closed_at'),
  openingBalance: real('opening_balance').notNull().default(0),
  closingBalance: real('closing_balance'),
  expectedCash: real('expected_cash'),
  difference: real('difference'),
  status: text('status').notNull().default('open'), // 'open' | 'closed'
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const cashMovements = sqliteTable('cash_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cashRegisterId: integer('cash_register_id').references(() => cashRegisters.id),
  type: text('type').notNull(), // 'income' | 'expense'
  category: text('category').notNull(), // 'membership' | 'product' | 'sporadic' | 'expense'
  concept: text('concept').notNull(),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method').notNull().default('cash'), // 'cash' | 'transfer' | 'card'
  memberId: integer('member_id').references(() => members.id),
  customerName: text('customer_name'),
  paymentId: integer('payment_id').references(() => payments.id),
  receiptPath: text('receipt_path'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cashMovementId: integer('cash_movement_id').notNull().references(() => cashMovements.id),
  productId: integer('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  subtotal: real('subtotal').notNull(),
});

export const attendance = sqliteTable('attendance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').references(() => members.id),
  date: text('date').notNull().default(sql`(date('now'))`),
  checkInAt: text('check_in_at').default(sql`(datetime('now'))`),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});


