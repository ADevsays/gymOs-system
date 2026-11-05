import { defineEventHandler, readBody } from 'h3';
import { recordExpense } from '../../services/cashService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    if (!body.concept || !body.amount) {
      return { success: false, error: 'Concepto y monto son obligatorios' };
    }

    const movement = await recordExpense(body);
    return { success: true, data: movement };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
