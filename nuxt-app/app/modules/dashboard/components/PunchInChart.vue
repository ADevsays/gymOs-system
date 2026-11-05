<template>
  <NuxtLink 
    to="/analytics?tab=attendance" 
    class="bg-surface rounded-3xl p-5 shadow-sm border border-border flex flex-col relative overflow-hidden group hover:border-border/90 hover:bg-surface-2/20 transition-all duration-200 cursor-pointer"
  >
    <div class="flex justify-between items-start mb-3">
      <div class="flex items-center gap-1.5">
        <span class="text-muted font-medium text-xs group-hover:text-text transition-colors">Asistencia</span>
        <ArrowUpRight class="w-3.5 h-3.5 text-muted/60 opacity-0 group-hover:opacity-100 group-hover:text-text transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>

      <!-- Quick Add Attendance Button -->
      <button 
        type="button"
        @click.stop.prevent="$emit('record')"
        :disabled="submitting"
        class="bg-accent text-white hover:bg-accent-soft active:scale-95 transition-all text-[11px] font-bold uppercase tracking-wider py-1.5 px-2.5 rounded-xl flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50 shrink-0 z-10"
        title="Registrar asistencia ahora"
      >
        <span v-if="submitting" class="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></span>
        <Plus v-else class="w-3.5 h-3.5" />
        <span>Agregar asistencia</span>
      </button>
    </div>

    <div class="flex items-baseline justify-between mb-1">
      <div class="text-2xl font-display font-semibold text-text">
        {{ punchIn.totalVisits }}
      </div>
      <div class="w-8 h-8 rounded-xl bg-surface-2 flex items-center justify-center border border-border group-hover:border-border/80 transition-colors">
        <UserCheck class="w-4 h-4 text-text" />
      </div>
    </div>

    <div class="text-[10px] text-muted mb-2">
      Visitas últimos 7 días
    </div>

    <div class="relative h-20 mt-auto w-full pointer-events-none">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { UserCheck, Plus, ArrowUpRight } from 'lucide-vue-next';
import { Line } from 'vue-chartjs';

const props = defineProps<{
  punchIn: {
    totalVisits: number;
    daily: { day: string; count: number }[];
  };
  submitting?: boolean;
}>();

defineEmits<{
  (e: 'record'): void;
}>();

const accentColor = ref('#E60000');

onMounted(() => {
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    const cssAccent = getComputedStyle(root).getPropertyValue('--color-accent').trim();
    if (cssAccent) accentColor.value = cssAccent;
    
    const observer = new MutationObserver(() => {
      const newAccent = getComputedStyle(root).getPropertyValue('--color-accent').trim();
      if (newAccent) accentColor.value = newAccent;
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  }
});

const chartData = computed(() => {
  const currentAccent = accentColor.value;
  const daily = props.punchIn.daily || [];

  return {
    labels: daily.map(d => d.day),
    datasets: [{
      data: daily.map(d => d.count),
      borderColor: currentAccent,
      borderWidth: 2,
      pointBackgroundColor: currentAccent,
      pointRadius: 2.5,
      pointHoverRadius: 4.5,
      tension: 0.35,
      fill: true,
      backgroundColor: (ctx: any) => {
        const canvas = ctx.chart.ctx;
        const gradient = canvas.createLinearGradient(0, 0, 0, 80);
        gradient.addColorStop(0, `${currentAccent}35`);
        gradient.addColorStop(1, `${currentAccent}00`);
        return gradient;
      }
    }]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: { 
    legend: { display: false }, 
    tooltip: { 
      enabled: true,
      displayColors: false,
      callbacks: {
        label: (context: any) => `${context.parsed.y} asistencias`
      }
    } 
  },
  scales: {
    x: { display: false },
    y: { display: false, min: 0 }
  },
  layout: { padding: { top: 6, bottom: 6 } }
};
</script>

<style scoped>
@reference "~/assets/css/main.css";
</style>
