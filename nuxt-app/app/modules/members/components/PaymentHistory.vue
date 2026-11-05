<template>
  <div v-if="payments.length === 0" class="text-center py-4">
    <p class="text-muted text-xs">No hay historial de pagos.</p>
  </div>
  <div v-else class="flex flex-col gap-2">
    <div 
      v-for="pay in payments.slice(0, 5)" 
      :key="pay.id" 
      :class="[
        'flex items-center justify-between p-3 border border-border bg-surface-2 rounded-sm select-none',
        isTransfer(pay) ? 'cursor-pointer hover:border-accent/60 hover:bg-surface-2/90 active:scale-[0.99] transition-all group' : ''
      ]"
      @click="isTransfer(pay) ? openReceipt(pay) : null"
      :title="isTransfer(pay) ? 'Clic para ver comprobante de transferencia' : undefined"
    >
      <div class="flex flex-col">
        <span class="text-text font-bold text-sm group-hover:text-accent transition-colors">${{ formatCurrency(pay.amount) }}</span>
        <span class="text-muted text-[10px] font-mono uppercase">
          {{ formatDate(pay.paidAt) }} • {{ getMethodLabel(pay.method) }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <div 
          v-if="isTransfer(pay)" 
          class="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-accent/30 bg-accent/10 text-accent font-bold uppercase tracking-wider"
        >
          <Receipt class="w-3 h-3" />
          <span>Comprobante</span>
        </div>
        <div v-else-if="pay.notes" class="text-muted text-xs truncate max-w-[100px]" :title="pay.notes">
          {{ pay.notes }}
        </div>
      </div>
    </div>
  </div>

  <!-- Receipt Viewer Modal -->
  <PaymentReceiptModal
    :is-open="isReceiptModalOpen"
    :payment="selectedPayment"
    @close="isReceiptModalOpen = false"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Receipt } from 'lucide-vue-next';
import type { Payment } from '../types';
import PaymentReceiptModal from './PaymentReceiptModal.vue';

defineProps<{
  payments: Payment[];
}>();

const isReceiptModalOpen = ref(false);
const selectedPayment = ref<Payment | null>(null);

const isTransfer = (pay: Payment) => {
  return pay.method === 'transfer' || Boolean(pay.receiptPath);
};

const openReceipt = (pay: Payment) => {
  selectedPayment.value = pay;
  isReceiptModalOpen.value = true;
};

const getMethodLabel = (method: string) => {
  if (method === 'transfer') return 'Transferencia';
  if (method === 'card') return 'Tarjeta';
  return 'Efectivo';
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: '2-digit' });
};
</script>
<style scoped>
@reference "~/assets/css/main.css";
</style>
