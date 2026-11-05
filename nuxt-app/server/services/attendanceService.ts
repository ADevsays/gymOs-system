import { db } from '~~/server/lib/db';
import { attendance, members } from '~~/drizzle/schema';
import { desc, eq, gte, sql } from 'drizzle-orm';

export interface DailyAttendanceSlot {
  day: string;
  date: string;
  count: number;
}

export interface AttendanceStats {
  totalVisits: number;
  todayCount: number;
  daily: DailyAttendanceSlot[];
}

export const recordAttendance = async (memberId?: number, notes?: string) => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const isoCheckIn = now.toISOString();

  const inserted = await db
    .insert(attendance)
    .values({
      memberId: memberId || null,
      date: dateStr,
      checkInAt: isoCheckIn,
      notes: notes || null,
    })
    .returning();

  return inserted[0];
};

export const getAttendanceStats = async (days = 7): Promise<AttendanceStats> => {
  const now = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (days - 1));
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const rows = await db
    .select({
      dayDate: attendance.date,
      cnt: sql<number>`count(*)`,
    })
    .from(attendance)
    .where(gte(attendance.date, cutoffStr))
    .groupBy(attendance.date);

  const countMap = new Map<string, number>();
  let totalVisits = 0;
  for (const row of rows) {
    if (row.dayDate) {
      countMap.set(row.dayDate, row.cnt);
      totalVisits += row.cnt;
    }
  }

  const daily: DailyAttendanceSlot[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('es-CO', { weekday: 'short' });
    daily.push({
      day: dayLabel,
      date: dateStr,
      count: countMap.get(dateStr) || 0,
    });
  }

  const todayCount = countMap.get(todayStr) || 0;

  return {
    totalVisits,
    todayCount,
    daily,
  };
};

export const getAttendanceHistory = async (limit = 50) => {
  const rows = await db
    .select({
      id: attendance.id,
      memberId: attendance.memberId,
      date: attendance.date,
      checkInAt: attendance.checkInAt,
      notes: attendance.notes,
      createdAt: attendance.createdAt,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
      memberCedula: members.cedula,
      memberPhotoPath: members.photoPath,
    })
    .from(attendance)
    .leftJoin(members, eq(attendance.memberId, members.id))
    .orderBy(desc(attendance.checkInAt))
    .limit(limit);

  return rows;
};

export const deleteAttendance = async (id: number) => {
  await db.delete(attendance).where(eq(attendance.id, id));
  return true;
};

export const deleteLatestAttendance = async () => {
  const latest = await db
    .select({ id: attendance.id })
    .from(attendance)
    .orderBy(desc(attendance.checkInAt))
    .limit(1);

  if (latest[0]) {
    await db.delete(attendance).where(eq(attendance.id, latest[0].id));
    return latest[0].id;
  }
  return null;
};

