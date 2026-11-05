import { defineEventHandler, readBody } from 'h3';
import { createPlan } from '../../services/planService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    // Validaciones básicas
    if (!body.name || body.price === undefined || !body.durationDays) {
      return { success: false, error: 'Faltan campos obligatorios' };
    }

    const newPlan = await createPlan({
      name: body.name,
      type: body.type || 'standard',
      price: body.price,
      durationDays: body.durationDays,
      description: body.description || null,
      maxMembers: body.maxMembers || 1,
      validUntil: body.validUntil || null,
      isActive: body.isActive !== undefined ? body.isActive : true
    });

    return { success: true, data: newPlan };
  } catch (error: any) {
    console.error('Error in createPlan:', error);
    const errorMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error)) || 'Unknown error';
    return { success: false, error: errorMsg };
  }
});
