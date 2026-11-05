import { defineEventHandler } from 'h3';
import { getCashHistory } from '../../services/cashService';

export default defineEventHandler(async () => {
  try {
    const history = await getCashHistory();
    return { success: true, data: history };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
