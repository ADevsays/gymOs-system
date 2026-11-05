<template>
  <div class="w-full flex flex-col pb-12">
    <!-- Top Header -->
    <header class="px-6 lg:px-8 py-5 lg:py-6 border-b border-border/30 flex items-center justify-between gap-4 shrink-0">
      <div class="pt-1.5 md:pt-2">
        <h1 class="font-display font-bold text-2xl tracking-wide uppercase text-text">Inventario de Productos</h1>
      </div>

      <div class="flex items-center gap-2.5 shrink-0">
        <button 
          @click="isCategoryModalOpen = true"
          class="bg-surface-2 border border-border text-text hover:border-accent hover:text-accent cursor-pointer active:scale-[0.99] flex items-center justify-center gap-1.5 lg:gap-2 py-2 px-3.5 lg:py-2.5 lg:px-4 rounded-xl font-bold uppercase tracking-wider transition-all duration-200 text-xs lg:text-sm shrink-0 shadow-xs"
          title="Gestionar categorías dinámicas"
        >
          <Tags class="w-4 h-4 text-accent" />
          <span>Categorías</span>
        </button>

        <button 
          @click="openCreateModal"
          class="bg-accent text-white border-accent cursor-pointer hover:bg-accent-soft active:scale-[0.99] flex items-center justify-center gap-1.5 lg:gap-2 py-2 px-3.5 lg:py-2.5 lg:px-5 rounded-xl font-bold uppercase tracking-wider transition-all duration-200 text-xs lg:text-sm shadow-md shrink-0"
        >
          <Plus class="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>
    </header>

    <!-- Content Area -->
    <div class="px-6 lg:px-8 py-6 flex flex-col gap-6">
      <!-- KPI Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text shrink-0">
            <Package class="w-5 h-5" />
          </div>
          <div class="min-w-0 flex flex-col justify-center">
            <span class="text-[11px] text-muted uppercase font-semibold tracking-wider block truncate">Total Catálogo</span>
            <p class="font-display font-bold text-xl lg:text-2xl text-text leading-none mt-1 truncate">{{ stats.totalProducts }}</p>
          </div>
        </div>

        <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-accent shrink-0">
            <Boxes class="w-5 h-5" />
          </div>
          <div class="min-w-0 flex flex-col justify-center">
            <span class="text-[11px] text-muted uppercase font-semibold tracking-wider block truncate">Unidades en Stock</span>
            <p class="font-display font-bold text-xl lg:text-2xl text-accent leading-none mt-1 truncate">{{ stats.totalStockUnits }}</p>
          </div>
        </div>

        <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-success shrink-0">
            <DollarSign class="w-5 h-5" />
          </div>
          <div class="min-w-0 flex flex-col justify-center">
            <span class="text-[11px] text-muted uppercase font-semibold tracking-wider block truncate">Valor Estimado</span>
            <p class="font-display font-bold text-xl lg:text-2xl text-success leading-none mt-1 truncate">${{ formatCurrency(stats.totalValue) }}</p>
          </div>
        </div>

        <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div 
            :class="[
              'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
              stats.lowStockCount > 0 ? 'bg-warning/15 border-warning/30 text-warning' : 'bg-surface-2 border-border text-muted'
            ]"
          >
            <AlertTriangle class="w-5 h-5" />
          </div>
          <div class="min-w-0 flex flex-col justify-center">
            <span class="text-[11px] text-muted uppercase font-semibold tracking-wider block truncate">Por Agotarse</span>
            <p :class="['font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate', stats.lowStockCount > 0 ? 'text-warning' : 'text-text']">{{ stats.lowStockCount }}</p>
          </div>
        </div>
      </div>

      <!-- Filters & Search Bar -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface border border-border p-3.5 rounded-xl">
        <!-- Category Pills -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button 
            v-for="cat in categoryFilters"
            :key="cat.id"
            @click="setCategory(cat.id)"
            :class="[
              'py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border',
              selectedCategory === cat.id 
                ? 'bg-accent text-white border-accent' 
                : 'bg-surface-2 text-muted border-border hover:text-text hover:border-border'
            ]"
          >
            {{ cat.label }}
          </button>

          <button
            @click="isCategoryModalOpen = true"
            class="py-1.5 px-2 rounded-lg text-xs font-semibold bg-surface-2 text-muted border border-border hover:text-accent hover:border-accent transition-colors cursor-pointer shrink-0 flex items-center gap-1"
            title="Gestionar categorías"
          >
            <Tags class="w-3.5 h-3.5 text-accent" />
            <span class="hidden sm:inline">Editar</span>
          </button>
        </div>

        <!-- Search & Low Stock Toggle -->
        <div class="flex items-center gap-2.5">
          <button 
            @click="toggleLowStock"
            :class="[
              'py-1.5 px-2.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer shrink-0',
              onlyLowStock 
                ? 'bg-warning/20 border-warning text-warning' 
                : 'bg-surface-2 border-border text-muted hover:text-text'
            ]"
            title="Filtrar productos con stock menor o igual al mínimo"
          >
            <AlertTriangle class="w-3.5 h-3.5" />
            <span>Stock Bajo</span>
          </button>

          <div class="relative w-full sm:w-64">
            <Search class="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              v-model="searchQuery"
              @input="onSearchInput"
              type="text"
              placeholder="Buscar producto o código..."
              class="w-full bg-surface-2 border border-border text-text text-xs pl-8 pr-3 py-1.5 rounded-lg outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
      </div>

      <!-- Products Grid Area -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
      </div>

      <!-- Empty State -->
      <div 
        v-else-if="products.length === 0" 
        class="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-12 text-center bg-surface-2/30 my-4"
      >
        <div class="w-14 h-14 bg-surface border border-border rounded-full flex items-center justify-center mb-3">
          <Package class="w-7 h-7 text-muted" />
        </div>
        <h3 class="font-display font-bold text-lg text-text mb-1">No hay productos disponibles</h3>
        <p class="text-xs text-muted max-w-sm mb-4">
          {{ searchQuery || selectedCategory !== 'all' || onlyLowStock ? 'No hay productos que coincidan con los filtros seleccionados.' : 'Empieza agregando las bebidas, snacks o suplementos que se venden en el gimnasio.' }}
        </p>
        <button 
          @click="openCreateModal"
          class="bg-accent text-white border-accent cursor-pointer hover:bg-accent-soft flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl font-bold uppercase tracking-wider text-xs shadow-sm transition-all"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Agregar Primer Producto</span>
        </button>
      </div>

      <!-- Grid of Products -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 md:gap-4">
        <ProductCard 
          v-for="prod in products" 
          :key="prod.id" 
          :product="prod"
          @edit="openEditModal"
          @delete="handleDelete"
          @adjust-stock="handleAdjustStock"
        />
      </div>
    </div>

    <!-- Product Form Modal -->
    <ProductFormModal 
      :is-open="isFormModalOpen"
      :editing-product="editingProduct"
      :categories="categories"
      :saving="saving"
      @close="closeFormModal"
      @save="handleSaveProduct"
    />

    <!-- Category Manager Modal -->
    <CategoryManagerModal
      :is-open="isCategoryModalOpen"
      :categories="categories"
      @close="isCategoryModalOpen = false"
      @create="handleCreateCategory"
      @update="handleUpdateCategory"
      @delete="handleDeleteCategory"
    />

    <!-- Delete Product Confirmation Modal -->
    <AppConfirmDeleteModal
      :is-open="isDeleteModalOpen"
      title="Eliminar Producto"
      subtitle="El producto será removido del catálogo de inventario."
      :item-title="productToDelete?.name"
      :description="productToDelete ? `Stock actual: ${productToDelete.stock} unidades. Si eliminas este producto, ya no aparecerá en el punto de venta.` : ''"
      confirm-text="Sí, Eliminar"
      :loading="deleteLoading"
      @close="isDeleteModalOpen = false"
      @confirm="confirmDeleteProduct"
    />

    <!-- Stock Adjustment Warning/Confirmation Modal -->
    <AppModal
      :is-open="isStockModalOpen"
      title="Ajuste Manual de Stock"
      :icon="AlertTriangle"
      max-width="max-w-lg"
      @close="closeStockModal"
      @dismiss="closeStockModal"
    >
      <div v-if="stockAdjustProduct" class="flex flex-col gap-3.5">
        <!-- Warning Banner -->
        <div 
          :class="[
            'p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-3',
            stockAdjustDelta > 0 
              ? 'bg-warning/15 border-warning/30 text-warning' 
              : 'bg-surface-2 border-border text-muted'
          ]"
        >
          <AlertTriangle class="w-5 h-5 shrink-0 mt-0.5 text-warning" />
          <div class="flex flex-col gap-1">
            <span class="font-bold uppercase tracking-wider text-text">
              {{ stockAdjustDelta > 0 ? 'Advertencia de Egreso en Caja' : 'Ajuste de Merma o Corrección' }}
            </span>
            <p v-if="stockAdjustDelta > 0" class="text-text/90">
              Aumentar el stock manualmente <strong>no descuenta dinero de la caja diaria</strong> ni registra la compra al proveedor. Si compraste este producto con dinero del gimnasio, debes registrarlo desde <strong>Caja &gt; Nuevo Movimiento &gt; Compra Stock</strong> para mantener la caja cuadrada.
            </p>
            <p v-else class="text-text/90">
              Disminuir stock manualmente <strong>no registra un ingreso de dinero en caja</strong>. Úsalo solo para registrar mermas, productos dañados, vencimientos o autoconsumo.
            </p>
          </div>
        </div>

        <!-- Product Stock Transition Card -->
        <div class="bg-surface-2 border border-border rounded-xl p-3.5 flex items-center justify-between">
          <div class="flex flex-col min-w-0 pr-2">
            <span class="font-bold text-sm text-text truncate">{{ stockAdjustProduct.name }}</span>
            <span class="text-xs text-muted">
              {{ stockAdjustDelta > 0 ? 'Entrada manual directa (+1)' : 'Salida manual directa (-1)' }}
            </span>
          </div>

          <div class="flex items-center gap-2 font-mono shrink-0">
            <div class="bg-surface px-2.5 py-1 rounded-lg border border-border text-center">
              <span class="text-[10px] uppercase text-muted block">Actual</span>
              <span class="font-bold text-sm text-text">{{ stockAdjustProduct.stock }}</span>
            </div>
            <ArrowRight class="w-4 h-4 text-muted" />
            <div 
              :class="[
                'px-2.5 py-1 rounded-lg border text-center font-bold text-sm',
                stockAdjustDelta > 0 ? 'bg-success/15 border-success/30 text-success' : 'bg-danger/15 border-danger/30 text-danger'
              ]"
            >
              <span class="text-[10px] uppercase block opacity-80">Nuevo</span>
              <span>{{ Math.max(0, stockAdjustProduct.stock + stockAdjustDelta) }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center gap-3">
          <button 
            type="button" 
            @click="closeStockModal"
            class="flex-1 py-2.5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            @click="confirmStockAdjustment"
            :disabled="stockAdjusting"
            class="flex-1 py-2.5 rounded-xl bg-accent text-white border border-accent hover:bg-accent-soft disabled:opacity-50 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <span v-if="stockAdjusting" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
            <span v-else>Confirmar Ajuste</span>
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Package, Boxes, DollarSign, AlertTriangle, Search, Plus, Tags, ArrowRight } from 'lucide-vue-next';
import { useInventory } from '../composables/useInventory';
import ProductCard from '../components/ProductCard.vue';
import ProductFormModal from '../components/ProductFormModal.vue';
import CategoryManagerModal from '../components/CategoryManagerModal.vue';
import AppConfirmDeleteModal from '~/ui/components/AppConfirmDeleteModal.vue';
import AppModal from '~/ui/components/AppModal.vue';
import type { Product } from '../types';

const {
  products,
  categories,
  stats,
  loading,
  selectedCategory,
  searchQuery,
  onlyLowStock,
  fetchProducts,
  fetchCategories,
  fetchStats,
  createProduct,
  updateProduct,
  adjustStock,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
} = useInventory();

const categoryFilters = computed(() => [
  { id: 'all', label: 'Todos' },
  ...categories.value.map((c) => ({ id: c.slug, label: c.name })),
]);

// Modal states
const isFormModalOpen = ref(false);
const isCategoryModalOpen = ref(false);
const editingProduct = ref<Product | null>(null);
const saving = ref(false);

// Deletion State
const isDeleteModalOpen = ref(false);
const productToDelete = ref<any>(null);
const deleteLoading = ref(false);

let searchTimeout: any = null;

onMounted(() => {
  fetchProducts();
  fetchCategories();
  fetchStats();
});

const setCategory = (catId: string) => {
  selectedCategory.value = catId;
  fetchProducts();
};

const toggleLowStock = () => {
  onlyLowStock.value = !onlyLowStock.value;
  fetchProducts();
};

const onSearchInput = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchProducts();
  }, 250);
};

const openCreateModal = () => {
  editingProduct.value = null;
  isFormModalOpen.value = true;
};

const openEditModal = (product: Product) => {
  editingProduct.value = product;
  isFormModalOpen.value = true;
};

const closeFormModal = () => {
  isFormModalOpen.value = false;
  editingProduct.value = null;
};

const handleSaveProduct = async (payload: any) => {
  saving.value = true;
  let res;
  if (editingProduct.value) {
    res = await updateProduct(editingProduct.value.id, payload);
  } else {
    res = await createProduct(payload);
  }
  saving.value = false;

  if (res.success) {
    closeFormModal();
  } else {
    alert(res.error);
  }
};

// Stock Adjustment State
const isStockModalOpen = ref(false);
const stockAdjustProduct = ref<Product | null>(null);
const stockAdjustDelta = ref<number>(0);
const stockAdjusting = ref(false);

const handleAdjustStock = (id: number, delta: number) => {
  const prod = products.value.find((p) => p.id === id);
  if (!prod) return;
  stockAdjustProduct.value = prod;
  stockAdjustDelta.value = delta;
  isStockModalOpen.value = true;
};

const closeStockModal = () => {
  isStockModalOpen.value = false;
  stockAdjustProduct.value = null;
  stockAdjustDelta.value = 0;
};

const confirmStockAdjustment = async () => {
  if (!stockAdjustProduct.value || stockAdjustDelta.value === 0) return;
  stockAdjusting.value = true;
  await adjustStock(stockAdjustProduct.value.id, stockAdjustDelta.value);
  stockAdjusting.value = false;
  closeStockModal();
};

const handleDelete = (id: number) => {
  const target = products.value.find((p) => p.id === id);
  productToDelete.value = target || { id, name: 'Producto seleccionado', stock: 0 };
  isDeleteModalOpen.value = true;
};

const confirmDeleteProduct = async () => {
  if (!productToDelete.value) return;
  deleteLoading.value = true;
  await deleteProduct(productToDelete.value.id);
  deleteLoading.value = false;
  isDeleteModalOpen.value = false;
  productToDelete.value = null;
};

const handleCreateCategory = async (name: string) => {
  const res = await createCategory(name);
  if (!res.success) throw new Error(res.error || 'Error al crear la categoría');
  await fetchProducts();
};

const handleUpdateCategory = async (id: number, name: string) => {
  const res = await updateCategory(id, name);
  if (!res.success) throw new Error(res.error || 'Error al actualizar la categoría');
  await fetchProducts();
};

const handleDeleteCategory = async (id: number) => {
  const res = await deleteCategory(id);
  if (!res.success) throw new Error(res.error || 'Error al eliminar la categoría');
  if (selectedCategory.value !== 'all') {
    selectedCategory.value = 'all';
  }
  await fetchProducts();
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val || 0);
};
</script>
