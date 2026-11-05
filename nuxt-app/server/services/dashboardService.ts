import { db } from '~~/server/lib/db';
import { members } from '~~/drizzle/schema';
import { eq, count } from 'drizzle-orm';
import type { DashboardData } from './dashboard/types';
import { getRevenueStats } from './dashboard/revenueService';
import { getChurnStats } from './dashboard/churnService';
import { getPopularPlanStats } from './dashboard/popularPlanService';
import { getPunchInStats } from './dashboard/punchInService';

export * from './dashboard/types';

export const getDashboardStats = async (): Promise<DashboardData> => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const totalActiveMembers = await db
    .select({ cnt: count() })
    .from(members)
    .where(eq(members.isArchived, false));

  const activeCount = totalActiveMembers[0]?.cnt ?? 0;

  const firstOfCurrentMonth = new Date(currentYear, currentMonth, 1).toISOString();
  const churnThresholdDays = 15;
  const churnCutoff = new Date();
  churnCutoff.setDate(churnCutoff.getDate() - churnThresholdDays);

  const revenue = await getRevenueStats(currentYear, currentMonth);
  const churn = await getChurnStats(activeCount, churnCutoff);
  const popularPlan = await getPopularPlanStats(firstOfCurrentMonth, churnCutoff);
  const punchIn = await getPunchInStats();

  return {
    revenue,
    churn,
    punchIn,
    popularPlan,
    totalMembers: activeCount,
  };
};
