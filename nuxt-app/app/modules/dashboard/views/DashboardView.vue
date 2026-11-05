<template>
  <div class="w-full flex flex-col pb-6">
    
    <!-- Dashboard Top Header -->
    <div class="px-6 lg:px-8 py-5 lg:py-6 border-b border-border/30 flex items-center justify-between gap-4 shrink-0">
      <h1 class="font-display font-bold text-2xl tracking-wide uppercase text-text">Panel de Control</h1>
      <GlobalSearchTrigger />
    </div>

    <!-- Dashboard Content Area -->
    <div class="px-6 lg:px-8 py-6 flex flex-col gap-4 md:gap-5">
      <!-- Hero Widget -->
      <DashboardHero :total-members="totalMembers" />

      <!-- Small Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 animate-reveal delay-100 shrink-0">
        <PunchInChart 
          :punch-in="punchIn" 
          :submitting="recordingAttendance"
          @record="recordQuickAttendance"
        />
        <RevenueChart :revenue="revenue" :revenue-change="revenueChange" />
        <ExpenseChart :churn="churn" />
      </div>

      <!-- Popular Plan Wide Widget -->
      <PopularPlanWidget :popular-plan="popularPlan" />
    </div>

  </div>
</template>

<script setup lang="ts">
import GlobalSearchTrigger from '~/ui/components/GlobalSearchTrigger.vue';
import { useDashboard } from '../composables/useDashboard';
import DashboardHero from '../components/DashboardHero.vue';
import PunchInChart from '../components/PunchInChart.vue';
import RevenueChart from '../components/RevenueChart.vue';
import ExpenseChart from '../components/ExpenseChart.vue';
import PopularPlanWidget from '../components/PopularPlanWidget.vue';

// Import and register ChartJS globally for this view
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const { 
  fetchStats, 
  revenue, 
  churn, 
  punchIn, 
  popularPlan, 
  totalMembers, 
  revenueChange,
  recordingAttendance,
  recordQuickAttendance,
} = useDashboard();

await fetchStats();
</script>
