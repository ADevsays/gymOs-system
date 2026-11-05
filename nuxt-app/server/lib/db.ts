import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../../drizzle/schema';
import { resolve } from 'path';
import { getDataPath } from '../utils/paths';

const dbPath = process.env.DB_PATH || resolve(getDataPath(), 'sqlite.db');

const sqlite = new Database(dbPath);

// Auto-migrate tables if they do not exist
try {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'standard',
      price REAL NOT NULL,
      duration_days INTEGER NOT NULL,
      description TEXT,
      max_members INTEGER NOT NULL DEFAULT 1,
      valid_until TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      birth_date TEXT,
      gender TEXT,
      blood_type TEXT,
      issue_date TEXT,
      issue_city TEXT,
      phone TEXT,
      eps TEXT,
      email TEXT,
      photo_path TEXT,
      cedula_front_path TEXT,
      notes TEXT,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES members(id),
      payer_id INTEGER REFERENCES members(id),
      plan_id INTEGER NOT NULL REFERENCES plans(id),
      plan_name TEXT NOT NULL,
      plan_price REAL NOT NULL,
      custom_price_reason TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES members(id),
      subscription_id INTEGER REFERENCES subscriptions(id),
      amount REAL NOT NULL,
      method TEXT NOT NULL DEFAULT 'cash',
      paid_at TEXT NOT NULL,
      notes TEXT,
      receipt_path TEXT,
      transfer_reference TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gym_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const tableInfo = sqlite.prepare("PRAGMA table_info(payments)").all() as Array<{ name: string }>;
  const columnNames = new Set(tableInfo.map((c) => c.name));
  
  if (!columnNames.has('receipt_path')) {
    sqlite.prepare("ALTER TABLE payments ADD COLUMN receipt_path TEXT").run();
  }
  if (!columnNames.has('transfer_reference')) {
    sqlite.prepare("ALTER TABLE payments ADD COLUMN transfer_reference TEXT").run();
  }

  const memberTableInfo = sqlite.prepare("PRAGMA table_info(members)").all() as Array<{ name: string }>;
  const memberColumnNames = new Set(memberTableInfo.map((c) => c.name));
  if (!memberColumnNames.has('phone')) {
    sqlite.prepare("ALTER TABLE members ADD COLUMN phone TEXT").run();
  }
  if (!memberColumnNames.has('eps')) {
    sqlite.prepare("ALTER TABLE members ADD COLUMN eps TEXT").run();
  }

  // Cleanup legacy dummy seed members if present (without touching plans or real data)
  const dummyCedulas = ['1111111111', '2222222222', '3333333333', '4444444444'];
  const dummyMembers = sqlite.prepare(
    `SELECT id FROM members WHERE cedula IN (${dummyCedulas.map(() => '?').join(',')})`
  ).all(...dummyCedulas) as Array<{ id: number }>;

  if (dummyMembers.length > 0) {
    const dummyIds = dummyMembers.map(m => m.id);
    const placeholders = dummyIds.map(() => '?').join(',');
    sqlite.prepare(`DELETE FROM payments WHERE member_id IN (${placeholders})`).run(...dummyIds);
    sqlite.prepare(`DELETE FROM subscriptions WHERE member_id IN (${placeholders}) OR payer_id IN (${placeholders})`).run(...dummyIds, ...dummyIds);
    sqlite.prepare(`DELETE FROM members WHERE id IN (${placeholders})`).run(...dummyIds);
    console.log(`[DB] Cleaned ${dummyMembers.length} legacy dummy seed members.`);
  }

  // Cleanup any prematurely seeded plans without subscriptions
  sqlite.prepare(`
    DELETE FROM plans 
    WHERE name IN ('Estudiante', 'Quincena', 'Pareja', 'Promo 2x1', 'Tiquetera', 'Especial')
      AND id NOT IN (SELECT DISTINCT plan_id FROM subscriptions)
  `).run();

  // Create product_categories table (Normalized categories)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      color TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default categories if empty
  const catCount = sqlite.prepare("SELECT COUNT(*) as count FROM product_categories").get() as { count: number };
  if (catCount.count === 0) {
    const defaultCategories = [
      { name: 'Bebidas', slug: 'bebidas' },
      { name: 'Proteínas', slug: 'proteinas' },
      { name: 'Snacks', slug: 'snacks' },
      { name: 'Suplementos', slug: 'suplementos' },
      { name: 'Accesorios', slug: 'accesorios' },
      { name: 'Otros', slug: 'otros' }
    ];
    const insertCat = sqlite.prepare("INSERT INTO product_categories (name, slug) VALUES (?, ?)");
    for (const cat of defaultCategories) {
      insertCat.run(cat.name, cat.slug);
    }
  }

  // Create products table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES product_categories(id),
      category TEXT NOT NULL DEFAULT 'bebidas',
      price REAL NOT NULL,
      cost REAL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      photo_path TEXT,
      barcode TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Check and add category_id column to products if missing
  const productColumns = sqlite.prepare("PRAGMA table_info(products)").all() as Array<{ name: string }>;
  const prodColNames = new Set(productColumns.map((c) => c.name));
  if (!prodColNames.has('category_id')) {
    sqlite.prepare("ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES product_categories(id)").run();
  }

  // Backfill category_id for existing products based on slug
  sqlite.prepare(`
    UPDATE products 
    SET category_id = (SELECT id FROM product_categories WHERE slug = products.category) 
    WHERE category_id IS NULL
  `).run();

  // Create cash_registers table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS cash_registers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      opening_balance REAL NOT NULL DEFAULT 0,
      closing_balance REAL,
      expected_cash REAL,
      difference REAL,
      status TEXT NOT NULL DEFAULT 'open',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Create cash_movements table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS cash_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cash_register_id INTEGER REFERENCES cash_registers(id),
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      concept TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      member_id INTEGER REFERENCES members(id),
      customer_name TEXT,
      payment_id INTEGER REFERENCES payments(id),
      receipt_path TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Create sale_items table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cash_movement_id INTEGER NOT NULL REFERENCES cash_movements(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL
    );
  `);

  // Create attendance table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER REFERENCES members(id),
      date TEXT NOT NULL DEFAULT (date('now')),
      check_in_at TEXT DEFAULT (datetime('now')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
  `);
} catch (e) {
  console.error('Error verifying database tables schema:', e);
}

export const db = drizzle(sqlite, { schema });
export { sqlite };
