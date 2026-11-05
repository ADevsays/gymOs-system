import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { refundMemberSubscription } from '../../../services/memberService';

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id');
  if (!idStr) return { success: false, error: 'ID is required' };

  const id = parseInt(idStr, 10);
  if (isNaN(id)) return { success: false, error: 'Invalid ID' };

  try {
    const body = await readBody(event);
    const { amount, paymentMethod, reason } = body;

    if (!amount || Number(amount) <= 0) {
      return { success: false, error: 'El monto a reembolsar debe ser mayor a 0' };
    }

    const result = await refundMemberSubscription(id, {
      amount: Number(amount),
      paymentMethod: paymentMethod || 'cash',
      reason,
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
