import { defineEventHandler } from 'h3';
import { getInventoryStats } from '../../services/productService';

export default defineEventHandler(async () => {
  try {
    const stats = await getInventoryStats();
    return { success: true, data: stats };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
