import { defineEventHandler, getRouterParam } from 'h3';
import { deleteAttendance, deleteLatestAttendance } from '~~/server/services/attendanceService';

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id');
    if (idParam === 'latest') {
      const deletedId = await deleteLatestAttendance();
      return { success: true, deletedId };
    }

    const id = Number(idParam);
    if (!id || isNaN(id)) {
      throw new Error('ID de asistencia inválido');
    }

    await deleteAttendance(id);
    return { success: true, deletedId: id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
