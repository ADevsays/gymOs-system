<template>
  <div 
    @click="handleClick"
    class="relative w-80 group cursor-pointer select-none"
  >
    <SearchIcon class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted group-hover:text-accent transition-colors z-10" />
    <div class="w-full bg-surface-2/80 group-hover:bg-surface-2 border border-border/70 group-hover:border-accent/50 text-muted/70 pl-10 pr-16 py-2 rounded-xl text-sm font-body shadow-inner flex items-center transition-all duration-200">
      Buscar miembros...
    </div>
    <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
      <kbd class="px-2 py-0.5 text-[10px] font-mono text-muted bg-surface border border-border/60 rounded font-semibold shadow-xs">Ctrl+K</kbd>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { SearchIcon } from 'lucide-vue-next';

const router = useRouter();

const handleClick = () => {
  router.push('/members?focus=1');
};
</script>
