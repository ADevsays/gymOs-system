<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-reveal"
    @click.self="$emit('close')"
  >
    <div class="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
      <div class="flex items-center justify-between border-b border-border/40 pb-3">
        <div class="flex items-center gap-2">
          <Ticket class="w-5 h-5 text-accent" />
          <h3 class="font-display font-bold text-lg text-text uppercase">Cobro Esporádico / No Miembro</h3>
        </div>
        <button @click="$emit('close')" class="text-muted hover:text-text cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Quick Preset Concepts -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-muted uppercase">Conceptos Frecuentes</label>
          <div class="grid grid-cols-2 gap-1.5">
            <button 
              type="button"
              v-for="preset in presets"
              :key="preset.concept"
              @click="applyPreset(preset)"
              class="p-2.5 rounded-xl bg-surface-2 border border-border hover:border-accent text-left transition-colors cursor-pointer"
            >
              <span class="block text-xs lg:text-sm font-medium text-text truncate">{{ preset.concept }}</span>
              <span class="block text-xs font-mono text-accent font-bold">${{ formatCurrency(preset.amount) }}</span>
            </button>
          </div>
        </div>

        <!-- Custom Concept -->
        <AppInput
          v-model="concept"
          required
          label="Concepto del Cobro"
          placeholder="Ej: Día de gimnasio (Pase libre)"
        />

        <!-- Amount -->
        <AppInput
          v-model="amount"
          type="number"
          min="0"
          required
          mono
          label="Valor a Cobrar ($)"
          placeholder="0"
        />

        <!-- Customer Name -->
        <AppInput
          v-model="customerName"
          label="Nombre del Cliente (Opcional)"
          placeholder="Ej: Carlos Gómez"
        />

        <!-- Payment Method -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold text-muted uppercase">Método de Pago</label>
          <div class="grid grid-cols-2 gap-2">
            <button 
              type="button"
              @click="paymentMethod = 'cash'"
              :class="[
                'py-2.5 px-3 rounded-xl border text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer text-center',
                paymentMethod === 'cash' ? 'bg-accent text-white border-accent' : 'bg-surface-2 border-border text-muted hover:text-text'
              ]"
            >
              Efectivo
            </button>
            <button 
              type="button"
              @click="paymentMethod = 'transfer'"
              :class="[
                'py-2.5 px-3 rounded-xl border text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer text-center',
                paymentMethod === 'transfer' ? 'bg-accent text-white border-accent' : 'bg-surface-2 border-border text-muted hover:text-text'
              ]"
            >
              Transferencia
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2">
          <button 
            type="button" 
            @click="$emit('close')"
            class="flex-1 py-2.5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs lg:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            :disabled="!concept || !amount || submitting"
            class="flex-1 py-2.5 rounded-xl bg-accent text-white border border-accent hover:bg-accent-soft disabled:opacity-50 text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span v-if="submitting" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
            <span v-else>Registrar Ingreso</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Ticket, X } from 'lucide-vue-next';

defineProps<{
  isOpen: boolean;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: any): void;
}>();

const presets = [
  { concept: 'Día de Gimnasio (Pase Diario)', amount: 10000 },
  { concept: 'Entrenamiento Libre No Miembro', amount: 12000 },
  { concept: 'Clase Grupal Individual', amount: 15000 },
  { concept: 'Alquiler Toalla / Casillero', amount: 3000 },
];

const concept = ref('');
const amount = ref<number | null>(null);
const customerName = ref('');
const paymentMethod = ref<'cash' | 'transfer'>('cash');

const applyPreset = (p: any) => {
  concept.value = p.concept;
  amount.value = p.amount;
};

const handleSubmit = () => {
  if (!concept.value || !amount.value) return;

  emit('submit', {
    concept: concept.value,
    amount: Number(amount.value),
    paymentMethod: paymentMethod.value,
    customerName: customerName.value.trim() || 'Cliente Ocasional',
  });

  concept.value = '';
  amount.value = null;
  customerName.value = '';
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val || 0);
};
</script>
