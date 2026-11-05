import type { PunchInStats } from './types';
import { getAttendanceStats } from '../attendanceService';

export const getPunchInStats = async (): Promise<PunchInStats> => {
  const stats = await getAttendanceStats(7);
  return {
    totalVisits: stats.totalVisits,
    daily: stats.daily.map(d => ({ day: d.day, count: d.count })),
  };
};
