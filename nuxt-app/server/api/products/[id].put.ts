import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { updateProduct } from '../../services/productService';

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');
    if (!id) return { success: false, error: 'ID de producto no especificado' };

    const body = await readBody(event);
    const updated = await updateProduct(Number(id), body);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
