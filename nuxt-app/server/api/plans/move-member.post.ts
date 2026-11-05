import { defineEventHandler, readBody } from 'h3';
import { moveMemberToPlan } from '../../services/planService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { memberId, targetPlanId } = body;

    if (!memberId || !targetPlanId) {
      return { success: false, error: 'Se requiere memberId y targetPlanId' };
    }

    const result = await moveMemberToPlan(Number(memberId), Number(targetPlanId));
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
