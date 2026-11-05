<template>
  <AppModal
    :is-open="isOpen"
    title="Editar Movimiento"
    :subtitle="movementSubtitle"
    :icon="Pencil"
    max-width="max-w-lg"
    @close="emit('close')"
    @dismiss="emit('close')"
  >
    <form v-if="movement" @submit.prevent="handleSubmit" class="flex flex-col gap-4">
      <!-- Movement Type & Amount Badge Header -->
      <div class="p-3 bg-surface-2 border border-border rounded-xl flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div 
            :class="[
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
              movement.type === 'income' 
                ? 'bg-success/15 border-success/30 text-success' 
                : 'bg-danger/15 border-danger/30 text-danger'
            ]"
          >
            <ShoppingBag v-if="movement.category === 'product'" class="w-4 h-4 text-accent" />
            <Users v-else-if="movement.category === 'membership'" class="w-4 h-4 text-info" />
            <Ticket v-else-if="movement.category === 'sporadic'" class="w-4 h-4 text-warning" />
            <TrendingDown v-else class="w-4 h-4 text-danger" />
          </div>
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-muted block">
              {{ categoryLabel }}
            </span>
            <span class="text-xs text-text/80 font-mono">
              Registrado: {{ formatDateTime(movement.createdAt) }}
            </span>
          </div>
        </div>

        <div class="text-right">
          <span 
            :class="[
              'font-display font-bold text-lg sm:text-xl leading-tight',
              movement.type === 'income' ? 'text-success' : 'text-danger'
            ]"
          >
            {{ movement.type === 'income' ? '+' : '-' }}${{ formatCurrency(form.amount || 0) }}
          </span>
        </div>
      </div>

      <!-- Concept Field -->
      <div>
        <AppInput
          v-if="movement.category !== 'product'"
          v-model="form.concept"
          label="Concepto"
          placeholder="Ej: Compra de bombillo, Pase diario..."
          required
        />
        <div v-else class="flex flex-col gap-1">
          <label class="text-xs font-semibold text-muted uppercase tracking-wider">Concepto (Venta de Productos)</label>
          <div class="p-2.5 bg-surface-2 border border-border rounded-xl text-xs sm:text-sm text-text font-medium">
            {{ form.concept }}
          </div>
          <span class="text-[11px] text-muted">
            Los productos de una venta no son editables directamente para mantener la integridad del inventario.
          </span>
        </div>
      </div>

      <!-- Amount Field (Only for non-products) -->
      <div v-if="movement.category !== 'product'">
        <AppInput
          v-model="form.amount"
          type="number"
          min="1"
          mono
          label="Monto ($)"
          placeholder="0"
          required
        />
      </div>

      <!-- Payment Method -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-muted uppercase tracking-wider">Método de Pago</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            @click="form.paymentMethod = 'cash'"
            :class="[
              'py-2.5 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center',
              form.paymentMethod === 'cash' 
                ? 'bg-accent text-white border-accent shadow-xs' 
                : 'bg-surface-2 border-border text-muted hover:text-text'
            ]"
          >
            Efectivo
          </button>
          <button
            type="button"
            @click="form.paymentMethod = 'transfer'"
            :class="[
              'py-2.5 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center',
              form.paymentMethod === 'transfer' 
                ? 'bg-accent text-white border-accent shadow-xs' 
                : 'bg-surface-2 border-border text-muted hover:text-text'
            ]"
          >
            Transferencia
          </button>
        </div>
      </div>

      <!-- Customer Name Field -->
      <div>
        <AppInput
          v-model="form.customerName"
          label="Cliente / Tercero (Opcional)"
          placeholder="Ej: Carlos Gómez / Proveedor..."
        />
      </div>

      <!-- Notes Field -->
      <div>
        <AppInput
          v-model="form.notes"
          label="Observaciones (Opcional)"
          placeholder="Notas internas..."
        />
      </div>
    </form>

    <template #footer>
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="emit('close')"
          class="flex-1 py-2.5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          Cancelar
        </button>

        <button
          type="button"
          @click="handleSubmit"
          :disabled="submitting || !isFormValid"
          class="flex-1 py-2.5 rounded-xl bg-accent text-white border border-accent hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
        >
          <span v-if="submitting" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
          <span v-else>Guardar Cambios</span>
        </button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Pencil, ShoppingBag, Users, Ticket, TrendingDown } from 'lucide-vue-next';
import AppModal from '~/ui/components/AppModal.vue';
import AppInput from '~/ui/components/AppInput.vue';

const props = defineProps<{
  isOpen: boolean;
  movement: any | null;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: {
    id: number;
    concept?: string;
    amount?: number;
    paymentMethod: 'cash' | 'transfer';
    customerName?: string;
    notes?: string;
  }): void;
}>();

const form = ref({
  concept: '',
  amount: 0,
  paymentMethod: 'cash' as 'cash' | 'transfer',
  customerName: '',
  notes: '',
});

watch(
  () => props.movement,
  (m) => {
    if (m) {
      form.value = {
        concept: m.concept || '',
        amount: Number(m.amount) || 0,
        paymentMethod: m.paymentMethod === 'transfer' ? 'transfer' : 'cash',
        customerName: m.customerName || '',
        notes: m.notes || '',
      };
    }
  },
  { immediate: true }
);

const movementSubtitle = computed(() => {
  if (!props.movement) return '';
  return `Modifica los datos del movimiento #${props.movement.id}`;
});

const categoryLabel = computed(() => {
  if (!props.movement) return '';
  switch (props.movement.category) {
    case 'product':
      return 'Venta de Productos';
    case 'membership':
      return 'Membresía / Plan';
    case 'sporadic':
      return 'Ingreso de Servicio';
    case 'expense':
      return 'Egreso / Gasto';
    default:
      return 'Movimiento';
  }
});

const isFormValid = computed(() => {
  if (!props.movement) return false;
  if (props.movement.category !== 'product') {
    return form.value.concept.trim().length > 0 && form.value.amount > 0;
  }
  return true;
});

const handleSubmit = () => {
  if (!props.movement || !isFormValid.value) return;

  emit('submit', {
    id: props.movement.id,
    concept: form.value.concept.trim(),
    amount: Number(form.value.amount),
    paymentMethod: form.value.paymentMethod,
    customerName: form.value.customerName.trim() || undefined,
    notes: form.value.notes.trim() || undefined,
  });
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
