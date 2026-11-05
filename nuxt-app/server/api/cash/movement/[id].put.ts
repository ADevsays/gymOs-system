import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { updateCashMovement } from '../../../services/cashService';

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id');
    const id = Number(idParam);
    if (!id || isNaN(id)) {
      return { success: false, error: 'ID de movimiento inválido' };
    }

    const body = await readBody(event);
    const result = await updateCashMovement(id, body);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
