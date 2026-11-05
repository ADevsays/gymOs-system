import { ref, computed } from 'vue';

interface MonthlyRevenue {
  month: string;
  total: number;
}

interface ChurnStats {
  totalActive: number;
  totalChurned: number;
  rate: number;
  renewalsMonth?: number;
  daily: { day: string; count: number }[];
}

interface PunchIn {
  totalVisits: number;
  daily: { day: string; count: number }[];
}

interface PopularPlanStats {
  planId: number;
  planName: string;
  totalUsers: number;
  demandPercent: number;
  newThisMonth: number;
  renewals: number;
  churned: number;
}

interface DashboardData {
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
  punchIn: PunchIn;
  popularPlan: PopularPlanStats | null;
  totalMembers: number;
}

export const useDashboard = () => {
  const loading = ref(false);
  const recordingAttendance = ref(false);
  const error = ref<string | null>(null);

  const revenue = ref({
    totalBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    currentMonth: 0,
    previousMonth: 0,
    activeSubscriptionsTotal: 0,
    activeSubscriptionsCount: 0,
    activeSubscriptionsPortfolioChange: null as number | null,
    monthlyActiveSubscriptions: [] as MonthlyRevenue[],
    monthly: [] as MonthlyRevenue[]
  });

  const churn = ref<ChurnStats>({
    totalActive: 0,
    totalChurned: 0,
    rate: 0,
    renewalsMonth: 0,
    daily: []
  });

  const punchIn = ref<PunchIn>({
    totalVisits: 0,
    daily: []
  });

  const popularPlan = ref<PopularPlanStats | null>(null);
  const totalMembers = ref(0);

  const fetchStats = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<any>('/api/dashboard/stats');
      if (response.success) {
        revenue.value = response.data.revenue;
        churn.value = response.data.churn;
        punchIn.value = response.data.punchIn;
        popularPlan.value = response.data.popularPlan;
        totalMembers.value = response.data.totalMembers;
      } else {
        error.value = response.error;
      }
    } catch (err: any) {
      error.value = err.message || 'Error al cargar el dashboard';
    } finally {
      loading.value = false;
    }
  };

  const recordQuickAttendance = async () => {
    recordingAttendance.value = true;
    try {
      const res = await $fetch<any>('/api/attendance', {
        method: 'POST',
        body: {},
      });
      if (res.success) {
        punchIn.value.totalVisits += 1;
        if (punchIn.value.daily.length > 0) {
          const lastIdx = punchIn.value.daily.length - 1;
          punchIn.value.daily[lastIdx].count += 1;
        }
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      recordingAttendance.value = false;
    }
  };

  const revenueChange = computed<number | null>(() => {
    const curr = revenue.value.currentMonth;
    const prev = revenue.value.previousMonth;
    if (prev === 0) return null;
    return Math.round(((curr - prev) / Math.abs(prev)) * 100);
  });

  return {
    loading,
    recordingAttendance,
    error,
    fetchStats,
    recordQuickAttendance,
    revenue,
    churn,
    punchIn,
    popularPlan,
    totalMembers,
    revenueChange,
  };
};
