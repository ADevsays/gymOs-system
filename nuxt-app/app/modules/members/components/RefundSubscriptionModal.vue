<template>
  <AppModal
    :is-open="isOpen"
    title="Cancelar y Reembolsar Plan"
    subtitle="Cancela la membresía activa y registra el egreso en la caja diaria."
    :icon="RotateCcw"
    max-width="max-w-lg"
    @close="emit('close')"
    @dismiss="emit('close')"
  >
    <div v-if="member && activeSub" class="flex flex-col gap-4">
      <!-- Member & Active Plan Info -->
      <div class="p-3.5 bg-surface-2 border border-border rounded-xl flex items-center justify-between">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-text block">
            {{ member.firstName }} {{ member.lastName }}
          </span>
          <span class="text-xs text-muted font-mono mt-0.5 block">
            CC: {{ member.cedula }}
          </span>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-bold uppercase tracking-wider text-muted block">Plan a Cancelar</span>
          <span class="text-xs font-bold text-danger">{{ activeSub.planName }}</span>
        </div>
      </div>

      <!-- Refund Amount -->
      <div class="flex items-end justify-between gap-3">
        <AppInput
          v-model="refundAmount"
          type="number"
          min="1"
          mono
          label="Monto a Reembolsar ($)"
          placeholder="0"
          wrapper-class="flex-1"
        />
        <span class="text-[11px] text-muted shrink-0 pb-2.5">
          Valor original pagado: <span class="font-mono text-text font-medium">${{ formatCurrency(activeSub.planPrice) }}</span>
        </span>
      </div>

      <!-- Payment Outflow Method -->
      <div class="flex flex-col gap-2 pt-1 border-t border-border/40">
        <label class="text-xs font-bold text-muted uppercase tracking-wider">Método de Devolución</label>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="paymentMethod = 'cash'"
            :class="[
              'flex-1 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 border',
              paymentMethod === 'cash'
                ? 'bg-danger text-white border-danger shadow-xs'
                : 'bg-surface-2 border-border text-muted hover:text-text'
            ]"
          >
            <Banknote class="w-4 h-4" />
            <span>Efectivo</span>
          </button>
          <button
            type="button"
            @click="paymentMethod = 'transfer'"
            :class="[
              'flex-1 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 border',
              paymentMethod === 'transfer'
                ? 'bg-danger text-white border-danger shadow-xs'
                : 'bg-surface-2 border-border text-muted hover:text-text'
            ]"
          >
            <CreditCard class="w-4 h-4" />
            <span>Transferencia</span>
          </button>
        </div>
      </div>

      <!-- Reason (Collapsible) -->
      <details ref="reasonDetails" class="group w-full pt-1 border-t border-border/40">
        <summary class="text-xs text-muted hover:text-text cursor-pointer select-none list-none flex items-center gap-1.5 transition-colors py-0.5">
          <ChevronRight class="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-90 text-muted shrink-0" />
          <span class="font-medium">Motivo del reembolso (opcional)</span>
        </summary>
        <div class="mt-2 flex flex-col gap-1.5 animate-reveal">
          <AppInput
            v-model="reason"
            label="Motivo del Reembolso (Opcional)"
            placeholder="Ej: Cambio de ciudad, inconformidad, error de cobro..."
          />
        </div>
      </details>

      <!-- Warning Box -->
      <div class="p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-2.5">
        <AlertTriangle class="w-4 h-4 text-danger shrink-0 mt-0.5" />
        <p class="text-xs text-muted leading-relaxed">
          Esta acción marcará la suscripción del socio como <strong class="text-text">cancelada</strong> y registrará un <strong class="text-danger font-semibold">egreso de dinero</strong> en el flujo de caja.
        </p>
      </div>

      <!-- Error Notice -->
      <div v-if="actionError" class="p-3 bg-danger/15 border border-danger/30 text-danger rounded-xl text-xs flex items-center justify-between">
        <span>{{ actionError }}</span>
        <button type="button" @click="actionError = null" class="font-bold underline text-xs cursor-pointer ml-2">Cerrar</button>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center gap-3">
        <button
          type="button"
          :disabled="submitting"
          @click="emit('close')"
          class="flex-1 py-2.5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
        >
          Volver
        </button>

        <button
          type="button"
          :disabled="!isValidAmount || submitting"
          @click="handleConfirm"
          class="flex-1 py-2.5 rounded-xl bg-danger text-white border border-danger hover:bg-danger/85 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
        >
          <span v-if="submitting" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
          <span v-else>Confirmar Reembolso</span>
        </button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { RotateCcw, AlertTriangle, Banknote, CreditCard, ChevronRight } from 'lucide-vue-next';
import AppModal from '~/ui/components/AppModal.vue';
import AppInput from '~/ui/components/AppInput.vue';
import type { MemberDetail } from '../types';

const props = defineProps<{
  isOpen: boolean;
  member: MemberDetail | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success'): void;
}>();

const refundAmount = ref<number>(0);
const paymentMethod = ref<'cash' | 'transfer'>('cash');
const reason = ref('');
const reasonDetails = ref<HTMLDetailsElement | null>(null);
const submitting = ref(false);
const actionError = ref<string | null>(null);

const activeSub = computed(() => {
  if (!props.member?.subscriptions) return null;
  return props.member.subscriptions.find((s) => s.status === 'active') || null;
});

const isValidAmount = computed(() => {
  return Number(refundAmount.value) > 0;
});

watch(
  () => props.isOpen,
  (val) => {
    if (val && activeSub.value) {
      actionError.value = null;
      refundAmount.value = activeSub.value.planPrice || 0;
      paymentMethod.value = 'cash';
      reason.value = '';
      if (reasonDetails.value) {
        reasonDetails.value.open = false;
      }
    }
  }
);

const handleConfirm = async () => {
  if (!props.member || !isValidAmount.value) return;

  submitting.value = true;
  actionError.value = null;

  try {
    const isExpanded = reasonDetails.value?.open ?? false;
    const payload = {
      amount: Number(refundAmount.value),
      paymentMethod: paymentMethod.value,
      reason: (isExpanded ? reason.value.trim() : '') || undefined,
    };

    const res = await $fetch<{ success: boolean; error?: string }>(`/api/members/${props.member.id}/refund`, {
      method: 'POST',
      body: payload,
    });

    if (res?.success) {
      emit('success');
      emit('close');
    } else {
      actionError.value = res?.error || 'Error al procesar el reembolso';
    }
  } catch (err: any) {
    actionError.value = err?.data?.error || err.message || 'Error inesperado';
  } finally {
    submitting.value = false;
  }
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val || 0);
};
</script>
