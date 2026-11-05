import { ref } from 'vue';
import type { CashSession, CashMovement, CashKpis } from '../types';

export const useCashRegister = () => {
  const isSessionOpen = ref(false);
  const currentSession = ref<CashSession | null>(null);
  const kpis = ref<CashKpis>({
    openingBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    cashIncome: 0,
    cashExpenses: 0,
    expectedCashInDrawer: 0,
    transferIncome: 0,
    transferExpenses: 0,
    netTransfer: 0,
    membershipIncome: 0,
    productIncome: 0,
    sporadicIncome: 0,
  });

  const period = ref<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const customDateRange = ref<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: '',
  });
  const periodSummary = ref<any>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    membershipTotal: 0,
    productTotal: 0,
    sporadicTotal: 0,
  });
  const movements = ref<CashMovement[]>([]);
  const history = ref<CashSession[]>([]);

  const loading = ref(false);
  const movementsLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchSession = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await $fetch<any>('/api/cash/session');
      if (res.success) {
        isSessionOpen.value = res.data.isOpen;
        currentSession.value = res.data.session;
        kpis.value = res.data.kpis;
      }
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || 'Error al cargar sesión de caja';
    } finally {
      loading.value = false;
    }
  };

  const fetchMovements = async () => {
    movementsLoading.value = true;
    try {
      let url = `/api/cash/movements?period=${period.value}`;
      if (period.value === 'custom') {
        if (customDateRange.value.startDate) {
          url += `&startDate=${encodeURIComponent(customDateRange.value.startDate)}`;
        }
        if (customDateRange.value.endDate) {
          url += `&endDate=${encodeURIComponent(customDateRange.value.endDate)}`;
        }
      }
      const res = await $fetch<any>(url);
      if (res.success) {
        movements.value = res.data.movements;
        periodSummary.value = res.data.summary;
      }
    } catch (err: any) {
      console.error('Error loading movements:', err);
    } finally {
      movementsLoading.value = false;
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await $fetch<any>('/api/cash/history');
      if (res.success) {
        history.value = res.data;
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const openCashRegister = async (openingBalance: number, notes?: string) => {
    try {
      const res = await $fetch<any>('/api/cash/open', {
        method: 'POST',
        body: { openingBalance, notes },
      });
      if (res.success) {
        await fetchSession();
        await fetchMovements();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error del servidor' };
    }
  };

  const closeCashRegister = async (id: number, countedCash: number, notes?: string) => {
    try {
      const res = await $fetch<any>('/api/cash/close', {
        method: 'POST',
        body: { id, countedCash, notes },
      });
      if (res.success) {
        await fetchSession();
        await fetchMovements();
        await fetchHistory();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error del servidor' };
    }
  };

  const recordSale = async (data: any) => {
    try {
      const res = await $fetch<any>('/api/cash/sale', {
        method: 'POST',
        body: data,
      });
      if (res.success) {
        await fetchSession();
        await fetchMovements();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error del servidor' };
    }
  };

  const recordPurchase = async (data: any) => {
    try {
      const res = await $fetch<any>('/api/cash/purchase', {
        method: 'POST',
        body: data,
      });
      if (res.success) {
        await fetchSession();
        await fetchMovements();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error del servidor' };
    }
  };

  const recordSporadic = async (data: any) => {
    try {
      const res = await $fetch<any>('/api/cash/sporadic', {
        method: 'POST',
        body: data,
      });
      if (res.success) {
        await fetchSession();
        await fetchMovements();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error del servidor' };
    }
  };

  const recordExpense = async (data: any) => {
    try {
      const res = await $fetch<any>('/api/cash/expense', {
        method: 'POST',
        body: data,
      });
      if (res.success) {
        await fetchSession();
        await fetchMovements();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error del servidor' };
    }
  };

  const recordBatchMovements = async (payload: {
    items: Array<{
      type: 'product' | 'sporadic' | 'expense';
      sign?: '+' | '-';
      productId?: number;
      concept: string;
      amount: number;
      quantity?: number;
      unitPrice?: number;
    }>;
    paymentMethod: 'cash' | 'transfer';
    customerName?: string;
    notes?: string;
  }) => {
    try {
      if (!payload.items || payload.items.length === 0) {
        return { success: false, error: 'No hay partidas agregadas al movimiento' };
      }

      // 1. Process Product Sales (type product & sign '+')
      const productSaleLines = payload.items.filter((i) => i.type === 'product' && i.productId && i.sign !== '-');
      if (productSaleLines.length > 0) {
        const salePayload = {
          items: productSaleLines.map((p) => ({
            productId: p.productId!,
            quantity: p.quantity || 1,
          })),
          paymentMethod: payload.paymentMethod,
          customerName: payload.customerName || 'Cliente General',
          notes: payload.notes || undefined,
        };
        const saleRes = await $fetch<any>('/api/cash/sale', {
          method: 'POST',
          body: salePayload,
        });
        if (!saleRes.success) {
          throw new Error(saleRes.error || 'Error al procesar la venta de productos');
        }
      }

      // 2. Process Product Purchases (type product & sign '-')
      const productPurchaseLines = payload.items.filter((i) => i.type === 'product' && i.productId && i.sign === '-');
      if (productPurchaseLines.length > 0) {
        const purchasePayload = {
          items: productPurchaseLines.map((p) => ({
            productId: p.productId!,
            quantity: p.quantity || 1,
            unitPrice: p.unitPrice,
          })),
          paymentMethod: payload.paymentMethod,
          customerName: payload.customerName || 'Proveedor',
          notes: payload.notes || undefined,
        };
        const purchaseRes = await $fetch<any>('/api/cash/purchase', {
          method: 'POST',
          body: purchasePayload,
        });
        if (!purchaseRes.success) {
          throw new Error(purchaseRes.error || 'Error al procesar la compra de productos');
        }
      }

      // 3. Process Sporadic / Service Income lines
      const sporadicLines = payload.items.filter((i) => i.type === 'sporadic');
      for (const sp of sporadicLines) {
        const spRes = await $fetch<any>('/api/cash/sporadic', {
          method: 'POST',
          body: {
            concept: sp.concept,
            amount: sp.amount,
            paymentMethod: payload.paymentMethod,
            customerName: payload.customerName || 'Cliente Ocasional',
            notes: payload.notes || undefined,
          },
        });
        if (!spRes.success) {
          throw new Error(spRes.error || `Error al procesar ingreso: ${sp.concept}`);
        }
      }

      // 4. Process Expense lines
      const expenseLines = payload.items.filter((i) => i.type === 'expense');
      for (const ex of expenseLines) {
        const exRes = await $fetch<any>('/api/cash/expense', {
          method: 'POST',
          body: {
            concept: ex.concept,
            amount: ex.amount,
            paymentMethod: payload.paymentMethod,
            notes: payload.notes || undefined,
          },
        });
        if (!exRes.success) {
          throw new Error(exRes.error || `Error al procesar egreso: ${ex.concept}`);
        }
      }

      await fetchSession();
      await fetchMovements();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error al procesar el registro' };
    }
  };

  const deleteMovement = async (id: number) => {
    try {
      const res = await $fetch<any>(`/api/cash/movement/${id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        await fetchSession();
        await fetchMovements();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error al eliminar movimiento' };
    }
  };

  const updateMovement = async (id: number, data: any) => {
    try {
      const res = await $fetch<any>(`/api/cash/movement/${id}`, {
        method: 'PUT',
        body: data,
      });
      if (res.success) {
        await fetchSession();
        await fetchMovements();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error al actualizar movimiento' };
    }
  };

  return {
    isSessionOpen,
    currentSession,
    kpis,
    period,
    customDateRange,
    periodSummary,
    movements,
    history,
    loading,
    movementsLoading,
    error,
    fetchSession,
    fetchMovements,
    fetchHistory,
    openCashRegister,
    closeCashRegister,
    recordSale,
    recordPurchase,
    recordSporadic,
    recordExpense,
    recordBatchMovements,
    deleteMovement,
    updateMovement,
  };
};
