<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-reveal"
    @click.self="$emit('close')"
  >
    <div class="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
      <div class="flex items-center justify-between border-b border-border/40 pb-3">
        <div class="flex items-center gap-2">
          <TrendingDown class="w-5 h-5 text-danger" />
          <h3 class="font-display font-bold text-lg text-text uppercase">Registrar Egreso / Gasto</h3>
        </div>
        <button @click="$emit('close')" class="text-muted hover:text-text cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Preset Expense Motives -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-muted uppercase">Motivos Frecuentes</label>
          <div class="grid grid-cols-2 gap-1.5">
            <button 
              type="button"
              v-for="preset in presets"
              :key="preset"
              @click="concept = preset"
              class="p-2.5 rounded-xl bg-surface-2 border border-border hover:border-accent text-left transition-colors cursor-pointer text-xs lg:text-sm font-medium text-text truncate"
            >
              {{ preset }}
            </button>
          </div>
        </div>

        <!-- Concept -->
        <AppInput
          v-model="concept"
          required
          label="Concepto del Gasto"
          placeholder="Ej: Compra de garrafones de agua"
        />

        <!-- Amount -->
        <AppInput
          v-model="amount"
          type="number"
          min="0"
          required
          mono
          label="Monto a Salir ($)"
          placeholder="0"
        />

        <!-- Payment Method (De dónde sale el dinero) -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold text-muted uppercase">Salida De Dinero</label>
          <div class="grid grid-cols-2 gap-2">
            <button 
              type="button"
              @click="paymentMethod = 'cash'"
              :class="[
                'py-2.5 px-3 rounded-xl border text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer text-center',
                paymentMethod === 'cash' ? 'bg-danger text-white border-danger' : 'bg-surface-2 border-border text-muted hover:text-text'
              ]"
            >
              Efectivo de Caja
            </button>
            <button 
              type="button"
              @click="paymentMethod = 'transfer'"
              :class="[
                'py-2.5 px-3 rounded-xl border text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer text-center',
                paymentMethod === 'transfer' ? 'bg-danger text-white border-danger' : 'bg-surface-2 border-border text-muted hover:text-text'
              ]"
            >
              Transferencia / Banco
            </button>
          </div>
        </div>

        <!-- Notes -->
        <AppInput
          v-model="notes"
          type="textarea"
          :rows="2"
          label="Observaciones (Opcional)"
          placeholder="Detalles de la compra, proveedor..."
        />

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
            class="flex-1 py-2.5 rounded-xl bg-danger text-white border border-danger hover:opacity-90 disabled:opacity-50 text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span v-if="submitting" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
            <span v-else>Registrar Salida</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { TrendingDown, X } from 'lucide-vue-next';

defineProps<{
  isOpen: boolean;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: any): void;
}>();

const presets = [
  'Compra de Agua / Hielo',
  'Artículos de Aseo y Limpieza',
  'Reparación / Mantenimiento',
  'Viáticos / Retiro de Caja',
];

const concept = ref('');
const amount = ref<number | null>(null);
const paymentMethod = ref<'cash' | 'transfer'>('cash');
const notes = ref('');

const handleSubmit = () => {
  if (!concept.value || !amount.value) return;

  emit('submit', {
    concept: concept.value,
    amount: Number(amount.value),
    paymentMethod: paymentMethod.value,
    notes: notes.value,
  });

  concept.value = '';
  amount.value = null;
  notes.value = '';
};
</script>
