import { defineEventHandler, readBody } from 'h3';
import { closeRegister } from '../../services/cashService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const id = Number(body.id);
    const countedCash = Number(body.countedCash);
    const notes = body.notes;

    if (!id || isNaN(countedCash)) {
      return { success: false, error: 'ID de sesión y efectivo contado son obligatorios' };
    }

    const session = await closeRegister(id, countedCash, notes);
    return { success: true, data: session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
