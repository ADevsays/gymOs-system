import { defineEventHandler, getRouterParam } from 'h3';
import { archivePlan } from '../../services/planService';

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');
    if (!id) {
      return { success: false, error: 'ID no proporcionado' };
    }

    const archivedPlan = await archivePlan(Number(id));

    return { success: true, data: archivedPlan };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
