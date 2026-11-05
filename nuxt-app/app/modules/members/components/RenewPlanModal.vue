<template>
  <AppModal
    :is-open="isOpen"
    title="Renovar Plan de Membresía"
    subtitle="Registra el cobro y actualiza la vigencia del socio."
    :icon="Dumbbell"
    max-width="max-w-xl"
    @close="emit('close')"
    @dismiss="emit('close')"
  >
    <div v-if="member" class="flex flex-col gap-4">
      <!-- Member info card -->
      <div class="p-3.5 bg-surface-2 border border-border rounded-xl flex items-center justify-between">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-text block">
            {{ member.firstName }} {{ member.lastName }}
          </span>
          <span class="text-xs text-muted font-mono mt-0.5 block">
            CC: {{ member.cedula }}
          </span>
        </div>
        <div v-if="activeSub" class="text-right">
          <span class="text-[10px] font-bold uppercase tracking-wider text-muted block">Plan actual</span>
          <span class="text-xs font-bold text-accent">{{ activeSub.planName }}</span>
        </div>
      </div>

      <!-- Plan Selection -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-muted uppercase tracking-wider">Seleccionar Plan</label>
        <div v-if="plansLoading" class="py-4 flex items-center justify-center">
          <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-accent"></div>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            v-for="plan in activePlans"
            :key="plan.id"
            type="button"
            @click="selectedPlanId = plan.id"
            :class="[
              'p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer',
              selectedPlanId === plan.id
                ? 'bg-accent/10 border-accent text-text ring-1 ring-accent'
                : 'bg-surface-2 border-border text-muted hover:border-accent/40 hover:text-text'
            ]"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="text-xs font-bold uppercase tracking-wide truncate">{{ plan.name }}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded font-mono bg-surface border border-border text-muted shrink-0">
                {{ plan.durationDays }} días
              </span>
            </div>
            <p class="font-display font-bold text-base mt-2" :class="selectedPlanId === plan.id ? 'text-accent' : 'text-text'">
              ${{ formatCurrency(plan.price) }}
            </p>
          </button>
        </div>
      </div>

      <!-- Optional Custom Date Input -->
      <div class="pt-1">
        <AppInput
          v-model="customStartDate"
          type="date"
          label="Fecha de Pago / Inicio (Opcional)"
          hint="Por defecto se toma hoy o el fin de la suscripción activa"
        />
      </div>

      <!-- Dates Preview Banner -->
      <div v-if="selectedPlan" class="p-3 bg-surface-2/60 border border-border rounded-xl flex items-center justify-between text-xs">
        <div class="flex items-center gap-2 text-text">
          <Calendar class="w-4 h-4 text-accent shrink-0" />
          <span>Vigencia resultante:</span>
        </div>
        <div class="font-mono text-right font-medium">
          <span class="text-muted">{{ formatDate(calculatedStartDate) }}</span>
          <span class="text-text mx-1.5">&rarr;</span>
          <span class="text-accent font-bold">{{ formatDate(calculatedEndDate) }}</span>
        </div>
      </div>

      <!-- Custom Price Toggle -->
      <div class="flex flex-col gap-2 pt-1 border-t border-border/40">
        <label class="flex items-center gap-2 cursor-pointer select-none text-xs text-muted hover:text-text">
          <input
            type="checkbox"
            v-model="useCustomPrice"
            class="rounded border-border accent-accent cursor-pointer"
          />
          <span class="font-medium">Aplicar tarifa especial / descuento</span>
        </label>

        <div v-if="useCustomPrice" class="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-reveal">
          <AppInput
            v-model="customPrice"
            type="number"
            min="0"
            mono
            label="Tarifa Especial ($)"
            placeholder="0"
          />
          <AppInput
            v-model="customPriceReason"
            label="Motivo del Descuento"
            placeholder="Ej: Descuento familiar, convenio..."
          />
        </div>
      </div>

      <!-- Payment Method Selection -->
      <div class="flex flex-col gap-2 pt-1 border-t border-border/40">
        <label class="text-xs font-bold text-muted uppercase tracking-wider">Método de Pago</label>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="paymentMethod = 'cash'"
            :class="[
              'flex-1 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 border',
              paymentMethod === 'cash'
                ? 'bg-accent text-white border-accent shadow-xs'
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
                ? 'bg-accent text-white border-accent shadow-xs'
                : 'bg-surface-2 border-border text-muted hover:text-text'
            ]"
          >
            <CreditCard class="w-4 h-4" />
            <span>Transferencia</span>
          </button>
        </div>

        <!-- Transfer details if transfer selected -->
        <div v-if="paymentMethod === 'transfer'" class="mt-2 p-3 bg-surface-2/60 border border-border rounded-xl flex flex-col gap-3 animate-reveal">
          <AppInput
            v-model="transferReference"
            mono
            label="N° de Comprobante / Referencia Bancaria"
            placeholder="Ej: Ref Nequi #938210"
          />

          <!-- Upload Receipt Image -->
          <div v-if="receiptPreview" class="relative flex items-center gap-3 p-2.5 bg-surface border border-accent/40 rounded-xl">
            <div class="w-12 h-12 rounded-lg overflow-hidden bg-black/20 shrink-0 border border-border">
              <img :src="receiptPreview" alt="Comprobante" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold text-text truncate">Comprobante adjuntado</p>
              <p class="text-[10px] text-success font-medium mt-0.5">Listo para guardar</p>
            </div>
            <button
              type="button"
              @click="receiptPreview = null; transferReceiptBase64 = ''"
              class="p-1.5 text-muted hover:text-danger hover:bg-surface-2 rounded-lg transition-colors cursor-pointer"
              title="Eliminar comprobante"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <div v-else>
            <label class="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border hover:border-accent rounded-xl cursor-pointer transition-colors bg-surface/40 hover:bg-surface">
              <UploadCloud class="w-5 h-5 text-muted mb-1" />
              <span class="text-xs font-bold text-text">Adjuntar foto o captura de comprobante</span>
              <span class="text-[10px] text-muted mt-0.5">Opcional (JPG, PNG, WEBP)</span>
              <input type="file" accept="image/*" class="hidden" @change="handleReceiptFileChange" />
            </label>
          </div>
        </div>
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
          Cancelar
        </button>

        <button
          type="button"
          :disabled="!selectedPlanId || submitting"
          @click="handleConfirm"
          class="flex-1 py-2.5 rounded-xl bg-accent text-white border border-accent hover:bg-accent-soft disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
        >
          <span v-if="submitting" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
          <span v-else>Confirmar Renovación (${{ formatCurrency(finalPrice) }})</span>
        </button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Dumbbell, Calendar, Banknote, CreditCard, UploadCloud, Trash2 } from 'lucide-vue-next';
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

const plans = ref<any[]>([]);
const plansLoading = ref(false);
const selectedPlanId = ref<number | null>(null);
const customStartDate = ref('');

const paymentMethod = ref<'cash' | 'transfer'>('cash');
const transferReference = ref('');
const transferReceiptBase64 = ref('');
const receiptPreview = ref<string | null>(null);

const useCustomPrice = ref(false);
const customPrice = ref<number | null>(null);
const customPriceReason = ref('');

const submitting = ref(false);
const actionError = ref<string | null>(null);

const activePlans = computed(() => plans.value.filter((p) => p.isActive));

const activeSub = computed(() => {
  if (!props.member?.subscriptions) return null;
  return props.member.subscriptions.find((s) => s.status === 'active') || null;
});

const selectedPlan = computed(() => {
  return plans.value.find((p) => p.id === selectedPlanId.value) || null;
});

const finalPrice = computed(() => {
  if (useCustomPrice.value && customPrice.value !== null && customPrice.value !== undefined) {
    return Number(customPrice.value);
  }
  return selectedPlan.value?.price || 0;
});

const calculatedStartDate = computed(() => {
  if (customStartDate.value) {
    const [y, m, d] = customStartDate.value.split('-').map(Number);
    if (y && m && d) {
      const now = new Date();
      return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
    }
  }
  const now = new Date();
  if (activeSub.value) {
    const isEspecial = (activeSub.value.planName || '').toUpperCase().includes('ESPECIAL');
    if (!isEspecial) {
      const end = new Date(activeSub.value.endDate);
      if (end > now) return end;
    }
  }
  return now;
});

const calculatedEndDate = computed(() => {
  const start = new Date(calculatedStartDate.value);
  const duration = selectedPlan.value?.durationDays || 30;
  start.setDate(start.getDate() + duration);
  return start;
});

const fetchPlans = async () => {
  plansLoading.value = true;
  try {
    const res = await $fetch<{ success: boolean; data: any[] }>('/api/plans');
    if (res?.success) {
      plans.value = res.data;
      // Preselect current plan or first available
      if (!selectedPlanId.value && plans.value.length > 0) {
        if (activeSub.value?.planId) {
          selectedPlanId.value = activeSub.value.planId;
        } else {
          selectedPlanId.value = plans.value[0].id;
        }
      }
    }
  } catch (err) {
    console.error('Error fetching plans for renewal:', err);
  } finally {
    plansLoading.value = false;
  }
};

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      actionError.value = null;
      customStartDate.value = '';
      useCustomPrice.value = false;
      customPrice.value = null;
      customPriceReason.value = '';
      paymentMethod.value = 'cash';
      transferReference.value = '';
      receiptPreview.value = null;
      transferReceiptBase64.value = '';
      fetchPlans();
    }
  }
);

const handleReceiptFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const base64 = event.target?.result as string;
    receiptPreview.value = base64;
    transferReceiptBase64.value = base64;
  };
  reader.readAsDataURL(file);
};

const handleConfirm = async () => {
  if (!props.member || !selectedPlanId.value) return;

  submitting.value = true;
  actionError.value = null;

  try {
    const payload = {
      planId: selectedPlanId.value,
      paymentMethod: paymentMethod.value,
      startDate: customStartDate.value || undefined,
      customPrice: useCustomPrice.value ? customPrice.value : undefined,
      customPriceReason: useCustomPrice.value ? customPriceReason.value : undefined,
      transferReference: paymentMethod.value === 'transfer' ? transferReference.value : undefined,
      transferReceipt: paymentMethod.value === 'transfer' && transferReceiptBase64.value ? transferReceiptBase64.value : undefined,
    };

    const res = await $fetch<{ success: boolean; error?: string }>(`/api/members/${props.member.id}/renew`, {
      method: 'POST',
      body: payload,
    });

    if (res?.success) {
      emit('success');
      emit('close');
    } else {
      actionError.value = res?.error || 'Error al procesar la renovación';
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

const formatDate = (d: Date) => {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};
</script>
