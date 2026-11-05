import { defineEventHandler, getRouterParam } from 'h3';
import { deleteCashMovement } from '../../../services/cashService';

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id');
    const id = Number(idParam);
    if (!id || isNaN(id)) {
      return { success: false, error: 'ID de movimiento inválido' };
    }

    const result = await deleteCashMovement(id);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
