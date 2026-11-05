import { defineEventHandler, getRouterParam } from 'h3';
import { getMemberDetail } from '../../services/memberService';

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id');
  if (!idStr) return { success: false, error: 'ID is required' };
  
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return { success: false, error: 'Invalid ID' };

  try {
    const member = await getMemberDetail(id);
    if (!member) return { success: false, error: 'Member not found', statusCode: 404 };
    
    return { success: true, data: member };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
