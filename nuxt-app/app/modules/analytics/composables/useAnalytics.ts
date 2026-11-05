import { ref, watch } from 'vue';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';
export type AnalyticsTab = 'attendance' | 'churn' | 'revenue';

export interface MemberEvent {
  memberId: number;
  name: string;
  cedula: string;
  photoPath: string | null;
  planName: string;
  eventDate: string;
  eventType: 'renewal' | 'cancellation';
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

export const useAnalytics = () => {
  const selectedPeriod = ref<AnalyticsPeriod>('30d');
  const attendancePeriod = ref<AnalyticsPeriod>('30d');
  const churnPeriod = ref<AnalyticsPeriod>('30d');
  const revenuePeriod = ref<AnalyticsPeriod>('30d');
  const activeTab = ref<AnalyticsTab>('attendance');
  const loading = ref(false);
  const recordingAttendance = ref(false);
  const deletingAttendance = ref(false);
  const error = ref<string | null>(null);

  const data = ref<AnalyticsData | null>(null);
  const attendanceHistory = ref<any[]>([]);

  const fetchAnalytics = async () => {
    loading.value = true;
    error.value = null;
    try {
      const url = `/api/analytics/stats?attendancePeriod=${attendancePeriod.value}&churnPeriod=${churnPeriod.value}&revenuePeriod=${revenuePeriod.value}&period=${selectedPeriod.value}`;
      const res = await $fetch<any>(url);
      if (res.success) {
        data.value = res.data;
      } else {
        error.value = res.error;
      }
    } catch (err: any) {
      error.value = err?.message || 'Error al cargar métricas de análisis';
    } finally {
      loading.value = false;
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const res = await $fetch<any>('/api/attendance?limit=30');
      if (res.success) {
        attendanceHistory.value = res.data.history || [];
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err);
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
        await Promise.all([fetchAnalytics(), fetchAttendanceHistory()]);
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      recordingAttendance.value = false;
    }
  };

  const deleteAttendanceById = async (id: number) => {
    deletingAttendance.value = true;
    try {
      const res = await $fetch<any>(`/api/attendance/${id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        await Promise.all([fetchAnalytics(), fetchAttendanceHistory()]);
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      deletingAttendance.value = false;
    }
  };

  const deleteLatestAttendance = async () => {
    deletingAttendance.value = true;
    try {
      const res = await $fetch<any>('/api/attendance/latest', {
        method: 'DELETE',
      });
      if (res.success) {
        await Promise.all([fetchAnalytics(), fetchAttendanceHistory()]);
        return { success: true, deletedId: res.deletedId };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      deletingAttendance.value = false;
    }
  };

  watch([selectedPeriod, attendancePeriod, churnPeriod, revenuePeriod], () => {
    fetchAnalytics();
  });

  return {
    selectedPeriod,
    attendancePeriod,
    churnPeriod,
    revenuePeriod,
    activeTab,
    loading,
    recordingAttendance,
    deletingAttendance,
    error,
    data,
    attendanceHistory,
    fetchAnalytics,
    fetchAttendanceHistory,
    recordQuickAttendance,
    deleteAttendanceById,
    deleteLatestAttendance,
  };
};
