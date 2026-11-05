import { defineEventHandler } from 'h3';
import { getRegisterSessionDetails } from '../../services/cashService';

export default defineEventHandler(async () => {
  try {
    const details = await getRegisterSessionDetails();
    return { success: true, data: details };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
