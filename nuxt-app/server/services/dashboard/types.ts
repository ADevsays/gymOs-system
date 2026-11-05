export interface MonthlyRevenue {
  month: string;
  total: number;
}

export interface ChurnStats {
  totalActive: number;
  totalChurned: number;
  rate: number;
  renewalsMonth?: number;
  churnedMonth?: number;
  daily: { day: string; count: number }[];
}

export interface PopularPlanStats {
  planId: number;
  planName: string;
  totalUsers: number;
  demandPercent: number;
  newThisMonth: number;
  renewals: number;
  churned: number;
}

export interface PunchInStats {
  totalVisits: number;
  daily: { day: string; count: number }[];
}

export interface DashboardData {
  revenue: {
    totalBalance: number;
    totalIncome: number;
    totalExpenses: number;
    currentMonth: number;
    previousMonth: number;
    activeSubscriptionsTotal: number;
    activeSubscriptionsCount: number;
    activeSubscriptionsPortfolioChange: number | null;
    monthlyActiveSubscriptions: MonthlyRevenue[];
    monthly: MonthlyRevenue[];
  };
  churn: ChurnStats;
  punchIn: PunchInStats;
  popularPlan: PopularPlanStats | null;
  totalMembers: number;
}

