import { defineEventHandler, getQuery } from 'h3';
import { getActivePlans, getAllPlans } from '../../services/planService';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const plansList = query.activeOnly === 'true' ? await getActivePlans() : await getAllPlans();
    return { success: true, data: plansList };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
