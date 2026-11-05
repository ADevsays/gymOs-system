import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { adjustStock } from '../../../services/productService';

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');
    if (!id) return { success: false, error: 'ID de producto no especificado' };

    const body = await readBody(event);
    const delta = Number(body.delta);
    if (isNaN(delta)) {
      return { success: false, error: 'Delta de stock inválido' };
    }

    const updated = await adjustStock(Number(id), delta);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
