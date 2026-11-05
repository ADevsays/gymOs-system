import { defineEventHandler } from 'h3';
import { getUpcomingBirthdayMembers } from '../../services/memberService';

export default defineEventHandler(async () => {
  try {
    return { success: true, data: await getUpcomingBirthdayMembers(10) };
  } catch (error: any) {
    return { success: false, error: error.message || 'No se pudieron cargar los cumpleaños próximos.' };
  }
});
