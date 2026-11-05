import { db } from '~~/server/lib/db';
import { productCategories, products } from '~~/drizzle/schema';
import { eq, and, sql, desc, count } from 'drizzle-orm';

export interface CategoryWithCount {
  id: number;
  name: string;
  slug: string;
  color?: string | null;
  isActive: boolean | null;
  productCount: number;
}

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

export const getCategories = async (): Promise<CategoryWithCount[]> => {
  const cats = await db
    .select({
      id: productCategories.id,
      name: productCategories.name,
      slug: productCategories.slug,
      color: productCategories.color,
      isActive: productCategories.isActive,
      productCount: sql<number>`(
        SELECT COUNT(*) 
        FROM products 
        WHERE (products.category_id = product_categories.id OR products.category = product_categories.slug)
          AND products.is_active = 1
      )`.mapWith(Number),
    })
    .from(productCategories)
    .where(eq(productCategories.isActive, true))
    .orderBy(productCategories.id);

  return cats;
};

export const getCategoryById = async (id: number) => {
  const rows = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.id, id))
    .limit(1);
  return rows[0] || null;
};

export const createCategory = async (data: { name: string; color?: string }) => {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error('El nombre de la categoría es requerido');
  }

  let slug = slugify(trimmedName);
  
  // Ensure slug uniqueness
  const existing = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const inserted = await db
    .insert(productCategories)
    .values({
      name: trimmedName,
      slug,
      color: data.color || null,
      isActive: true,
    })
    .returning();

  return inserted[0];
};

export const updateCategory = async (id: number, data: { name: string; color?: string }) => {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error('El nombre de la categoría es requerido');
  }

  const slug = slugify(trimmedName);

  const updated = await db
    .update(productCategories)
    .set({
      name: trimmedName,
      slug,
      color: data.color !== undefined ? data.color : undefined,
    })
    .where(eq(productCategories.id, id))
    .returning();

  return updated[0] || null;
};

export const deleteCategory = async (id: number) => {
  const category = await getCategoryById(id);
  if (!category) {
    throw new Error('Categoría no encontrada');
  }

  // Check if active products exist in this category
  const prods = await db
    .select({ count: count() })
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        sql`(products.category_id = ${id} OR products.category = ${category.slug})`
      )
    );

  const productCount = prods[0]?.count || 0;
  if (productCount > 0) {
    throw new Error(
      `No se puede eliminar la categoría "${category.name}" porque tiene ${productCount} producto(s) asociado(s). Reasigna los productos primero.`
    );
  }

  // Soft delete
  await db
    .update(productCategories)
    .set({ isActive: false })
    .where(eq(productCategories.id, id));

  return { success: true, id };
};
