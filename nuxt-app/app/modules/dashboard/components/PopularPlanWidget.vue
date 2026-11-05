<template>
  <NuxtLink 
    v-if="popularPlan" 
    :to="'/plans/' + popularPlan.planId"
    class="bg-surface rounded-3xl p-5 2xl:p-8 shadow-sm border border-border flex flex-col animate-reveal delay-200 group hover:border-border/90 hover:bg-surface-2/20 transition-all duration-200 cursor-pointer block"
    title="Ver detalle del plan y sus miembros"
  >
    <div class="flex justify-between items-center mb-4 2xl:mb-8">
      <div class="flex items-center gap-2">
        <span class="text-muted font-medium group-hover:text-text transition-colors">Plan Más Popular</span>
        <ArrowUpRight class="w-4 h-4 text-muted/60 opacity-0 group-hover:opacity-100 group-hover:text-text transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <span class="text-muted text-sm font-medium">{{ currentMonthLabel }}</span>
    </div>
    
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-4 2xl:mb-8">
          <h2 class="text-lg 2xl:text-2xl font-display font-medium text-text group-hover:text-accent transition-colors">
            {{ popularPlan.planName }}
          </h2>
        </div>

        <div class="flex gap-6 2xl:gap-10">
          <div>
            <div class="text-lg 2xl:text-2xl font-semibold text-text mb-0.5 2xl:mb-1">{{ popularPlan.totalUsers }}</div>
            <div class="text-xs text-muted">Usuarios totales</div>
          </div>
          <div>
            <div class="text-lg 2xl:text-2xl font-semibold text-text mb-0.5 2xl:mb-1">{{ popularPlan.demandPercent }}%</div>
            <div class="text-xs text-muted">Demanda</div>
          </div>
        </div>
      </div>
      
      <!-- Interactive Chart -->
      <div class="flex-1 flex items-end gap-3 2xl:gap-5 h-24 2xl:h-32 pl-6 2xl:pl-10 border-l border-border/50">
        <!-- New Users -->
        <div class="flex-1 h-full flex flex-col justify-end group/bar">
          <div class="flex items-baseline gap-1.5 mb-2">
            <span class="font-display font-bold text-base 2xl:text-xl text-text">{{ popularPlan.newThisMonth }}</span> 
            <span class="text-xs text-muted font-medium">Nuevos</span>
          </div>
          <div class="w-full bg-linear-to-t from-info/15 to-info/35 border-t-2 border-info rounded-t transition-all group-hover/bar:scale-y-105 origin-bottom"
            :style="{ height: planBarHeight(popularPlan.newThisMonth), minHeight: '6px' }"
            title="Nuevos miembros en su primer ciclo">
          </div>
        </div>
        <!-- Renewals -->
        <div class="flex-1 h-full flex flex-col justify-end group/bar">
          <div class="flex items-baseline gap-1.5 mb-2">
            <span class="font-display font-bold text-base 2xl:text-xl text-accent">{{ popularPlan.renewals }}</span> 
            <span class="text-xs text-muted font-medium">Renovaciones</span>
          </div>
          <div class="w-full bg-linear-to-t from-accent/15 to-accent/35 border-t-2 border-accent rounded-t transition-all group-hover/bar:scale-y-105 origin-bottom"
            :style="{ height: planBarHeight(popularPlan.renewals), minHeight: '6px' }"
            title="Miembros que han renovado su membresía">
          </div>
        </div>
        <!-- Non-renewals / Churned -->
        <div class="flex-1 h-full flex flex-col justify-end group/bar">
          <div class="flex items-baseline gap-1.5 mb-2">
            <span class="font-display font-bold text-base 2xl:text-xl text-danger">{{ popularPlan.churned }}</span> 
            <span class="text-xs text-muted font-medium">No renovados</span>
          </div>
          <div class="w-full bg-linear-to-t from-danger/15 to-danger/35 border-t-2 border-danger rounded-t transition-all group-hover/bar:scale-y-105 origin-bottom"
            :style="{ height: planBarHeight(popularPlan.churned), minHeight: '6px' }"
            title="Miembros con membresía vencida o cancelada sin renovar">
          </div>
        </div>
      </div>
    </div>
  </NuxtLink>

  <!-- Empty state for Popular Plan -->
  <div v-else class="bg-surface rounded-3xl p-5 2xl:p-8 shadow-sm border border-border flex flex-col items-center justify-center animate-reveal delay-200 min-h-[120px] 2xl:min-h-[160px]">
    <LayoutGrid class="w-6 h-6 2xl:w-8 2xl:h-8 text-muted mb-3" />
    <span class="text-muted text-sm">Aún no hay planes con suscripciones. Crea un plan y registra tu primer miembro.</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { LayoutGrid, ArrowUpRight } from 'lucide-vue-next';

const props = defineProps<{
  popularPlan: {
    planId: number;
    planName: string;
    totalUsers: number;
    demandPercent: number;
    newThisMonth: number;
    renewals: number;
    churned: number;
  } | null;
}>();

const currentMonthLabel = computed(() => {
  const now = new Date();
  return now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
});

const planBarHeight = (value: number) => {
  if (!props.popularPlan) return '10%';
  const max = Math.max(
    props.popularPlan.newThisMonth,
    props.popularPlan.renewals,
    props.popularPlan.churned,
    1
  );
  return Math.max((value / max) * 100, 8) + '%';
};
</script>

<style scoped lang="postcss">
@reference "~/assets/css/main.css";
</style>
