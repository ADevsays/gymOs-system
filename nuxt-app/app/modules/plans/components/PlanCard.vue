<template>
  <div 
    @click="navigateToPlan"
    class="bg-surface border border-border rounded-xl p-3.5 md:p-4 flex flex-col relative transition-all duration-300 hover:border-accent/50 hover:shadow-md group cursor-pointer"
    :class="{ 'opacity-60 grayscale': !plan.isActive }"
  >
    <!-- Top Badges & Users Count -->
    <div class="flex items-center justify-between gap-1.5 mb-2 min-h-5.5">
      <div class="flex flex-wrap gap-1">
        <span v-if="plan.validUntil" class="bg-warning/15 text-warning border border-warning/30 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Promo</span>
        <span v-if="plan.maxMembers > 1" class="bg-info/15 text-info border border-info/30 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Grupal</span>
        <span v-if="!plan.isActive" class="bg-surface-2 text-muted text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-border">Inactivo</span>
      </div>

      <!-- Users registered badge -->
      <div 
        class="flex items-center gap-1 text-[11px] font-semibold bg-surface-2 px-2 py-0.5 rounded-md border border-border text-muted group-hover:text-text group-hover:border-accent/30 transition-colors"
        :title="`${plan.activeMembersCount || 0} usuarios registrados actualmente`"
      >
        <UsersIcon class="w-3.5 h-3.5 text-accent" />
        <span>{{ plan.activeMembersCount || 0 }}</span>
      </div>
    </div>

    <h3 class="font-display text-base md:text-lg font-bold text-text mb-1 leading-snug group-hover:text-accent transition-colors truncate" :title="plan.name">{{ plan.name }}</h3>
    
    <div class="flex items-baseline gap-1 mb-2">
      <span class="font-display text-lg md:text-xl font-bold text-accent">${{ formatCurrency(plan.price) }}</span>
      <span class="text-[11px] text-muted">/ {{ plan.durationDays }} d</span>
    </div>

    <p class="text-xs text-muted/75 mb-3 flex-1 line-clamp-2 min-h-7 leading-relaxed">{{ plan.description || 'Sin descripción' }}</p>

    <div class="flex flex-col gap-1 mb-3 text-[11px]">
      <div class="flex items-center gap-1.5 text-muted">
        <UsersIcon class="w-3.5 h-3.5 text-silver shrink-0" />
        <span class="truncate">Capacidad: Máx. {{ plan.maxMembers }} miembro(s)</span>
      </div>
      <div v-if="plan.validUntil" class="flex items-center gap-1.5 text-warning font-medium">
        <ClockIcon class="w-3.5 h-3.5 shrink-0" />
        <span class="truncate">Hasta: {{ formatDate(plan.validUntil) }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-1.5 mt-auto border-t border-border/50 pt-2.5">
      <button 
        @click.stop="$emit('edit', plan)" 
        class="flex-1 bg-surface-2 text-text border border-border cursor-pointer hover:border-accent hover:text-accent transition-colors duration-200 py-1.5 rounded-lg font-bold uppercase tracking-wider text-[11px]"
      >
        Editar
      </button>
      <button 
        v-if="plan.isActive" 
        @click.stop="$emit('archive', plan.id)" 
        class="px-2.5 bg-surface-2 text-muted border border-border cursor-pointer hover:border-danger hover:text-danger transition-colors duration-200 py-1.5 rounded-lg" 
        title="Desactivar plan"
      >
        <TrashIcon class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { UsersIcon, ClockIcon, TrashIcon } from 'lucide-vue-next';

const props = defineProps<{
  plan: any;
}>();

defineEmits<{
  (e: 'edit', plan: any): void;
  (e: 'archive', id: number): void;
}>();

const router = useRouter();

const navigateToPlan = () => {
  const targetSlug = props.plan.slug || props.plan.id;
  navigateTo(`/plans/${targetSlug}`);
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO');
};
</script>
