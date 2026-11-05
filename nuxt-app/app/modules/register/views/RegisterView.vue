<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-start justify-between mb-6 shrink-0">
      <div class="pt-1.5 md:pt-2">
        <h1 class="text-2xl font-display font-bold tracking-wide uppercase text-text leading-none">Nuevo Miembro</h1>
      </div>
      <div v-if="saving" class="flex items-center gap-2 text-muted text-sm pt-1">
        <Loader2 class="w-4 h-4 animate-spin" />
        Guardando...
      </div>
    </div>

    <div class="flex gap-5 flex-1 min-h-0">
      <!-- ══════════════ FORMULARIO PRINCIPAL ══════════════ -->
      <div class="flex-1 overflow-y-auto pr-1 space-y-4">
        
        <RegisterPersonalData />
        <RegisterPlanSelection />

        <!-- Botón Final -->
        <button
          @click="submit"
          :disabled="!isFormValid || saving"
          class="submit-btn w-full mt-4"
          :class="isFormValid ? 'ready' : ''"
        >
          <template v-if="!saving">
            <UserPlus class="w-5 h-5" />
            Registrar Miembro
          </template>
          <template v-else>
            <Loader2 class="w-5 h-5 animate-spin" />
            Guardando...
          </template>
        </button>
      </div>

      <!-- ══════════════ PANEL LATERAL: ESCÁNER ══════════════ -->
      <RegisterOcrPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2, UserPlus } from 'lucide-vue-next';
import { provideRegisterForm } from '../composables/useRegisterForm';
import { provideOcrScanner } from '../composables/useOcrScanner';

import RegisterPersonalData from '../components/RegisterPersonalData.vue';
import RegisterPlanSelection from '../components/RegisterPlanSelection.vue';
import RegisterOcrPanel from '../components/RegisterOcrPanel.vue';

// Inicializar el estado compartido (Providers)
const { form, selectedPlanId, isFormValid, saving, submit } = provideRegisterForm();
provideOcrScanner(form, selectedPlanId);
</script>

<style scoped>
@reference "~/assets/css/main.css";

.submit-btn {
  @apply flex items-center justify-center gap-2 py-4 rounded
         font-bold text-base uppercase tracking-wider transition-all duration-200
         bg-surface-2 text-muted border border-border cursor-not-allowed;
}

.submit-btn.ready {
  @apply bg-accent text-white border-accent cursor-pointer
         hover:bg-accent-soft active:scale-[0.99];
}
</style>
