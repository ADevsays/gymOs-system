<template>
  <span :class="badgeClass" class="px-2 py-1 rounded font-bold uppercase tracking-widest text-[10px] inline-flex items-center gap-1">
    <span v-if="status === 'active'" class="w-1.5 h-1.5 rounded-full bg-success"></span>
    <span v-else-if="status === 'warning'" class="w-1.5 h-1.5 rounded-full bg-warning"></span>
    <span v-else class="w-1.5 h-1.5 rounded-full bg-danger"></span>
    {{ text }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  daysRemaining: number;
  isActive: boolean;
}>();

const status = computed(() => {
  if (props.daysRemaining === Infinity || !isFinite(props.daysRemaining)) return 'active';
  if (!props.isActive || props.daysRemaining < 0) return 'expired';
  if (props.daysRemaining <= 7) return 'warning';
  return 'active';
});

const text = computed(() => {
  if (props.daysRemaining === Infinity || !isFinite(props.daysRemaining)) return 'No vence';
  if (status.value === 'expired') return 'Vencido';
  return `${props.daysRemaining} días`;
});

const badgeClass = computed(() => {
  if (status.value === 'active') return 'bg-success/10 text-success border border-success/20';
  if (status.value === 'warning') return 'bg-warning/10 text-warning border border-warning/20';
  return 'bg-danger/10 text-danger border border-danger/20';
});
</script>
<style scoped>
@reference "~/assets/css/main.css";
</style>
