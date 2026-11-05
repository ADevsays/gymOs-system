<template>
  <div class="reg-card mt-4">
    <h3 class="reg-section-label">Plan de Membresía *</h3>
    
    <div class="grid grid-cols-2 gap-3 mt-4">
      <div
        v-for="plan in plans"
        :key="plan.id"
        @click="selectedPlanId = plan.id"
        :class="['plan-card', selectedPlanId === plan.id ? 'active' : '']"
      >
        <div class="flex justify-between items-start">
          <p class="font-bold text-sm">{{ plan.name }}</p>
          <span v-if="plan.maxMembers > 1" class="text-[10px] bg-info/20 text-info px-1.5 py-0.5 rounded uppercase font-bold tracking-wider flex items-center gap-1"><UsersIcon class="w-3 h-3"/> Parejas/Grupo</span>
        </div>
        <p class="font-display text-2xl font-bold mt-1" :class="selectedPlanId === plan.id && isCustomPriceMode ? 'text-muted line-through text-lg' : 'text-accent'">
          ${{ formatCurrency(plan.price) }}
        </p>
        <p class="text-xs text-muted mt-1">{{ plan.durationDays }} días</p>
      </div>
    </div>

    <!-- Precio especial (fuera de las cards) -->
    <div v-if="selectedPlanId" class="mt-4">
      <button
        v-if="!isCustomPriceMode"
        @click="isCustomPriceMode = true"
        class="text-xs text-muted hover:text-accent transition-colors flex items-center gap-1.5 group"
      >
        <PenLine class="w-3.5 h-3.5 group-hover:text-accent" />
        Aplicar descuento o precio especial
      </button>
      <div v-else class="flex flex-col gap-3 p-4 bg-surface-2 border border-border rounded-sm">
        <div class="flex items-center justify-between">
          <p class="text-xs font-bold uppercase tracking-wider text-muted">Precio especial</p>
          <button @click="isCustomPriceMode = false; customPrice = selectedPlanObj?.price ?? null; customPriceReason = ''" class="text-[10px] text-muted hover:text-accent transition-colors underline">Usar precio original</button>
        </div>
        <input v-model="customPrice" type="number" class="w-full bg-surface border border-accent text-accent font-display text-2xl font-bold px-3 py-2 rounded-sm outline-none" placeholder="0" />
        <div class="flex gap-1.5 flex-wrap">
          <button v-for="chip in customPriceChips" :key="chip" @click="customPriceReason = chip" :class="['text-[10px] px-2.5 py-1 rounded-sm border cursor-pointer font-bold uppercase transition-all', customPriceReason === chip ? 'bg-accent text-white border-accent' : 'border-border text-muted bg-surface hover:border-accent']">{{ chip }}</button>
        </div>
      </div>
    </div>

    <!-- Beneficiarios (ahora dentro de PlanSelection, arriba de pago) -->
    <RegisterBeneficiaries />

    <!-- Método de pago y Fecha de inicio -->
    <div class="mt-5 border-t border-border pt-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div>
          <label class="field-label">Método de pago</label>
          <div class="flex gap-2 mt-2">
            <button
              v-for="method in paymentMethods"
              :key="method.value"
              v-show="method.value !== 'card'"
              @click="paymentMethod = method.value"
              :class="['select-chip', paymentMethod === method.value ? 'active' : '']"
            >{{ method.label }}</button>
          </div>
        </div>

        <div>
          <AppInput
            v-model="customStartDate"
            type="date"
            label="Fecha de pago / inicio (Opcional)"
            hint="Por defecto se toma la fecha de hoy"
          />
        </div>
      </div>

      <!-- Comprobante de Transferencia -->
      <div v-if="paymentMethod === 'transfer'" class="mt-4 p-4 bg-surface-2 border border-border rounded-sm animate-reveal flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <label class="field-label">Comprobante de Transferencia</label>
          <span class="text-[10px] text-muted font-mono">JPG, PNG o WEBP</span>
        </div>

        <!-- Preview or Upload Area -->
        <div v-if="transferReceiptPreview" class="relative flex items-center gap-3 p-3 bg-surface border border-accent/40 rounded-sm">
          <div class="w-14 h-14 rounded overflow-hidden bg-black/20 shrink-0 border border-border">
            <img :src="transferReceiptPreview" alt="Comprobante" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-text truncate">Comprobante adjuntado</p>
            <p class="text-[11px] text-success font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle2 class="w-3.5 h-3.5 text-success" /> Listo para guardar
            </p>
          </div>
          <button 
            type="button" 
            @click="removeTransferReceipt" 
            class="p-2 text-muted hover:text-danger hover:bg-surface-2 rounded transition-colors cursor-pointer"
            title="Eliminar comprobante"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>

        <div v-else>
          <label 
            class="flex flex-col items-center justify-center p-5 border-2 border-dashed border-border hover:border-accent rounded-sm cursor-pointer transition-colors bg-surface/50 hover:bg-surface"
          >
            <UploadCloud class="w-7 h-7 text-muted mb-2" />
            <span class="text-xs font-bold text-text">Haz clic o arrastra la foto del comprobante</span>
            <span class="text-[10px] text-muted mt-1">Captura de pantalla o recibo bancario</span>
            <input 
              type="file" 
              accept="image/*" 
              class="hidden" 
              @change="handleReceiptFileChange" 
            />
          </label>
        </div>

        <!-- Reference Number Input -->
        <div class="mt-1">
          <AppInput
            v-model="transferReference"
            mono
            label="N° de Comprobante / Referencia (Opcional)"
            placeholder="Ej: 08472910 o Nequi #1234"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon, PenLine, UploadCloud, CheckCircle2, Trash2 } from 'lucide-vue-next';
import { useRegisterForm } from '../composables/useRegisterForm';
import RegisterBeneficiaries from './RegisterBeneficiaries.vue';

const { 
  plans, 
  selectedPlanId, 
  selectedPlanObj,
  isCustomPriceMode, 
  customPrice, 
  customPriceReason,
  paymentMethod,
  customStartDate,
  transferReceiptPreview,
  transferReference,
  setTransferReceipt,
  removeTransferReceipt
} = useRegisterForm();

const handleReceiptFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    setTransferReceipt(target.files[0]);
  }
};

const customPriceChips = ['Familiar', 'Bono', 'Staff', 'Otro'];

const paymentMethods = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'card', label: 'Tarjeta' },
];

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val);
};
</script>

<style scoped>
@reference "~/assets/css/main.css";

.reg-card {
  @apply bg-surface border border-border rounded p-6;
}

.reg-section-label {
  @apply text-xs font-bold uppercase tracking-widest text-muted;
}

.plan-card {
  @apply p-4 border border-border rounded-sm cursor-pointer
         transition-all duration-200 hover:border-accent/50 bg-surface-2;
}

.plan-card.active {
  @apply border-accent bg-accent/5;
}

.field-label {
  @apply text-xs font-medium text-muted uppercase tracking-wide;
}

.select-chip {
  @apply px-4 py-2 rounded-sm text-sm font-medium border border-border
         text-muted bg-surface-2 cursor-pointer transition-all duration-150
         hover:border-accent hover:text-text;
}

.select-chip.active {
  @apply border-accent bg-accent text-white;
}
</style>
