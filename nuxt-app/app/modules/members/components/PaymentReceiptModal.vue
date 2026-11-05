<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        @click.self="close"
      >
        <div 
          class="relative max-w-xl w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-reveal"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2 shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
                <Receipt class="w-4 h-4" />
              </div>
              <div>
                <h3 class="font-display font-bold text-text text-base tracking-wide uppercase">Comprobante de Pago</h3>
                <p class="text-xs text-muted font-mono">Transferencia Bancaria</p>
              </div>
            </div>
            <button 
              @click="close" 
              class="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Payment Summary Strip -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-surface-2/60 border-b border-border text-xs">
            <div>
              <span class="text-muted text-[10px] uppercase font-bold tracking-wider block mb-0.5">Monto</span>
              <span class="font-display font-bold text-base text-accent">${{ formatCurrency(payment?.amount || 0) }}</span>
            </div>
            <div>
              <span class="text-muted text-[10px] uppercase font-bold tracking-wider block mb-0.5">Fecha</span>
              <span class="font-mono text-text text-xs">{{ payment?.paidAt ? formatDate(payment.paidAt) : '-' }}</span>
            </div>
            <div v-if="payment?.transferReference">
              <span class="text-muted text-[10px] uppercase font-bold tracking-wider block mb-0.5">Referencia</span>
              <span class="font-mono text-text text-xs truncate block" :title="payment.transferReference">{{ payment.transferReference }}</span>
            </div>
          </div>

          <!-- Receipt Image or Empty State -->
          <div class="p-4 bg-surface flex flex-col items-center justify-center min-h-[220px] max-h-[60vh] overflow-auto">
            <template v-if="payment?.receiptPath">
              <img 
                :src="payment.receiptPath" 
                alt="Comprobante de Transferencia" 
                class="max-w-full max-h-[50vh] object-contain rounded-lg shadow border border-border"
              />
            </template>
            <template v-else>
              <div class="py-10 px-4 text-center flex flex-col items-center">
                <div class="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center text-muted mb-3">
                  <FileImage class="w-6 h-6 opacity-40" />
                </div>
                <h4 class="font-display uppercase tracking-wider text-sm text-text font-bold mb-1">Sin imagen adjunta</h4>
                <p class="text-xs text-muted max-w-xs">
                  Este pago fue registrado por transferencia pero no se subió una foto del comprobante.
                </p>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="px-5 py-3 border-t border-border bg-surface-2 flex justify-between items-center text-xs text-muted shrink-0">
            <span class="font-mono">Presiona Esc para cerrar</span>
            <a 
              v-if="payment?.receiptPath"
              :href="payment.receiptPath" 
              target="_blank" 
              download 
              class="text-accent hover:underline flex items-center gap-1 font-bold"
            >
              <ExternalLink class="w-3.5 h-3.5" />
              Descargar comprobante
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { X, Receipt, ExternalLink, FileImage } from 'lucide-vue-next';
import type { Payment } from '../types';

const props = defineProps<{
  isOpen: boolean;
  payment: Payment | null;
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

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-CO', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
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
