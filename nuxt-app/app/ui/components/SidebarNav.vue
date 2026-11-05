<template>
  <aside class="w-(--sidebar-icon-width) h-full bg-bg border-r border-border flex flex-col items-center py-6 z-20">
    <!-- Logo area -->
    <div class="mb-10 w-10 h-10 rounded-xl overflow-hidden shadow-md">
      <img src="/img/logo-agod.png" alt="Gym AGOD" class="w-full h-full object-cover" />
    </div>

    <!-- Navigation Links -->
    <nav class="flex-1 w-full flex flex-col gap-4 px-3">
      <NuxtLink to="/" class="group w-full aspect-square rounded-2xl flex items-center justify-center text-muted hover:text-text hover:bg-surface transition-all duration-300 relative" active-class="bg-surface text-text shadow-sm text-text">
        <LayoutDashboard class="w-5 h-5 transition-transform group-hover:scale-110" />
      </NuxtLink>
      
      <NuxtLink to="/members" class="group w-full aspect-square rounded-2xl flex items-center justify-center text-muted hover:text-text hover:bg-surface transition-all duration-300 relative" active-class="bg-surface text-text shadow-sm text-text">
        <Users class="w-5 h-5 transition-transform group-hover:scale-110" />
      </NuxtLink>
      
      <NuxtLink to="/plans" class="group w-full aspect-square rounded-2xl flex items-center justify-center text-muted hover:text-text hover:bg-surface transition-all duration-300 relative" active-class="bg-surface text-text shadow-sm text-text">
        <Dumbbell class="w-5 h-5 transition-transform group-hover:scale-110" />
      </NuxtLink>
      
      <NuxtLink to="/inventory" class="group w-full aspect-square rounded-2xl flex items-center justify-center text-muted hover:text-text hover:bg-surface transition-all duration-300 relative" active-class="bg-surface text-text shadow-sm text-text" title="Inventario de Productos">
        <Package class="w-5 h-5 transition-transform group-hover:scale-110" />
      </NuxtLink>
      
      <NuxtLink to="/cash" class="group w-full aspect-square rounded-2xl flex items-center justify-center text-muted hover:text-text hover:bg-surface transition-all duration-300 relative" active-class="bg-surface text-text shadow-sm text-text" title="Caja y Flujo Diario">
        <Receipt class="w-5 h-5 transition-transform group-hover:scale-110" />
      </NuxtLink>

      <NuxtLink to="/analytics" class="group w-full aspect-square rounded-2xl flex items-center justify-center text-muted hover:text-text hover:bg-surface transition-all duration-300 relative" active-class="bg-surface text-text shadow-sm text-text" title="Métricas y Datos">
        <BarChart3 class="w-5 h-5 transition-transform group-hover:scale-110" />
      </NuxtLink>
    </nav>

    <!-- Bottom Actions -->
    <div class="mt-auto w-full px-3 flex flex-col gap-4 pb-4">
      <button @click="toggleTheme" class="group w-full aspect-square rounded-2xl flex items-center justify-center text-muted hover:text-text hover:bg-surface transition-all duration-300 relative" title="Cambiar Tema">
        <Sun v-if="isDark" class="w-5 h-5 transition-transform group-hover:scale-110" />
        <Moon v-else class="w-5 h-5 transition-transform group-hover:scale-110" />
      </button>
      
      <!-- User profile mock -->
      <div class="w-full aspect-square rounded-full bg-surface border-2 border-surface shadow-sm overflow-hidden mt-4 cursor-pointer">
        <div class="w-full h-full bg-accent text-surface flex items-center justify-center font-bold text-sm">
          A
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { LayoutDashboard, Users, Dumbbell, Package, Receipt, BarChart3, Sun, Moon } from 'lucide-vue-next';
import { useTheme } from '~/composables/useTheme';

const { isDark, toggleTheme } = useTheme();
</script>
