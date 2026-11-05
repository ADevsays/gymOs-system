import { defineEventHandler, readBody } from 'h3';
import { recordProductPurchase } from '../../services/cashService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const purchase = await recordProductPurchase(body);
    return { success: true, data: purchase };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
