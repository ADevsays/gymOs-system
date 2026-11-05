import { defineEventHandler, getQuery } from 'h3';
import { getProducts } from '../../services/productService';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const filters = {
      category: query.category as string | undefined,
      search: query.search as string | undefined,
      lowStockOnly: query.lowStock === 'true',
      activeOnly: query.includeArchived !== 'true',
    };

    const productList = await getProducts(filters);
    return { success: true, data: productList };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
