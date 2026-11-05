import { db } from '~~/server/lib/db';
import { members, subscriptions } from '~~/drizzle/schema';
import { and, eq, lte, sql } from 'drizzle-orm';
import type { ChurnStats } from './types';

export const getChurnStats = async (activeCount: number, _churnCutoff?: Date): Promise<ChurnStats> => {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const firstOfMonthStr = new Date(currentYear, currentMonth, 1).toISOString().slice(0, 10);

  const churnedRes = await db
    .select({ cnt: sql<number>`COUNT(DISTINCT ${members.id})` })
    .from(members)
    .innerJoin(subscriptions, eq(subscriptions.memberId, members.id))
    .where(
      and(
        eq(members.isArchived, false),
        sql`(${subscriptions.status} = 'cancelled' OR ${subscriptions.status} = 'expired' OR ${subscriptions.endDate} < ${todayIso})`,
        sql`${members.id} NOT IN (
          SELECT DISTINCT member_id FROM subscriptions
          WHERE (status = 'active' AND end_date >= ${todayIso})
             OR lower(plan_name) LIKE '%especial%'
        )`
      )
    );

  const churned = churnedRes[0]?.cnt ?? 0;
  const churnRate = activeCount > 0 ? Math.round((churned / activeCount) * 100) : 0;

  // Renewals this month
  const renewalsMonthRes = await db
    .select({ cnt: sql<number>`COUNT(DISTINCT ${subscriptions.memberId})` })
    .from(subscriptions)
    .innerJoin(members, eq(subscriptions.memberId, members.id))
    .where(
      and(
        eq(members.isArchived, false),
        eq(subscriptions.status, 'active'),
        sql`substr(${subscriptions.startDate}, 1, 10) >= ${firstOfMonthStr}`,
        sql`substr(${subscriptions.startDate}, 1, 10) > substr(${members.createdAt}, 1, 10)`
      )
    );

  const renewalsMonth = renewalsMonthRes[0]?.cnt ?? 0;

  // Daily cancellations this month (from 1st of month to today, at least 7 days)
  const daysInTimeline = Math.max(now.getDate(), 7);
  const startTimelineDate = new Date(currentYear, currentMonth, now.getDate() - (daysInTimeline - 1));
  const startTimelineStr = startTimelineDate.toISOString().slice(0, 10);

  const monthChurnRows = await db
    .select({
      dayDate: sql<string>`substr(${subscriptions.endDate}, 1, 10)`,
      cnt: sql<number>`COUNT(DISTINCT ${subscriptions.memberId})`
    })
    .from(subscriptions)
    .innerJoin(members, eq(members.id, subscriptions.memberId))
    .where(
      and(
        eq(members.isArchived, false),
        sql`(${subscriptions.status} = 'cancelled' OR ${subscriptions.status} = 'expired' OR ${subscriptions.endDate} < ${todayIso})`,
        sql`substr(${subscriptions.endDate}, 1, 10) >= ${startTimelineStr}`
      )
    )
    .groupBy(sql`substr(${subscriptions.endDate}, 1, 10)`);

  const churnMap = new Map<string, number>();
  for (const row of monthChurnRows) {
    if (row.dayDate) {
      churnMap.set(row.dayDate, row.cnt);
    }
  }

  const dailyChurn: { day: string; count: number }[] = [];
  for (let i = daysInTimeline - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = `${d.getDate()} ${d.toLocaleDateString('es-CO', { month: 'short' })}`;
    dailyChurn.push({
      day: dayLabel,
      count: churnMap.get(dateStr) || 0,
    });
  }

  return {
    totalActive: activeCount,
    totalChurned: churned,
    rate: churnRate,
    renewalsMonth,
    daily: dailyChurn,
  };
};
