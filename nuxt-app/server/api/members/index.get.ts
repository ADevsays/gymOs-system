import { defineEventHandler, getQuery } from 'h3';
import { getMembersList } from '../../services/memberService';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const search = query.q as string | undefined;
  const limit = query.limit !== undefined ? parseInt(query.limit as string, 10) : 25;
  const offset = query.offset !== undefined ? parseInt(query.offset as string, 10) : 0;

  try {
    const result = await getMembersList(search, limit, offset);
    return {
      success: true,
      data: result.members,
      total: result.total,
      hasMore: result.hasMore,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
