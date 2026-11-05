import { defineEventHandler, readBody, getRouterParam } from 'h3';
import { updatePlan } from '../../services/planService';

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');
    if (!id) {
      return { success: false, error: 'ID no proporcionado' };
    }

    const body = await readBody(event);
    
    const updatedPlan = await updatePlan(Number(id), {
      name: body.name,
      type: body.type,
      price: body.price,
      durationDays: body.durationDays,
      description: body.description,
      maxMembers: body.maxMembers,
      validUntil: body.validUntil,
      isActive: body.isActive
    });

    return { success: true, data: updatedPlan };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
