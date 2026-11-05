import { db } from '~~/server/lib/db';
import { attendance, subscriptions, members, cashMovements } from '~~/drizzle/schema';
import { and, eq, gte, desc, sql } from 'drizzle-orm';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

export interface MemberEvent {
  memberId: number;
  name: string;
  cedula: string;
  photoPath: string | null;
  planName: string;
  eventDate: string;
  eventType: 'renewal' | 'cancellation';
}

export interface AnalyticsOptions {
  period?: AnalyticsPeriod;
  attendancePeriod?: AnalyticsPeriod;
  churnPeriod?: AnalyticsPeriod;
  revenuePeriod?: AnalyticsPeriod;
}

export interface AnalyticsData {
  period: AnalyticsPeriod;
  attendancePeriod: AnalyticsPeriod;
  churnPeriod: AnalyticsPeriod;
  revenuePeriod: AnalyticsPeriod;
  attendance: {
    totalVisits: number;
    todayCount: number;
    averagePerDay: number;
    peakDay: { date: string; label: string; count: number } | null;
    timeline: { date: string; label: string; count: number }[];
  };
  churn: {
    totalActive: number;
    totalChurned: number;
    totalRenewals: number;
    historicChurned: number;
    rate: number;
    timeline: { date: string; label: string; cancellations: number; renewals: number; count: number }[];
    events: MemberEvent[];
    recentExpired: {
      id: number;
      name: string;
      cedula: string;
      phone: string | null;
      planName: string;
      endDate: string;
      daysExpired: number;
    }[];
  };
  revenue: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    movementsCount: number;
    activeSubscriptionsTotal: number;
    activeSubscriptionsCount: number;
    growthPercent: number | null;
    averageTicket: number;
    portfolioTimeline: { month: string; label: string; total: number; count: number }[];
    timeline: { date: string; label: string; income: number; expense: number; balance: number }[];
  };
}

export const getAnalyticsStats = async (options: AnalyticsOptions | AnalyticsPeriod = '30d'): Promise<AnalyticsData> => {
  const opts: AnalyticsOptions = typeof options === 'string' ? { period: options } : options;
  const period = opts.period || '30d';
  const attendancePeriod = opts.attendancePeriod || period;
  const churnPeriod = opts.churnPeriod || period;
  const revenuePeriod = opts.revenuePeriod || period;

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  // 1. Attendance Timeline & Metrics (using attendancePeriod)
  let attDays = 30;
  if (attendancePeriod === '7d') attDays = 7;
  else if (attendancePeriod === '90d') attDays = 90;
  else if (attendancePeriod === 'all') attDays = 365;

  const attStartDate = new Date();
  attStartDate.setDate(attStartDate.getDate() - (attDays - 1));
  const attStartIso = attStartDate.toISOString().slice(0, 10);

  const attRows = await db
    .select({
      dayDate: attendance.date,
      cnt: sql<number>`count(*)`,
    })
    .from(attendance)
    .where(gte(attendance.date, attStartIso))
    .groupBy(attendance.date);

  const attMap = new Map<string, number>();
  let totalAtt = 0;
  for (const r of attRows) {
    if (r.dayDate) {
      attMap.set(r.dayDate, r.cnt);
      totalAtt += r.cnt;
    }
  }

  const attTimeline: { date: string; label: string; count: number }[] = [];
  let peakDay: { date: string; label: string; count: number } | null = null;

  for (let i = attDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const count = attMap.get(dateKey) || 0;
    const label = attDays <= 7
      ? d.toLocaleDateString('es-CO', { weekday: 'short' })
      : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

    attTimeline.push({ date: dateKey, label, count });

    if (!peakDay || count > peakDay.count) {
      peakDay = { date: dateKey, label, count };
    }
  }

  const todayAttCount = attMap.get(todayIso) || 0;
  const averageAttPerDay = attDays > 0 ? Math.round((totalAtt / attDays) * 10) / 10 : 0;

  // 2. Churn & Cancellations Timeline & Member Events (using churnPeriod)
  let churnDays = 30;
  if (churnPeriod === '7d') churnDays = 7;
  else if (churnPeriod === '90d') churnDays = 90;
  else if (churnPeriod === 'all') churnDays = 365;

  const churnStartDate = new Date();
  churnStartDate.setDate(churnStartDate.getDate() - (churnDays - 1));
  const churnStartIso = churnStartDate.toISOString().slice(0, 10);

  const activeMembersRes = await db
    .select({ cnt: sql<number>`COUNT(DISTINCT ${members.id})` })
    .from(members)
    .where(eq(members.isArchived, false));
  const activeCount = activeMembersRes[0]?.cnt ?? 0;

  const churnRows = await db
    .select({
      dayDate: sql<string>`substr(${subscriptions.endDate}, 1, 10)`,
      cnt: sql<number>`COUNT(DISTINCT ${subscriptions.memberId})`,
    })
    .from(subscriptions)
    .innerJoin(members, eq(members.id, subscriptions.memberId))
    .where(
      and(
        eq(members.isArchived, false),
        sql`(${subscriptions.status} = 'cancelled' OR ${subscriptions.status} = 'expired' OR ${subscriptions.endDate} < ${todayIso})`,
        sql`substr(${subscriptions.endDate}, 1, 10) >= ${churnStartIso}`
      )
    )
    .groupBy(sql`substr(${subscriptions.endDate}, 1, 10)`);

  const churnMap = new Map<string, number>();
  for (const r of churnRows) {
    if (r.dayDate) {
      churnMap.set(r.dayDate, r.cnt);
    }
  }

  const allChurnRes = await db
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
  const historicChurned = allChurnRes[0]?.cnt ?? 0;

  const cancellationEvents = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      cedula: members.cedula,
      photoPath: members.photoPath,
      planName: subscriptions.planName,
      eventDate: sql<string>`substr(${subscriptions.endDate}, 1, 10)`,
    })
    .from(subscriptions)
    .innerJoin(members, eq(members.id, subscriptions.memberId))
    .where(
      and(
        eq(members.isArchived, false),
        sql`(${subscriptions.status} = 'cancelled' OR ${subscriptions.status} = 'expired' OR ${subscriptions.endDate} < ${todayIso})`,
        sql`substr(${subscriptions.endDate}, 1, 10) >= ${churnStartIso}`
      )
    )
    .orderBy(desc(subscriptions.endDate));

  const renewalEvents = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      cedula: members.cedula,
      photoPath: members.photoPath,
      planName: subscriptions.planName,
      eventDate: sql<string>`substr(${subscriptions.startDate}, 1, 10)`,
    })
    .from(subscriptions)
    .innerJoin(members, eq(members.id, subscriptions.memberId))
    .where(
      and(
        eq(members.isArchived, false),
        eq(subscriptions.status, 'active'),
        sql`substr(${subscriptions.startDate}, 1, 10) > substr(${members.createdAt}, 1, 10)`,
        sql`substr(${subscriptions.startDate}, 1, 10) >= ${churnStartIso}`
      )
    )
    .orderBy(desc(subscriptions.startDate));

  const renewalMap = new Map<string, number>();
  for (const r of renewalEvents) {
    if (r.eventDate) {
      renewalMap.set(r.eventDate, (renewalMap.get(r.eventDate) || 0) + 1);
    }
  }

  const totalChurned = churnPeriod === 'all' ? historicChurned : cancellationEvents.length;
  const totalRenewals = renewalEvents.length;
  const totalCycles = totalChurned + totalRenewals;
  const churnRate = totalCycles > 0 ? Math.round((totalChurned / totalCycles) * 100) : 0;

  const churnTimeline: { date: string; label: string; cancellations: number; renewals: number; count: number }[] = [];
  for (let i = churnDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const cancellations = churnMap.get(dateKey) || 0;
    const renewals = renewalMap.get(dateKey) || 0;
    const label = churnDays <= 7
      ? d.toLocaleDateString('es-CO', { weekday: 'short' })
      : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

    churnTimeline.push({ date: dateKey, label, cancellations, renewals, count: cancellations + renewals });
  }

  const memberEvents: MemberEvent[] = [
    ...cancellationEvents.map((m) => ({
      memberId: m.id,
      name: `${m.firstName} ${m.lastName}`.trim(),
      cedula: m.cedula,
      photoPath: m.photoPath,
      planName: m.planName,
      eventDate: m.eventDate,
      eventType: 'cancellation' as const,
    })),
    ...renewalEvents.map((m) => ({
      memberId: m.id,
      name: `${m.firstName} ${m.lastName}`.trim(),
      cedula: m.cedula,
      photoPath: m.photoPath,
      planName: m.planName,
      eventDate: m.eventDate,
      eventType: 'renewal' as const,
    })),
  ].sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  const expiredMembersRaw = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      cedula: members.cedula,
      phone: members.phone,
      planName: subscriptions.planName,
      endDate: subscriptions.endDate,
    })
    .from(subscriptions)
    .innerJoin(members, eq(members.id, subscriptions.memberId))
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
    )
    .orderBy(desc(subscriptions.endDate))
    .limit(10);

  const recentExpired = expiredMembersRaw.map((m) => {
    const end = new Date(m.endDate);
    const diffMs = Math.max(0, now.getTime() - end.getTime());
    const daysExpired = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return {
      id: m.id,
      name: `${m.firstName} ${m.lastName}`.trim(),
      cedula: m.cedula,
      phone: m.phone,
      planName: m.planName,
      endDate: m.endDate,
      daysExpired,
    };
  });

  // 3. Revenue / Financial Timeline & Active Subscriptions Portfolio (using revenuePeriod)
  let revDays = 30;
  let portfolioMonths = 3;
  if (revenuePeriod === '7d') {
    revDays = 7;
    portfolioMonths = 2;
  } else if (revenuePeriod === '30d') {
    revDays = 30;
    portfolioMonths = 3;
  } else if (revenuePeriod === '90d') {
    revDays = 90;
    portfolioMonths = 4;
  } else if (revenuePeriod === 'all') {
    revDays = 365;
    portfolioMonths = 6;
  }

  const revStartDate = new Date();
  revStartDate.setDate(revStartDate.getDate() - (revDays - 1));
  const revStartIso = revStartDate.toISOString().slice(0, 10);

  const activeSubsRes = await db
    .select({
      totalPrice: sql<number>`COALESCE(SUM(${subscriptions.planPrice}), 0)`,
      cnt: sql<number>`COUNT(DISTINCT ${subscriptions.memberId})`,
    })
    .from(subscriptions)
    .innerJoin(members, eq(subscriptions.memberId, members.id))
    .where(
      and(
        eq(members.isArchived, false),
        sql`(${subscriptions.status} = 'active' AND ${subscriptions.endDate} >= ${todayIso}) OR lower(${subscriptions.planName}) LIKE '%especial%'`
      )
    );

  const activeSubscriptionsTotal = activeSubsRes[0]?.totalPrice ?? 0;
  const activeSubscriptionsCount = activeSubsRes[0]?.cnt ?? 0;

  const revRows = await db
    .select({
      dayDate: sql<string>`substr(${cashMovements.createdAt}, 1, 10)`,
      type: cashMovements.type,
      amount: sql<number>`SUM(${cashMovements.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(cashMovements)
    .where(gte(sql`substr(${cashMovements.createdAt}, 1, 10)`, revStartIso))
    .groupBy(sql`substr(${cashMovements.createdAt}, 1, 10)`, cashMovements.type);

  const revIncomeMap = new Map<string, number>();
  const revExpenseMap = new Map<string, number>();
  let totalIncome = 0;
  let totalExpenses = 0;
  let movementsCount = 0;

  for (const r of revRows) {
    if (r.dayDate) {
      movementsCount += r.count;
      if (r.type === 'income') {
        revIncomeMap.set(r.dayDate, r.amount);
        totalIncome += r.amount;
      } else if (r.type === 'expense') {
        revExpenseMap.set(r.dayDate, r.amount);
        totalExpenses += r.amount;
      }
    }
  }

  const revTimeline: { date: string; label: string; income: number; expense: number; balance: number }[] = [];
  for (let i = revDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const income = revIncomeMap.get(dateKey) || 0;
    const expense = revExpenseMap.get(dateKey) || 0;
    const label = revDays <= 7
      ? d.toLocaleDateString('es-CO', { weekday: 'short' })
      : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

    revTimeline.push({
      date: dateKey,
      label,
      income,
      expense,
      balance: income - expense,
    });
  }

  // Monthly portfolio progression (MRR evolution) respecting portfolioMonths
  const portfolioTimeline: { month: string; label: string; total: number; count: number }[] = [];
  for (let i = portfolioMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const dateStr = i === 0 ? todayIso : d.toISOString().slice(0, 10);
    const monthLabel = d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
    const res = await db
      .select({
        totalPrice: sql<number>`COALESCE(SUM(${subscriptions.planPrice}), 0)`,
        cnt: sql<number>`COUNT(DISTINCT ${subscriptions.memberId})`,
      })
      .from(subscriptions)
      .innerJoin(members, eq(members.id, subscriptions.memberId))
      .where(
        and(
          eq(members.isArchived, false),
          sql`${subscriptions.startDate} <= ${dateStr}`,
          sql`(${subscriptions.endDate} >= ${dateStr} OR lower(${subscriptions.planName}) LIKE '%especial%')`
        )
      );
    portfolioTimeline.push({
      month: dateStr.slice(0, 7),
      label: monthLabel,
      total: res[0]?.totalPrice ?? 0,
      count: res[0]?.cnt ?? 0,
    });
  }

  const currentMonthTotal = portfolioTimeline[portfolioTimeline.length - 1]?.total ?? 0;
  const prevMonthTotal = portfolioTimeline.length >= 2 ? portfolioTimeline[portfolioTimeline.length - 2]?.total ?? 0 : 0;
  const growthPercent = prevMonthTotal > 0 ? Math.round(((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100) : null;
  const averageTicket = activeSubscriptionsCount > 0 ? Math.round(activeSubscriptionsTotal / activeSubscriptionsCount) : 0;

  return {
    period,
    attendancePeriod,
    churnPeriod,
    revenuePeriod,
    attendance: {
      totalVisits: totalAtt,
      todayCount: todayAttCount,
      averagePerDay: averageAttPerDay,
      peakDay,
      timeline: attTimeline,
    },
    churn: {
      totalActive: activeCount,
      totalChurned,
      totalRenewals,
      historicChurned,
      rate: churnRate,
      timeline: churnTimeline,
      events: memberEvents,
      recentExpired,
    },
    revenue: {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      movementsCount,
      activeSubscriptionsTotal,
      activeSubscriptionsCount,
      growthPercent,
      averageTicket,
      portfolioTimeline,
      timeline: revTimeline,
    },
  };
};
