import { ref, computed } from 'vue';

export const usePlans = () => {
  const plans = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchPlans = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<any>('/api/plans');
      if (response.success) {
        plans.value = response.data;
      } else {
        error.value = response.error;
      }
    } catch (err: any) {
      error.value = err.message || 'Error al cargar los planes';
    } finally {
      loading.value = false;
    }
  };

  const createPlan = async (data: any) => {
    try {
      const response = await $fetch<any>('/api/plans', {
        method: 'POST',
        body: data
      });
      if (response.success) {
        await fetchPlans(); // Refresh
        return { success: true };
      }
      return { success: false, error: response.error || 'Error desconocido' };
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Error del servidor';
      return { success: false, error: msg };
    }
  };

  const updatePlan = async (id: number, data: any) => {
    try {
      const response = await $fetch<any>(`/api/plans/${id}`, {
        method: 'PUT',
        body: data
      });
      if (response.success) {
        await fetchPlans();
        return { success: true };
      }
      return { success: false, error: response.error || 'Error desconocido' };
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Error del servidor';
      return { success: false, error: msg };
    }
  };

  const archivePlan = async (id: number) => {
    try {
      const response = await $fetch<any>(`/api/plans/${id}`, {
        method: 'DELETE'
      });
      if (response.success) {
        await fetchPlans();
        return { success: true };
      }
      return { success: false, error: response.error || 'Error desconocido' };
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Error del servidor';
      return { success: false, error: msg };
    }
  };

  const fetchPlanDetail = async (slugOrId: string | number) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<any>(`/api/plans/${slugOrId}`);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Error al cargar detalle del plan' };
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Error del servidor';
      return { success: false, error: msg };
    } finally {
      loading.value = false;
    }
  };

  const moveMember = async (memberId: number, targetPlanId: number) => {
    try {
      const response = await $fetch<any>('/api/plans/move-member', {
        method: 'POST',
        body: { memberId, targetPlanId }
      });
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'No se pudo mover el miembro' };
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Error del servidor';
      return { success: false, error: msg };
    }
  };

  return {
    plans,
    loading,
    error,
    fetchPlans,
    fetchPlanDetail,
    createPlan,
    updatePlan,
    archivePlan,
    moveMember
  };
};
