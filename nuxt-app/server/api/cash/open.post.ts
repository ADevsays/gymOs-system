import { defineEventHandler, readBody } from 'h3';
import { openRegister } from '../../services/cashService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const openingBalance = Number(body.openingBalance) || 0;
    const notes = body.notes;

    const session = await openRegister(openingBalance, notes);
    return { success: true, data: session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
