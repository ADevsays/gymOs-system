import { db } from '~~/server/lib/db';
import { subscriptions, plans, members } from '~~/drizzle/schema';
import { and, eq, gte, lte, sql, count, ne } from 'drizzle-orm';
import type { PopularPlanStats } from './types';

export const getPopularPlanStats = async (
  _firstOfCurrentMonth?: string,
  _churnCutoff?: Date
): Promise<PopularPlanStats | null> => {
  const planStats = await db
    .select({
      planId: subscriptions.planId,
      planName: subscriptions.planName,
      totalUsers: sql<number>`COUNT(DISTINCT ${subscriptions.memberId})`,
    })
    .from(subscriptions)
    .innerJoin(members, eq(subscriptions.memberId, members.id))
    .where(and(eq(members.isArchived, false), sql`lower(${subscriptions.planName}) NOT LIKE '%especial%'`))
    .groupBy(subscriptions.planId, subscriptions.planName)
    .orderBy(sql`COUNT(DISTINCT ${subscriptions.memberId}) DESC`)
    .limit(1);

  if (planStats.length === 0) {
    const activePlans = await db
      .select({ id: plans.id, name: plans.name })
      .from(plans)
      .where(eq(plans.isActive, true))
      .limit(1);

    if (activePlans.length === 0) return null;

    return {
      planId: activePlans[0]!.id,
      planName: activePlans[0]!.name,
      totalUsers: 0,
      demandPercent: 0,
      newThisMonth: 0,
      renewals: 0,
      churned: 0,
    };
  }

  const top = planStats[0]!;

  const totalSubs = await db
    .select({ cnt: sql<number>`COUNT(DISTINCT ${subscriptions.memberId})` })
    .from(subscriptions)
    .innerJoin(members, eq(subscriptions.memberId, members.id))
    .where(and(eq(members.isArchived, false), sql`lower(${subscriptions.planName}) NOT LIKE '%especial%'`));
  const total = totalSubs[0]?.cnt || 1;

  const todayIso = new Date().toISOString().slice(0, 10);

  const planMembers = await db
    .select({
      memberId: members.id,
      memberCreatedAt: sql<string>`substr(${members.createdAt}, 1, 10)`,
      subStartDate: sql<string>`substr(${subscriptions.startDate}, 1, 10)`,
      subEndDate: subscriptions.endDate,
      subStatus: subscriptions.status,
    })
    .from(subscriptions)
    .innerJoin(members, eq(subscriptions.memberId, members.id))
    .where(
      and(
        eq(subscriptions.planId, top.planId),
        eq(members.isArchived, false)
      )
    )
    .orderBy(sql`${subscriptions.endDate} DESC`);

  const seenMemberIds = new Set<number>();
  let newUsersCount = 0;
  let renewalsCount = 0;
  let nonRenewalsCount = 0;

  const now = new Date();
  const firstOfMonth = _firstOfCurrentMonth || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  for (const pm of planMembers) {
    if (seenMemberIds.has(pm.memberId)) continue;
    seenMemberIds.add(pm.memberId);

    const isExpiredOrCancelled =
      pm.subStatus === 'cancelled' ||
      pm.subStatus === 'expired' ||
      pm.subEndDate < todayIso;

    if (isExpiredOrCancelled) {
      nonRenewalsCount++;
    } else {
      const isSubThisMonth = pm.subStartDate && pm.subStartDate >= firstOfMonth;
      const isRenewal = pm.subStartDate && pm.memberCreatedAt && pm.subStartDate > pm.memberCreatedAt;
      if (isRenewal) {
        if (isSubThisMonth) renewalsCount++;
      } else {
        if (isSubThisMonth) newUsersCount++;
      }
    }
  }

  return {
    planId: top.planId,
    planName: top.planName,
    totalUsers: top.totalUsers,
    demandPercent: Math.round((top.totalUsers / total) * 100),
    newThisMonth: newUsersCount,
    renewals: renewalsCount,
    churned: nonRenewalsCount,
  };
};
