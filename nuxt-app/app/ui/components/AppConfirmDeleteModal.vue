<template>
  <AppModal
    :is-open="isOpen"
    :title="title"
    :subtitle="subtitle"
    :icon="AlertTriangle"
    :max-width="maxWidth"
    @close="emit('close')"
    @dismiss="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <!-- Item Details Card if itemTitle provided -->
      <div v-if="itemTitle" class="p-3.5 bg-surface-2 border border-border rounded-xl flex items-center justify-between">
        <div class="min-w-0 pr-2">
          <span class="text-xs font-bold uppercase tracking-wider text-muted block truncate">
            {{ itemTitle }}
          </span>
          <span v-if="description" class="text-xs text-text/70 mt-0.5 block leading-relaxed">
            {{ description }}
          </span>
        </div>
      </div>

      <!-- Optional description when no itemTitle is given -->
      <p v-else-if="description" class="text-xs text-text/80 leading-relaxed">
        {{ description }}
      </p>

      <!-- Custom slot for caller-specific warnings or notes -->
      <slot />
    </div>

    <template #footer>
      <div class="flex items-center gap-3">
        <button
          type="button"
          :disabled="loading"
          @click="emit('close')"
          class="flex-1 py-2.5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
        >
          {{ cancelText }}
        </button>

        <button
          type="button"
          :disabled="loading"
          @click="emit('confirm')"
          class="flex-1 py-2.5 rounded-xl bg-danger text-white border border-danger hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
        >
          <span v-if="loading" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
          <span v-else>{{ confirmText }}</span>
        </button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next';
import AppModal from './AppModal.vue';

withDefaults(
  defineProps<{
    isOpen: boolean;
    title?: string;
    subtitle?: string;
    itemTitle?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    maxWidth?: string;
  }>(),
  {
    title: 'Confirmar Eliminación',
    subtitle: 'Esta acción no se puede deshacer.',
    confirmText: 'Sí, Eliminar',
    cancelText: 'Conservar',
    loading: false,
    maxWidth: 'max-w-md',
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();
</script>
