import { db } from '~~/server/lib/db';
import { cashMovements, subscriptions, members } from '~~/drizzle/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { MonthlyRevenue } from './types';

export const getRevenueStats = async (currentYear: number, currentMonth: number) => {
  const firstOfCurrentMonth = new Date(currentYear, currentMonth, 1).toISOString();
  const firstOfNextMonth = new Date(currentYear, currentMonth + 1, 1).toISOString();
  const firstOfPrevMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();

  // All-time income and expenses
  const allIncomes = await db
    .select({ total: sql<number>`COALESCE(SUM(${cashMovements.amount}), 0)` })
    .from(cashMovements)
    .where(eq(cashMovements.type, 'income'));

  const allExpenses = await db
    .select({ total: sql<number>`COALESCE(SUM(${cashMovements.amount}), 0)` })
    .from(cashMovements)
    .where(eq(cashMovements.type, 'expense'));

  const totalIncome = allIncomes[0]?.total ?? 0;
  const totalExpenses = allExpenses[0]?.total ?? 0;
  const totalBalance = totalIncome - totalExpenses;

  // Current month net balance
  const curIncomes = await db
    .select({ total: sql<number>`COALESCE(SUM(${cashMovements.amount}), 0)` })
    .from(cashMovements)
    .where(and(eq(cashMovements.type, 'income'), gte(cashMovements.createdAt, firstOfCurrentMonth), lte(cashMovements.createdAt, firstOfNextMonth)));

  const curExpenses = await db
    .select({ total: sql<number>`COALESCE(SUM(${cashMovements.amount}), 0)` })
    .from(cashMovements)
    .where(and(eq(cashMovements.type, 'expense'), gte(cashMovements.createdAt, firstOfCurrentMonth), lte(cashMovements.createdAt, firstOfNextMonth)));

  const currentMonthBalance = (curIncomes[0]?.total ?? 0) - (curExpenses[0]?.total ?? 0);

  // Prev month net balance
  const prevIncomes = await db
    .select({ total: sql<number>`COALESCE(SUM(${cashMovements.amount}), 0)` })
    .from(cashMovements)
    .where(and(eq(cashMovements.type, 'income'), gte(cashMovements.createdAt, firstOfPrevMonth), lte(cashMovements.createdAt, firstOfCurrentMonth)));

  const prevExpenses = await db
    .select({ total: sql<number>`COALESCE(SUM(${cashMovements.amount}), 0)` })
    .from(cashMovements)
    .where(and(eq(cashMovements.type, 'expense'), gte(cashMovements.createdAt, firstOfPrevMonth), lte(cashMovements.createdAt, firstOfCurrentMonth)));

  const prevMonthBalance = (prevIncomes[0]?.total ?? 0) - (prevExpenses[0]?.total ?? 0);

  // Active subscriptions portfolio (MRR / Recurring base)
  const todayIso = new Date().toISOString().slice(0, 10);
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

  // Previous month active subscriptions portfolio comparison
  const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0).toISOString().slice(0, 10);
  const prevActiveSubsRes = await db
    .select({
      totalPrice: sql<number>`COALESCE(SUM(${subscriptions.planPrice}), 0)`,
    })
    .from(subscriptions)
    .innerJoin(members, eq(subscriptions.memberId, members.id))
    .where(
      and(
        eq(members.isArchived, false),
        sql`${subscriptions.startDate} <= ${lastDayOfPrevMonth}`,
        sql`(${subscriptions.endDate} >= ${lastDayOfPrevMonth} OR lower(${subscriptions.planName}) LIKE '%especial%')`
      )
    );

  const prevActiveSubscriptionsTotal = prevActiveSubsRes[0]?.totalPrice ?? 0;
  let activeSubscriptionsPortfolioChange: number | null = null;
  if (prevActiveSubscriptionsTotal > 0) {
    activeSubscriptionsPortfolioChange = Math.round(
      ((activeSubscriptionsTotal - prevActiveSubscriptionsTotal) / prevActiveSubscriptionsTotal) * 100
    );
  }

  // Monthly active subscriptions for trailing 6 months
  const monthlyActiveSubscriptions: MonthlyRevenue[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i + 1, 0);
    const dateStr = i === 0 ? todayIso : d.toISOString().slice(0, 10);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const res = await db
      .select({ totalPrice: sql<number>`COALESCE(SUM(${subscriptions.planPrice}), 0)` })
      .from(subscriptions)
      .innerJoin(members, eq(subscriptions.memberId, members.id))
      .where(
        and(
          eq(members.isArchived, false),
          sql`${subscriptions.startDate} <= ${dateStr}`,
          sql`(${subscriptions.endDate} >= ${dateStr} OR lower(${subscriptions.planName}) LIKE '%especial%')`
        )
      );
    monthlyActiveSubscriptions.push({
      month: monthKey,
      total: res[0]?.totalPrice ?? 0,
    });
  }

  // Monthly net balance for the trailing 6 months
  const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);
  const monthlyBalance = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${cashMovements.createdAt})`,
      total: sql<number>`COALESCE(SUM(CASE WHEN ${cashMovements.type} = 'income' THEN ${cashMovements.amount} ELSE -${cashMovements.amount} END), 0)`,
    })
    .from(cashMovements)
    .where(gte(cashMovements.createdAt, sixMonthsAgo.toISOString()))
    .groupBy(sql`strftime('%Y-%m', ${cashMovements.createdAt})`)
    .orderBy(sql`strftime('%Y-%m', ${cashMovements.createdAt})`);

  const balanceMap = new Map<string, number>();
  for (const row of monthlyBalance) {
    if (row.month) {
      balanceMap.set(row.month, row.total);
    }
  }

  const last6Months: MonthlyRevenue[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    last6Months.push({
      month: monthKey,
      total: balanceMap.get(monthKey) || 0,
    });
  }

  return {
    totalBalance,
    totalIncome,
    totalExpenses,
    currentMonth: currentMonthBalance,
    previousMonth: prevMonthBalance,
    activeSubscriptionsTotal,
    activeSubscriptionsCount,
    activeSubscriptionsPortfolioChange,
    monthlyActiveSubscriptions,
    monthly: last6Months,
  };
};
