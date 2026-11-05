import { defineEventHandler, getQuery } from 'h3';
import { getMovementsByPeriod } from '../../services/cashService';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const period = (query.period as 'daily' | 'weekly' | 'monthly' | 'custom') || 'daily';
    const startDate = query.startDate ? String(query.startDate) : undefined;
    const endDate = query.endDate ? String(query.endDate) : undefined;

    const result = await getMovementsByPeriod(period, startDate, endDate);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
