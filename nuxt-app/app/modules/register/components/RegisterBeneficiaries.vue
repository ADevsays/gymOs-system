<template>
  <div v-if="selectedPlanObj && selectedPlanObj.maxMembers > 1" class="mt-6 pt-5 border-t border-border animate-reveal">
    <div class="flex items-center gap-2 mb-3">
      <UsersIcon class="w-4 h-4 text-accent" />
      <h4 class="text-sm font-bold uppercase tracking-wider text-text">Beneficiarios del Plan ({{ beneficiaries.length }})</h4>
    </div>
    <p class="text-xs text-muted mb-4">Ingresa la cédula de los beneficiarios. Puedes dejarlos vacíos y agregarlos después.</p>
    
    <div class="space-y-3">
      <div v-for="(b, index) in beneficiaries" :key="index" class="flex flex-col gap-2 relative">
        <div class="flex items-center gap-3 relative">
          <div class="w-6 h-6 rounded-full bg-surface-2 flex items-center justify-center text-xs font-bold text-muted shrink-0">{{ index + 1 }}</div>
          <input v-model="b.cedula" @blur="searchBeneficiary(index)" type="text" placeholder="Cédula del beneficiario..." class="w-full bg-transparent border-b-2 border-border text-text px-1 py-1.5 pr-8 text-sm outline-none focus:border-accent transition-colors" />
          <Loader2 v-if="b.loading" class="w-4 h-4 animate-spin text-accent absolute right-2" />
        </div>
        
        <div class="pl-9 transition-opacity duration-200" :class="{ 'opacity-50 pointer-events-none': b.loading }">
          <div v-if="b.found" class="text-sm text-success font-medium flex items-center gap-1">
            <CheckCircle class="w-4 h-4" /> Encontrado: {{ b.firstName }} {{ b.lastName }}
          </div>

          <div v-else-if="b.cedula && b.cedula.length >= 5" class="grid grid-cols-2 gap-2 mt-1">
            <p class="col-span-2 text-xs text-warning">Miembro nuevo:</p>
            <input v-model="b.firstName" type="text" placeholder="Nombres" class="w-full bg-surface-2 border border-border text-text px-2 py-1.5 text-sm rounded-sm outline-none focus:border-accent" />
            <input v-model="b.lastName" type="text" placeholder="Apellidos" class="w-full bg-surface-2 border border-border text-text px-2 py-1.5 text-sm rounded-sm outline-none focus:border-accent" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon, Loader2, CheckCircle } from 'lucide-vue-next';
import { useRegisterForm } from '../composables/useRegisterForm';

const { selectedPlanObj, beneficiaries, searchBeneficiary } = useRegisterForm();
</script>

<style scoped lang="postcss">
@reference "~/assets/css/main.css";

.reg-card {
  @apply bg-surface border border-border rounded p-6;
}
</style>
