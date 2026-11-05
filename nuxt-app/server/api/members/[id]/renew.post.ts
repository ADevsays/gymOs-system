import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { renewMemberSubscription } from '../../../services/memberService';

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id');
  if (!idStr) return { success: false, error: 'ID is required' };

  const id = parseInt(idStr, 10);
  if (isNaN(id)) return { success: false, error: 'Invalid ID' };

  try {
    const body = await readBody(event);
    const { planId, paymentMethod, startDate, customPrice, customPriceReason, transferReference, transferReceipt } = body;

    if (!planId) {
      return { success: false, error: 'Debes seleccionar un plan' };
    }

    const result = await renewMemberSubscription(id, {
      planId: Number(planId),
      paymentMethod: paymentMethod || 'cash',
      startDate: startDate ? String(startDate) : undefined,
      customPrice: customPrice !== undefined && customPrice !== null && customPrice !== '' ? Number(customPrice) : undefined,
      customPriceReason,
      transferReference,
      transferReceipt,
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
