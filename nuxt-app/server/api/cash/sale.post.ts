import { defineEventHandler, readBody } from 'h3';
import { recordProductSale } from '../../services/cashService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const sale = await recordProductSale(body);
    return { success: true, data: sale };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
