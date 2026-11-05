import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { updateMember } from '../../services/memberService';

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id');
  if (!idStr) return { success: false, error: 'ID is required' };
  
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return { success: false, error: 'Invalid ID' };

  try {
    const body = await readBody(event);
    
    await updateMember(id, body);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
