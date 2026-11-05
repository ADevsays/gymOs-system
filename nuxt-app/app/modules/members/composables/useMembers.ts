import { ref, computed } from 'vue';
import type { MemberListItem, MemberDetail } from '../types';

export interface UpcomingBirthdayMember {
  id: number;
  firstName: string;
  lastName: string;
  photoPath?: string | null;
  cedula: string;
  birthDate: string;
  birthdayDate: string;
  daysUntil: number;
}

const allMembers = ref<MemberListItem[]>([]);
const members = ref<MemberListItem[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(true);
const totalMembersCount = ref(0);
const currentSearchQuery = ref('');
const error = ref<string | null>(null);

const upcomingMembers = ref<MemberListItem[]>([]);
const loadingUpcoming = ref(false);
const upcomingBirthdays = ref<UpcomingBirthdayMember[]>([]);
const loadingBirthdays = ref(false);

export const useMembers = () => {
  const fetchMembers = async (searchQuery: string = '', reset: boolean = true) => {
    if (reset) {
      loading.value = true;
      members.value = [];
      hasMore.value = true;
    }
    error.value = null;
    currentSearchQuery.value = searchQuery;

    try {
      const data = await $fetch<{ success: boolean, data: MemberListItem[], total: number, hasMore: boolean, error?: string }>('/api/members', {
        query: {
          q: searchQuery,
          limit: 25,
          offset: 0
        }
      });

      if (data?.success) {
        members.value = data.data;
        allMembers.value = [...data.data];
        hasMore.value = Boolean(data.hasMore);
        totalMembersCount.value = data.total || data.data.length;
      } else {
        error.value = data?.error || 'Error fetching members';
      }
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const loadMore = async () => {
    if (!hasMore.value || loading.value || loadingMore.value) return;
    loadingMore.value = true;

    try {
      const currentOffset = members.value.length;
      const data = await $fetch<{ success: boolean, data: MemberListItem[], total: number, hasMore: boolean, error?: string }>('/api/members', {
        query: {
          q: currentSearchQuery.value,
          limit: 25,
          offset: currentOffset
        }
      });

      if (data?.success && data.data.length > 0) {
        const existingIds = new Set(members.value.map(m => m.id));
        const newItems = data.data.filter(m => !existingIds.has(m.id));
        members.value = [...members.value, ...newItems];
        allMembers.value = [...allMembers.value, ...newItems];
        hasMore.value = Boolean(data.hasMore);
        totalMembersCount.value = data.total;
      } else {
        hasMore.value = false;
      }
    } catch (err: any) {
      console.error('Error loading more members:', err);
    } finally {
      loadingMore.value = false;
    }
  };

  const fetchUpcomingMembers = async () => {
    loadingUpcoming.value = true;
    try {
      const res = await $fetch<{ success: boolean, data: MemberListItem[] }>('/api/members/upcoming');
      if (res?.success) {
        upcomingMembers.value = res.data;
      }
    } catch (e) {
      console.error('Error fetching upcoming members:', e);
    } finally {
      loadingUpcoming.value = false;
    }
  };

  const fetchUpcomingBirthdays = async () => {
    loadingBirthdays.value = true;
    try {
      const res = await $fetch<{ success: boolean, data: UpcomingBirthdayMember[] }>('/api/members/birthdays');
      if (res?.success) {
        upcomingBirthdays.value = res.data;
      }
    } catch (e) {
      console.error('Error fetching upcoming birthdays:', e);
    } finally {
      loadingBirthdays.value = false;
    }
  };

  const getMemberDetails = async (id: number): Promise<MemberDetail | null> => {
    try {
      const data = await $fetch<{ success: boolean, data: MemberDetail, error?: string }>(`/api/members/${id}`);
      if (data?.success) {
        return data.data;
      }
      console.error(data?.error);
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const archiveMember = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await $fetch<{ success: boolean; error?: string }>(`/api/members/${id}`, {
        method: 'DELETE',
      });
      if (data?.success) {
        members.value = members.value.filter((m) => m.id !== id);
        allMembers.value = allMembers.value.filter((m) => m.id !== id);
        totalMembersCount.value = Math.max(0, totalMembersCount.value - 1);
        await fetchUpcomingMembers();
        return { success: true };
      }
      return { success: false, error: data?.error || 'Error al archivar el socio' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const refundSubscription = async (
    id: number,
    payload: { amount: number; paymentMethod: 'cash' | 'transfer'; reason?: string }
  ): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      const data = await $fetch<{ success: boolean; data?: any; error?: string }>(`/api/members/${id}/refund`, {
        method: 'POST',
        body: payload,
      });
      if (data?.success) {
        await fetchUpcomingMembers();
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const activeMembersCount = computed(() => (allMembers.value.length > 0 ? allMembers.value : members.value).filter(m => m.activeSubscription?.status === 'active').length);

  return {
    allMembers,
    members,
    loading,
    loadingMore,
    hasMore,
    totalMembersCount,
    error,
    fetchMembers,
    loadMore,
    upcomingMembers,
    loadingUpcoming,
    fetchUpcomingMembers,
    upcomingBirthdays,
    loadingBirthdays,
    fetchUpcomingBirthdays,
    getMemberDetails,
    archiveMember,
    refundSubscription,
    activeMembersCount
  };
};
