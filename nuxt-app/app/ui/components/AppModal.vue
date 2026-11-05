<template>
  <Teleport to="body">
    <div 
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-reveal"
      @click.self="handleBackdropClick"
    >
      <div 
        :class="[
          'bg-surface border border-border rounded-xl w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto',
          maxWidth || 'max-w-xl'
        ]"
      >
        <!-- Modal Header -->
        <div v-if="$slots.header || title" class="flex items-center justify-between border-b border-border/40 pb-3 shrink-0">
          <slot name="header">
            <div class="flex items-center gap-2.5 min-w-0 pr-2">
              <div v-if="icon" class="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-accent shrink-0">
                <component :is="icon" class="w-4.5 h-4.5" />
              </div>
              <div class="min-w-0">
                <h3 class="font-display font-bold text-lg text-text uppercase leading-tight truncate">
                  {{ title }}
                </h3>
                <p v-if="subtitle" class="text-xs text-muted mt-0.5 truncate">
                  {{ subtitle }}
                </p>
              </div>
            </div>
          </slot>

          <div class="flex items-center gap-1 shrink-0">
            <slot name="header-actions" />
            <button 
              v-if="showCloseButton"
              type="button"
              @click="handleDismiss" 
              class="text-muted hover:text-text cursor-pointer p-1 rounded-lg hover:bg-surface-2 transition-colors"
              title="Descartar y cerrar"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="min-w-0 flex flex-col gap-4 flex-1">
          <slot />
        </div>

        <!-- Modal Footer -->
        <div v-if="$slots.footer" class="pt-2 border-t border-border/40 shrink-0">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { X } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    title?: string;
    subtitle?: string;
    icon?: any;
    maxWidth?: string;
    showCloseButton?: boolean;
  }>(),
  {
    isOpen: false,
    showCloseButton: true,
    maxWidth: 'max-w-xl',
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'dismiss'): void;
}>();

const handleBackdropClick = () => {
  emit('close');
};

const handleDismiss = () => {
  emit('dismiss');
};

const handleKeydown = (e: KeyboardEvent) => {
  if (props.isOpen && e.key === 'Escape') {
    emit('close');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

watch(
  () => props.isOpen,
  (val) => {
    if (typeof document !== 'undefined') {
      if (val) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }
);
</script>
