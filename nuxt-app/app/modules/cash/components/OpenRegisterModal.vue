<template>
  <AppModal
    :is-open="isOpen"
    title="Abrir Caja del Día"
    subtitle="Ingresa la base inicial en efectivo para iniciar el turno."
    :icon="LockOpen"
    max-width="max-w-md"
    @close="handleClose"
    @dismiss="handleDismiss"
  >
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
      <AppInput
        v-model="openingBalance"
        type="number"
        min="0"
        required
        mono
        label="Base Inicial en Efectivo ($)"
        hint="Dinero físico disponible en el cajón para dar cambio."
        placeholder="0"
      />

      <AppInput
        v-model="notes"
        type="textarea"
        :rows="2"
        label="Observaciones / Notas (Opcional)"
        placeholder="Ej: Turno mañana, billetes de baja denominación..."
      />

      <div class="flex items-center gap-3 pt-2">
        <button 
          type="button" 
          @click="handleDismiss"
          class="flex-1 py-2.5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs lg:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          :disabled="submitting"
          class="flex-1 py-2.5 rounded-xl bg-accent text-white border border-accent hover:bg-accent-soft disabled:opacity-50 text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span v-if="submitting" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
          <span v-else>Iniciar Turno</span>
        </button>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { LockOpen } from 'lucide-vue-next';
import AppModal from '~/ui/components/AppModal.vue';

defineProps<{
  isOpen: boolean;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: { openingBalance: number; notes: string }): void;
}>();

const openingBalance = ref(50000);
const notes = ref('');

// Backdrop or Esc: close without destroying draft
const handleClose = () => {
  emit('close');
};

// Explicit dismiss via 'X' or Cancel: reset draft and close
const handleDismiss = () => {
  openingBalance.value = 50000;
  notes.value = '';
  emit('close');
};

const handleSubmit = () => {
  emit('submit', {
    openingBalance: Number(openingBalance.value) || 0,
    notes: notes.value,
  });
};
</script>
