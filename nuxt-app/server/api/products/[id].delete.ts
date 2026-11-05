import { defineEventHandler, getRouterParam } from 'h3';
import { deleteProduct } from '../../services/productService';

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');
    if (!id) return { success: false, error: 'ID de producto no especificado' };

    const deleted = await deleteProduct(Number(id));
    return { success: true, data: deleted };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
