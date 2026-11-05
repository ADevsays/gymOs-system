import { defineEventHandler, readBody } from 'h3';
import { getMemberByCedula, createMemberWithSubscription } from '../../services/memberService';
import { getPlanById } from '../../services/planService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    const existingId = await getMemberByCedula(body.cedula);
    if (existingId) {
      return { success: false, error: 'MEMBER_EXISTS', memberId: existingId };
    }

    const plan = await getPlanById(body.planId);
    if (!plan) {
      return { success: false, error: 'Plan no encontrado' };
    }

    const newMemberId = await createMemberWithSubscription(body, plan);

    return { success: true, memberId: newMemberId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
