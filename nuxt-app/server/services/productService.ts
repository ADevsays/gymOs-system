import { db } from '~~/server/lib/db';
import { products, productCategories } from '~~/drizzle/schema';
import { eq, and, like, or, lte, desc, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ProductFilters {
  category?: string;
  search?: string;
  lowStockOnly?: boolean;
  activeOnly?: boolean;
}

const saveProductImage = (base64String: string): string | null => {
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadsBase = process.env.GYMOS_DATA_PATH
      ? path.join(process.env.GYMOS_DATA_PATH, 'uploads')
      : path.join(process.cwd(), 'public', 'uploads');
    const productsDir = path.join(uploadsBase, 'products');

    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
    }

    const hash = crypto.randomBytes(4).toString('hex');
    const fileName = `prod_${Date.now()}_${hash}.jpg`;
    const filePath = path.join(productsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/products/${fileName}`;
  } catch (err) {
    console.error('Error saving product image:', err);
    return null;
  }
};

export const getProducts = async (filters: ProductFilters = {}) => {
  const conditions: any[] = [];

  if (filters.activeOnly !== false) {
    conditions.push(eq(products.isActive, true));
  }

  if (filters.category && filters.category !== 'all') {
    conditions.push(
      or(
        eq(products.category, filters.category),
        eq(productCategories.slug, filters.category)
      )
    );
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(like(products.name, term), like(products.barcode, term)));
  }

  if (filters.lowStockOnly) {
    conditions.push(lte(products.stock, products.minStock));
  }

  const query = db
    .select({
      id: products.id,
      name: products.name,
      categoryId: products.categoryId,
      category: products.category,
      categoryName: productCategories.name,
      price: products.price,
      cost: products.cost,
      stock: products.stock,
      minStock: products.minStock,
      photoPath: products.photoPath,
      barcode: products.barcode,
      description: products.description,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(products.createdAt));

  const items = await query;
  return items.map((p) => ({
    ...p,
    categoryName: p.categoryName || p.category,
  }));
};

export const getProductById = async (id: number) => {
  const result = await db
    .select({
      id: products.id,
      name: products.name,
      categoryId: products.categoryId,
      category: products.category,
      categoryName: productCategories.name,
      price: products.price,
      cost: products.cost,
      stock: products.stock,
      minStock: products.minStock,
      photoPath: products.photoPath,
      barcode: products.barcode,
      description: products.description,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(eq(products.id, id))
    .limit(1);

  if (!result[0]) return null;
  return {
    ...result[0],
    categoryName: result[0].categoryName || result[0].category,
  };
};

export const createProduct = async (data: any) => {
  let photoPath = data.photoPath || null;
  if (data.photoBase64 && typeof data.photoBase64 === 'string') {
    const saved = saveProductImage(data.photoBase64);
    if (saved) photoPath = saved;
  }

  // Resolve category and categoryId
  let categoryId = data.categoryId ? Number(data.categoryId) : null;
  let categorySlug = data.category || 'bebidas';

  if (categoryId) {
    const cat = await db.select().from(productCategories).where(eq(productCategories.id, categoryId)).limit(1);
    if (cat[0]) categorySlug = cat[0].slug;
  } else if (categorySlug) {
    const cat = await db.select().from(productCategories).where(eq(productCategories.slug, categorySlug)).limit(1);
    if (cat[0]) categoryId = cat[0].id;
  }

  const inserted = await db
    .insert(products)
    .values({
      name: data.name,
      categoryId,
      category: categorySlug,
      price: Number(data.price),
      cost: data.cost ? Number(data.cost) : 0,
      stock: data.stock ? Number(data.stock) : 0,
      minStock: data.minStock ? Number(data.minStock) : 5,
      photoPath,
      barcode: data.barcode || null,
      description: data.description || null,
      isActive: true,
    })
    .returning();

  return inserted[0];
};

export const updateProduct = async (id: number, data: any) => {
  let photoPath = data.photoPath;
  if (data.photoBase64 && typeof data.photoBase64 === 'string') {
    const saved = saveProductImage(data.photoBase64);
    if (saved) photoPath = saved;
  }

  const updatePayload: any = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.categoryId !== undefined) {
    updatePayload.categoryId = Number(data.categoryId);
    const cat = await db.select().from(productCategories).where(eq(productCategories.id, updatePayload.categoryId)).limit(1);
    if (cat[0]) updatePayload.category = cat[0].slug;
  } else if (data.category !== undefined) {
    updatePayload.category = data.category;
    const cat = await db.select().from(productCategories).where(eq(productCategories.slug, data.category)).limit(1);
    if (cat[0]) updatePayload.categoryId = cat[0].id;
  }

  if (data.price !== undefined) updatePayload.price = Number(data.price);
  if (data.cost !== undefined) updatePayload.cost = Number(data.cost);
  if (data.stock !== undefined) updatePayload.stock = Number(data.stock);
  if (data.minStock !== undefined) updatePayload.minStock = Number(data.minStock);
  if (photoPath !== undefined) updatePayload.photoPath = photoPath;
  if (data.barcode !== undefined) updatePayload.barcode = data.barcode;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.isActive !== undefined) updatePayload.isActive = Boolean(data.isActive);

  const updated = await db
    .update(products)
    .set(updatePayload)
    .where(eq(products.id, id))
    .returning();

  return updated[0];
};

export const adjustStock = async (id: number, delta: number) => {
  const current = await getProductById(id);
  if (!current) throw new Error('Producto no encontrado');

  const newStock = Math.max(0, current.stock + delta);

  const updated = await db
    .update(products)
    .set({
      stock: newStock,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, id))
    .returning();

  return updated[0];
};

export const deleteProduct = async (id: number) => {
  const updated = await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(products.id, id))
    .returning();

  return updated[0];
};

export const getInventoryStats = async () => {
  const activeProducts = await db.select().from(products).where(eq(products.isActive, true));

  const totalProducts = activeProducts.length;
  const totalStockUnits = activeProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValue = activeProducts.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);
  const lowStockCount = activeProducts.filter((p) => (p.stock || 0) <= (p.minStock || 5)).length;

  return {
    totalProducts,
    totalStockUnits,
    totalValue,
    lowStockCount,
  };
};
