import { defineEventHandler, getRouterParam } from 'h3';
import { archiveMember } from '../../services/memberService';

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id');
  if (!idStr) return { success: false, error: 'ID is required' };
  
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return { success: false, error: 'Invalid ID' };

  try {
    await archiveMember(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
