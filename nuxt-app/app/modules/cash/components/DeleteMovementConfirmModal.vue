<template>
  <AppModal
    :is-open="isOpen"
    title="Anular Movimiento"
    subtitle="Esta acción eliminará el registro de la caja activa."
    :icon="AlertTriangle"
    max-width="max-w-md"
    @close="emit('close')"
    @dismiss="emit('close')"
  >
    <div v-if="movement" class="flex flex-col gap-4">
      <!-- Movement Info Card -->
      <div class="p-3.5 bg-surface-2 border border-border rounded-xl flex items-center justify-between">
        <div class="min-w-0 pr-2">
          <span class="text-xs font-bold uppercase tracking-wider text-muted block">
            {{ movement.concept }}
          </span>
          <span class="text-xs text-text/70 mt-0.5 block font-mono">
            {{ formatDateTime(movement.createdAt) }} · {{ movement.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia' }}
          </span>
        </div>

        <span 
          :class="[
            'font-display font-bold text-lg shrink-0',
            movement.type === 'income' ? 'text-success' : 'text-danger'
          ]"
        >
          {{ movement.type === 'income' ? '+' : '-' }}${{ formatCurrency(movement.amount) }}
        </span>
      </div>

      <!-- Impact Notice -->
      <div class="p-3 rounded-xl bg-danger/10 border border-danger/25 flex items-start gap-2.5 text-xs text-text/90">
        <AlertCircle class="w-4 h-4 text-danger shrink-0 mt-0.5" />
        <div class="flex flex-col gap-1">
          <span class="font-bold text-danger">Consecuencias de la anulación:</span>
          <p v-if="movement.category === 'product'">
            El stock de los productos vendidos se reintegrará automáticamente al inventario físico.
          </p>
          <p>
            El saldo esperado de la caja se recalculará de inmediato para reflejar este ajuste.
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="emit('close')"
          class="flex-1 py-2.5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          Conservar
        </button>

        <button
          type="button"
          @click="handleConfirm"
          :disabled="submitting"
          class="flex-1 py-2.5 rounded-xl bg-danger text-white border border-danger hover:bg-danger/90 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
        >
          <span v-if="submitting" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
          <span v-else>Sí, Anular Movimiento</span>
        </button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { AlertTriangle, AlertCircle } from 'lucide-vue-next';
import AppModal from '~/ui/components/AppModal.vue';

const props = defineProps<{
  isOpen: boolean;
  movement: any | null;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', id: number): void;
}>();

const handleConfirm = () => {
  if (props.movement) {
    emit('confirm', props.movement.id);
  }
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val || 0);
};

const formatDateTime = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};
</script>
