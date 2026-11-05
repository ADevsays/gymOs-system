<template>
  <aside class="w-panel h-full bg-surface border-l border-border flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.2)] z-10 relative">
    <div class="p-6 border-b border-border flex-shrink-0">
      <h2 class="text-lg font-display font-medium text-text">Detalles</h2>
      <p class="text-sm text-muted mt-1">Selecciona un elemento para ver más</p>
    </div>
    
    <div class="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center opacity-50">
      <div class="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
        <span class="text-2xl">👀</span>
      </div>
      <p class="text-muted">No hay selección activa</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
// This panel will eventually be dynamic based on the active page and selection
</script>
