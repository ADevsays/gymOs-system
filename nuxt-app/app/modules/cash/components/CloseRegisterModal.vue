<template>
  <AppModal
    :is-open="isOpen"
    title="Cierre Diario de Caja"
    :icon="Lock"
    max-width="max-w-2xl"
    @close="handleClose"
    @dismiss="handleDismiss"
  >
    <div class="flex flex-col gap-4">
      <!-- Dual Reconciliation Grid: Cash and Transfers in separate panels -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <!-- Panel 1: Efectivo Físico en Cajón -->
        <div class="bg-surface-2 border border-border rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
          <div class="flex items-center justify-between border-b border-border/50 pb-2">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-lg bg-surface flex items-center justify-center text-accent border border-border">
                <Banknote class="w-3.5 h-3.5" />
              </div>
              <span class="text-xs font-bold text-text uppercase tracking-wider">Efectivo en Cajón</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5 text-xs">
            <div class="flex justify-between items-center py-0.5">
              <span class="text-muted">Saldo Base Inicial:</span>
              <span class="font-mono font-medium text-text">${{ formatCurrency(openingBalance) }}</span>
            </div>
            <div class="flex justify-between items-center py-0.5">
              <span class="text-muted">(+) Ingresos Efectivo:</span>
              <span class="font-mono font-medium text-success">+${{ formatCurrency(cashIncome) }}</span>
            </div>
            <div class="flex justify-between items-center py-0.5">
              <span class="text-muted">(-) Egresos Efectivo:</span>
              <span class="font-mono font-medium text-danger">-${{ formatCurrency(cashExpenses) }}</span>
            </div>
          </div>

          <div class="pt-2 border-t border-border/50 flex justify-between items-center bg-surface/60 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
            <span class="font-bold text-xs text-text">Efectivo Esperado:</span>
            <span class="font-display font-bold text-base text-accent">${{ formatCurrency(expectedCash) }}</span>
          </div>
        </div>

        <!-- Panel 2: Transferencias Bancarias -->
        <div class="bg-surface-2 border border-border rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
          <div class="flex items-center justify-between border-b border-border/50 pb-2">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-lg bg-surface flex items-center justify-center text-accent border border-border">
                <ArrowLeftRight class="w-3.5 h-3.5" />
              </div>
              <span class="text-xs font-bold text-text uppercase tracking-wider">Transferencias</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5 text-xs">
            <div class="flex justify-between items-center py-0.5">
              <span class="text-muted">(+) Ingresos Bancos:</span>
              <span class="font-mono font-medium text-success">+${{ formatCurrency(transferIncome) }}</span>
            </div>
            <div class="flex justify-between items-center py-0.5">
              <span class="text-muted">(-) Egresos Bancos:</span>
              <span class="font-mono font-medium text-danger">-${{ formatCurrency(transferExpenses) }}</span>
            </div>
            <div class="flex justify-between items-center py-0.5 text-muted opacity-60">
              <span>Conciliación Digital:</span>
              <span class="font-mono">Automática</span>
            </div>
          </div>

          <div class="pt-2 border-t border-border/50 flex justify-between items-center bg-surface/60 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
            <span class="font-bold text-xs text-text">Neto Transferencias:</span>
            <span class="font-display font-bold text-base text-text">${{ formatCurrency(netTransfer) }}</span>
          </div>
        </div>
      </div>

      <!-- Physical Cash Counting and Balance Section -->
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-3.5">
        <div class="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
          <AppInput
            v-model="countedCash"
            type="number"
            min="0"
            required
            mono
            label="Efectivo Real Contado en Cajón ($)"
            placeholder="Ingresa el monto contado físicamente..."
          />

          <!-- Live Difference Result (Only shown when user entered a value) -->
          <div 
            v-if="hasCountedCash"
            :class="[
              'p-3 rounded-xl border text-xs lg:text-sm flex items-center justify-between transition-all',
              difference === 0 ? 'bg-success/15 border-success/30 text-success' :
              difference > 0 ? 'bg-accent/15 border-accent/30 text-accent' :
              'bg-danger/15 border-danger/30 text-danger'
            ]"
          >
            <div class="flex items-center gap-2">
              <CheckCircle v-if="difference === 0" class="w-4 h-4" />
              <AlertCircle v-else class="w-4 h-4" />
              <span class="font-bold uppercase tracking-wider">
                {{ difference === 0 ? 'Caja Cuadrada Exacta' : difference > 0 ? 'Sobrante de Efectivo' : 'Faltante de Efectivo' }}
              </span>
            </div>
            <span class="font-mono font-bold text-sm lg:text-base">
              {{ difference > 0 ? '+' : '' }}${{ formatCurrency(difference) }}
            </span>
          </div>
        </div>

        <!-- Notes -->
        <AppInput
          v-model="notes"
          type="textarea"
          :rows="2"
          label="Observaciones del Cierre"
          placeholder="Novedades del turno, justificación de sobrante/faltante..."
        />

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-1">
          <button 
            type="button" 
            @click="handleDismiss"
            class="flex-1 py-2.5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs lg:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            :disabled="closing || countedCash === null"
            class="flex-1 py-2.5 rounded-xl bg-accent text-white border border-accent hover:bg-accent-soft disabled:opacity-50 text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <span v-if="closing" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
            <span v-else>Confirmar Cierre</span>
          </button>
        </div>
      </form>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Lock, CheckCircle, AlertCircle, Banknote, ArrowLeftRight } from 'lucide-vue-next';
import AppModal from '~/ui/components/AppModal.vue';

const props = defineProps<{
  isOpen: boolean;
  openingBalance: number;
  expectedCash: number;
  cashIncome: number;
  cashExpenses: number;
  transferIncome?: number;
  transferExpenses?: number;
  netTransfer?: number;
  closing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: { countedCash: number; notes: string }): void;
}>();

const countedCash = ref<number | null>(null);
const notes = ref('');

const transferIncome = computed(() => props.transferIncome || 0);
const transferExpenses = computed(() => props.transferExpenses || 0);
const netTransfer = computed(() => props.netTransfer !== undefined ? props.netTransfer : (transferIncome.value - transferExpenses.value));

const hasCountedCash = computed(() => {
  return countedCash.value !== null && countedCash.value !== undefined && String(countedCash.value).trim() !== '';
});

const difference = computed(() => {
  if (!hasCountedCash.value) return 0;
  return Number(countedCash.value) - props.expectedCash;
});

// Backdrop click: close without destroying draft
const handleClose = () => {
  emit('close');
};

// Explicit dismiss via 'X' or Cancel: reset draft and close
const handleDismiss = () => {
  countedCash.value = null;
  notes.value = '';
  emit('close');
};

const handleSubmit = () => {
  if (countedCash.value === null) return;
  emit('submit', {
    countedCash: Number(countedCash.value),
    notes: notes.value,
  });
  countedCash.value = null;
  notes.value = '';
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val || 0);
};
</script>
