import { defineEventHandler } from 'h3';
import { getDashboardStats } from '~~/server/services/dashboardService';

export default defineEventHandler(async () => {
  try {
    const data = await getDashboardStats();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
