import { defineEventHandler, getQuery } from 'h3';
import { getAttendanceStats, getAttendanceHistory } from '~~/server/services/attendanceService';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const days = query.days ? Number(query.days) : 7;
    const limit = query.limit ? Number(query.limit) : 50;

    const stats = await getAttendanceStats(days);
    const history = await getAttendanceHistory(limit);

    return {
      success: true,
      data: {
        stats,
        history,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
