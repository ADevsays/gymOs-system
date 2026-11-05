<template>
  <div class="bg-surface border border-border rounded-xl p-3.5 md:p-4 flex flex-col relative transition-all duration-300 hover:border-accent/40 hover:shadow-md group">
    <!-- Top Image & Badges -->
    <div class="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-surface-2 border border-border/60 mb-3 flex items-center justify-center">
      <img 
        v-if="product.photoPath" 
        :src="product.photoPath" 
        :alt="product.name" 
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div v-else class="flex flex-col items-center justify-center text-muted/60">
        <Package class="w-8 h-8 mb-1" />
        <span class="text-[10px] uppercase font-bold tracking-wider">{{ product.category }}</span>
      </div>

      <!-- Category badge -->
      <span class="absolute top-2 left-2 bg-surface/85 backdrop-blur-xs border border-border/80 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-text">
        {{ product.categoryName || getCategoryLabel(product.category) }}
      </span>

      <!-- Stock status badge -->
      <span 
        :class="[
          'absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border backdrop-blur-xs',
          stockBadgeClass
        ]"
      >
        {{ stockBadgeText }}
      </span>
    </div>

    <!-- Title & Price -->
    <h3 class="font-medium text-text text-sm mb-1 leading-snug line-clamp-1 group-hover:text-accent transition-colors" :title="product.name">
      {{ product.name }}
    </h3>

    <div class="flex items-baseline justify-between gap-2 mb-3">
      <span class="font-display text-lg md:text-xl font-bold text-accent">
        ${{ formatCurrency(product.price) }}
      </span>
      <span v-if="product.barcode" class="text-[10px] font-mono text-muted truncate">
        #{{ product.barcode }}
      </span>
    </div>

    <!-- Quick Stock Adjustment -->
    <div class="bg-surface-2/70 border border-border/80 rounded-lg p-1.5 flex items-center justify-between gap-2 mb-3">
      <span class="text-[11px] text-muted font-medium pl-1.5">Stock:</span>
      <div class="flex items-center gap-1.5">
        <button 
          @click.stop="decreaseStock"
          :disabled="product.stock <= 0"
          class="w-6 h-6 rounded bg-surface border border-border text-muted hover:text-text hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
          title="Disminuir 1 unidad"
        >
          <Minus class="w-3 h-3" />
        </button>
        <span class="font-mono font-bold text-xs text-text w-7 text-center">{{ product.stock }}</span>
        <button 
          @click.stop="increaseStock"
          class="w-6 h-6 rounded bg-surface border border-border text-muted hover:text-text hover:border-accent flex items-center justify-center transition-colors cursor-pointer"
          title="Aumentar 1 unidad"
        >
          <Plus class="w-3 h-3" />
        </button>
      </div>
    </div>

    <!-- Bottom Actions -->
    <div class="flex gap-1.5 mt-auto border-t border-border/50 pt-2.5">
      <button 
        @click="$emit('edit', product)"
        class="flex-1 bg-surface-2 text-text border border-border cursor-pointer hover:border-accent hover:text-accent transition-colors duration-200 py-1.5 rounded-lg font-bold uppercase tracking-wider text-[11px]"
      >
        Editar
      </button>
      <button 
        @click="$emit('delete', product.id)"
        class="px-2.5 bg-surface-2 text-muted border border-border cursor-pointer hover:border-danger hover:text-danger transition-colors duration-200 py-1.5 rounded-lg"
        title="Eliminar producto"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Package, Plus, Minus, Trash2 } from 'lucide-vue-next';
import type { Product } from '../types';

const props = defineProps<{
  product: Product;
}>();

const emit = defineEmits<{
  (e: 'edit', product: Product): void;
  (e: 'delete', id: number): void;
  (e: 'adjust-stock', id: number, delta: number): void;
}>();

const increaseStock = () => {
  emit('adjust-stock', props.product.id, 1);
};

const decreaseStock = () => {
  if (props.product.stock > 0) {
    emit('adjust-stock', props.product.id, -1);
  }
};

const stockBadgeClass = computed(() => {
  if (props.product.stock <= 0) {
    return 'bg-danger/20 text-danger border-danger/30';
  }
  if (props.product.stock <= (props.product.minStock || 5)) {
    return 'bg-warning/20 text-warning border-warning/30';
  }
  return 'bg-success/20 text-success border-success/30';
});

const stockBadgeText = computed(() => {
  if (props.product.stock <= 0) return 'Agotado';
  if (props.product.stock <= (props.product.minStock || 5)) return 'Bajo stock';
  return 'En stock';
});

const getCategoryLabel = (cat: string) => {
  const map: Record<string, string> = {
    bebidas: 'Bebida',
    proteinas: 'Proteína',
    snacks: 'Snack',
    suplementos: 'Suplemento',
    accesorios: 'Accesorio',
    otros: 'Otro',
  };
  return map[cat] || cat;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val || 0);
};
</script>
