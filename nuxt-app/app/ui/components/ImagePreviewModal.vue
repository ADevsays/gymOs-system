<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        @click.self="close"
      >
        <div 
          class="relative max-w-2xl w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-reveal"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-2 shrink-0">
            <div>
              <h3 class="font-display font-bold text-text text-base tracking-wide uppercase">{{ title || 'Foto de Perfil' }}</h3>
              <p v-if="subtitle" class="text-xs text-muted font-mono">{{ subtitle }}</p>
            </div>
            <button 
              @click="close" 
              class="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Image Area -->
          <div class="p-4 bg-surface-2/60 flex items-center justify-center overflow-auto max-h-[75vh]">
            <img 
              :src="src" 
              :alt="title || 'Imagen'" 
              class="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md border border-white/10"
            />
          </div>

          <!-- Footer -->
          <div class="px-5 py-3 border-t border-border bg-surface-2 flex justify-between items-center text-xs text-muted">
            <span class="font-mono">Presiona Esc o haz clic fuera para cerrar</span>
            <a 
              :href="src" 
              target="_blank" 
              download 
              class="text-accent hover:underline flex items-center gap-1 font-bold"
            >
              <ExternalLink class="w-3.5 h-3.5" />
              Abrir original
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { X, ExternalLink } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  src: string;
  title?: string;
  subtitle?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const close = () => {
  emit('close');
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    close();
  }
};

watch(() => props.isOpen, (newVal) => {
  if (typeof document !== 'undefined') {
    if (newVal) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    }
  }
});

onMounted(() => {
  if (props.isOpen) {
    window.addEventListener('keydown', handleKeyDown);
  }
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    window.removeEventListener('keydown', handleKeyDown);
  }
});
</script>

<style scoped>
@reference "~/assets/css/main.css";

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
