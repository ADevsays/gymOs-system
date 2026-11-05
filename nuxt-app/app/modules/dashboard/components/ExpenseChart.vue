<template>
  <NuxtLink 
    to="/analytics?tab=churn"
    class="bg-surface rounded-3xl p-5 shadow-sm border border-border flex flex-col relative overflow-hidden group hover:border-border/90 hover:bg-surface-2/20 transition-all duration-200 cursor-pointer"
  >
    <div class="flex justify-between items-start mb-4">
      <div class="flex items-center gap-1.5">
        <span class="text-muted font-medium text-xs group-hover:text-text transition-colors">No Renovaciones / Cancelaciones</span>
        <ArrowUpRight class="w-3.5 h-3.5 text-muted/60 opacity-0 group-hover:opacity-100 group-hover:text-text transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <div class="w-9 h-9 rounded-2xl bg-surface-2 flex items-center justify-center border border-border group-hover:border-border/80 transition-colors">
        <UserX class="w-4 h-4 text-danger" />
      </div>
    </div>
    <div class="text-2xl lg:text-3xl font-display font-bold text-text mb-1">
      {{ churn.rate }}%
    </div>
    <div class="text-xs text-muted mb-2">
      {{ churn.totalChurned }} de {{ churn.totalActive }} miembros
    </div>
    <div class="relative h-20 mt-auto w-full pointer-events-none">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { UserX, ArrowUpRight } from 'lucide-vue-next';
import { Line } from 'vue-chartjs';

const props = defineProps<{
  churn: {
    totalActive: number;
    totalChurned: number;
    rate: number;
    renewalsMonth?: number;
    daily: { day: string; count: number }[];
  }
}>();

const dangerColor = ref('#EF4444');

onMounted(() => {
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    const cssDanger = getComputedStyle(root).getPropertyValue('--color-danger').trim();
    if (cssDanger) dangerColor.value = cssDanger;
    
    const observer = new MutationObserver(() => {
      const newDanger = getComputedStyle(root).getPropertyValue('--color-danger').trim();
      if (newDanger) dangerColor.value = newDanger;
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  }
});

const chartData = computed(() => {
  const currentDanger = dangerColor.value;
  const daily = props.churn.daily || [];

  return {
    labels: daily.map(d => d.day),
    datasets: [{
      data: daily.map(d => d.count),
      borderColor: currentDanger,
      borderWidth: 2,
      pointBackgroundColor: currentDanger,
      pointRadius: 2.5,
      pointHoverRadius: 4.5,
      tension: 0.35,
      fill: true,
      backgroundColor: (ctx: any) => {
        const canvas = ctx.chart.ctx;
        const gradient = canvas.createLinearGradient(0, 0, 0, 80);
        gradient.addColorStop(0, `${currentDanger}35`);
        gradient.addColorStop(1, `${currentDanger}00`);
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
        label: (context: any) => `${context.parsed.y} cancelaciones`
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
