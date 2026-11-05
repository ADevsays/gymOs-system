<template>
  <NuxtLink 
    to="/analytics?tab=revenue" 
    class="bg-surface rounded-3xl p-5 shadow-sm border border-border flex flex-col relative overflow-hidden group hover:border-border/90 hover:bg-surface-2/20 transition-all duration-200 cursor-pointer"
  >
    <div class="flex justify-between items-start mb-4">
      <div class="flex items-center gap-1.5">
        <span class="text-muted font-medium text-xs group-hover:text-text transition-colors">Cartera Activa Mensual</span>
        <ArrowUpRight class="w-3.5 h-3.5 text-muted/60 opacity-0 group-hover:opacity-100 group-hover:text-text transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <div class="w-9 h-9 rounded-2xl bg-surface-2 flex items-center justify-center border border-border group-hover:border-border/80 transition-colors">
        <DollarSign class="w-4 h-4 text-accent" />
      </div>
    </div>
    <div class="flex items-baseline justify-between mb-1">
      <div class="text-2xl lg:text-3xl font-display font-semibold text-text transition-colors">
        {{ formattedPortfolio }}
      </div>
    </div>
    <div 
      v-if="revenue.activeSubscriptionsPortfolioChange !== null && revenue.activeSubscriptionsPortfolioChange !== undefined" 
      class="text-[10px] font-medium mb-2" 
      :class="revenue.activeSubscriptionsPortfolioChange >= 0 ? 'text-success' : 'text-danger'"
    >
      {{ revenue.activeSubscriptionsPortfolioChange >= 0 ? '▲' : '▼' }} {{ Math.abs(revenue.activeSubscriptionsPortfolioChange) }}% vs mes anterior
    </div>
    <div class="relative h-20 mt-auto w-full pointer-events-none">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { DollarSign, ArrowUpRight } from 'lucide-vue-next';
import { Line } from 'vue-chartjs';

const props = defineProps<{
  revenue: {
    totalBalance?: number;
    totalIncome?: number;
    totalExpenses?: number;
    currentMonth: number;
    previousMonth: number;
    activeSubscriptionsTotal?: number;
    activeSubscriptionsCount?: number;
    activeSubscriptionsPortfolioChange?: number | null;
    monthlyActiveSubscriptions?: { month: string; total: number }[];
    monthly: { month: string; total: number }[];
  };
  revenueChange?: number | null;
}>();

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

const formattedPortfolio = computed(() => {
  return formatCurrency(props.revenue.activeSubscriptionsTotal ?? 0);
});

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
  const list = props.revenue.monthlyActiveSubscriptions && props.revenue.monthlyActiveSubscriptions.length > 0
    ? props.revenue.monthlyActiveSubscriptions
    : props.revenue.monthly || [];
  const recent = list.slice(-6);
  return {
    labels: recent.map(m => m.month),
    datasets: [{
      data: recent.map(m => m.total),
      borderColor: currentAccent,
      borderWidth: 2,
      pointBackgroundColor: currentAccent,
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0.4,
      fill: true,
      backgroundColor: (ctx: any) => {
        const canvas = ctx.chart.ctx;
        const gradient = canvas.createLinearGradient(0, 0, 0, 100);
        gradient.addColorStop(0, `${currentAccent}33`);
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
        label: (context: any) => {
          return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
          }).format(context.parsed.y);
        }
      }
    } 
  },
  scales: {
    x: { display: false },
    y: { display: false, min: 0 }
  },
  layout: { padding: { top: 10, bottom: 10 } }
};
</script>

<style scoped>
@reference "~/assets/css/main.css";
</style>
