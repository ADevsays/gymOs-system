import { defineEventHandler } from 'h3';
import { getUpcomingExpiringMembers } from '../../services/memberService';

export default defineEventHandler(async () => {
  try {
    const data = await getUpcomingExpiringMembers(10);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
