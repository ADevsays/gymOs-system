import { defineEventHandler, readBody } from 'h3';
import { recordAttendance } from '~~/server/services/attendanceService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event).catch(() => ({}));
    const memberId = body?.memberId ? Number(body.memberId) : undefined;
    const notes = body?.notes || undefined;

    const result = await recordAttendance(memberId, notes);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
