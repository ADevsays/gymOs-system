<template>
  <AppModal
    :is-open="isOpen"
    title="Nuevo Movimiento"
    :icon="Layers"
    max-width="max-w-2xl"
    @close="handleClose"
    @dismiss="handleDismiss"
  >
    <!-- Search and Contextual Dropdown -->
    <div class="flex flex-col gap-2 relative">
      <label class="text-xs font-semibold text-muted uppercase tracking-wider">
        Buscar o Agregar Partida
      </label>
      
      <div class="relative w-full">
        <AppInput
          v-model="searchQuery"
          placeholder="Buscar producto por nombre o código, o escribir concepto..."
          input-class="pr-10"
          @focus="isSearchFocused = true"
          @blur="handleSearchBlur"
          @keydown.esc="closeSearchDropdown"
        >
          <template #prefix>
            <Search class="w-4 h-4 text-muted" />
          </template>
          <template #suffix>
            <button 
              v-if="searchQuery" 
              @click="searchQuery = ''" 
              class="pointer-events-auto cursor-pointer text-muted hover:text-text p-0.5"
              type="button"
              title="Limpiar búsqueda"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </template>
        </AppInput>

        <!-- Autocomplete Dropdown (Appears strictly while actively typing) -->
        <div 
          v-if="isSearchDropdownVisible"
          class="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto divide-y divide-border/40 animate-dropdown"
          @mousedown.prevent
        >
          <!-- Matching Inventory Products (Entire row clickable) -->
          <div 
            v-for="item in searchResults" 
            :key="item.key"
            @click="addProductToCart(item.product)"
            class="p-3 flex items-center justify-between gap-2 hover:bg-surface-2 transition-colors group cursor-pointer"
          >
            <div class="flex items-center gap-2.5 min-w-0 pr-2">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border bg-surface-2 border-border text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                <ShoppingBag class="w-3.5 h-3.5" />
              </div>
              <div class="min-w-0 truncate">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs sm:text-sm font-bold text-text truncate group-hover:text-accent transition-colors">
                    {{ item.product.name }}
                  </span>
                  <span 
                    :class="[
                      'text-[10px] font-bold px-1.5 py-0.2 rounded uppercase font-mono',
                      item.product.stock > 0 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
                    ]"
                  >
                    Stock: {{ item.product.stock }}
                  </span>
                </div>
                <span class="text-[11px] text-muted">
                  Venta: ${{ formatCurrency(item.product.price) }} · Costo: ${{ formatCurrency(item.product.cost || 0) }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-1 text-xs font-bold text-accent shrink-0">
              <Plus class="w-3.5 h-3.5" />
              <span>Agregar</span>
            </div>
          </div>

          <!-- Empty match indicator -->
          <div 
            v-if="searchResults.length === 0" 
            class="p-3 text-xs text-muted text-center"
          >
            No se encontraron productos coincidentes en inventario
          </div>

          <!-- Manual Custom Entry Option (With search query) -->
          <div 
            @click="openManualAddWithQuery"
            class="p-3 bg-surface-2/60 hover:bg-surface-2 flex items-center justify-between cursor-pointer text-xs font-semibold text-text transition-colors border-t border-border"
          >
            <div class="flex items-center gap-2">
              <Plus class="w-4 h-4 text-accent" />
              <span>Registrar <strong>"{{ searchQuery.trim() }}"</strong> como concepto libre...</span>
            </div>
            <span class="text-[10px] uppercase font-bold text-muted bg-surface px-2 py-0.5 rounded border border-border">
              Personalizado
            </span>
          </div>
        </div>
      </div>

      <!-- Manual Entry Card for Uncataloged Concept -->
      <div 
        v-if="isManualOpen" 
        class="p-3.5 bg-surface-2/60 border border-accent/40 rounded-xl flex flex-col gap-3 animate-reveal mt-1"
      >
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
            <Plus class="w-3.5 h-3.5 text-accent" />
            <span>Concepto Manual / No Catalogado</span>
          </h4>
          <button 
            type="button" 
            @click="isManualOpen = false" 
            class="text-muted hover:text-text cursor-pointer p-0.5"
            title="Cerrar formulario manual"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <AppInput
            v-model="manualForm.concept"
            label="Concepto"
            placeholder="Ej: Compra bombillo, Servicio especial..."
            required
          />
          <AppInput
            v-model="manualForm.amount"
            type="number"
            min="0"
            mono
            label="Monto ($)"
            placeholder="0"
            required
          />
        </div>

        <!-- Sign Toggle: Strictly for uncataloged concepts -->
        <div class="flex items-center justify-between pt-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-muted uppercase">Tipo:</span>
            <div class="flex items-center bg-surface p-0.5 rounded-lg border border-border">
              <button
                type="button"
                @click="manualForm.sign = '+'"
                :class="[
                  'px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1',
                  manualForm.sign === '+' ? 'bg-success text-white shadow-xs' : 'text-muted hover:text-text'
                ]"
              >
                <ArrowUpRight class="w-3 h-3" />
                <span>+ Venta</span>
              </button>
              <button
                type="button"
                @click="manualForm.sign = '-'"
                :class="[
                  'px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1',
                  manualForm.sign === '-' ? 'bg-danger text-white shadow-xs' : 'text-muted hover:text-text'
                ]"
              >
                <ArrowDownRight class="w-3 h-3" />
                <span>- Compra</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            @click="addManualItem"
            :disabled="!manualForm.concept.trim() || !manualForm.amount || manualForm.amount <= 0"
            class="px-4 py-1.5 bg-accent text-white border border-accent hover:bg-accent-soft disabled:opacity-40 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1 shadow-xs"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Agregar Partida</span>
          </button>
        </div>
      </div>
    </div>

    <!-- STATE 1: MODAL VACÍO (cart.length === 0) -->
    <div v-if="cart.length === 0" class="flex flex-col gap-2.5">
      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold text-muted uppercase tracking-wider">Agregar rápido de inventario</span>
        
        <div class="flex flex-col gap-1.5">
          <!-- Clickable product item row -->
          <div
            v-for="prod in quickProducts"
            :key="prod.id"
            @click="addProductToCart(prod)"
            class="w-full px-3.5 py-2.5 rounded-xl bg-surface-2/40 hover:bg-surface-2 border border-border/40 text-left transition-colors flex items-center justify-between group cursor-pointer"
          >
            <!-- Left: Small icon + Name & details -->
            <div class="flex items-center gap-2.5 min-w-0 pr-2">
              <div class="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-muted group-hover:text-accent shrink-0 transition-colors border border-border">
                <ShoppingBag class="w-3.5 h-3.5" />
              </div>
              <div class="min-w-0 truncate">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs sm:text-sm font-medium text-text truncate group-hover:text-accent transition-colors">
                    {{ prod.name }}
                  </span>
                  <span 
                    :class="[
                      'text-[10px] font-bold px-1.5 py-0.2 rounded uppercase font-mono',
                      prod.stock > 0 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
                    ]"
                  >
                    Stock: {{ prod.stock }}
                  </span>
                </div>
                <span class="text-[11px] text-muted font-mono">
                  Venta: ${{ formatCurrency(prod.price) }} · Costo: ${{ formatCurrency(prod.cost || 0) }}
                </span>
              </div>
            </div>

            <!-- Right: Action Hint -->
            <div class="flex items-center gap-1 text-xs font-bold text-accent shrink-0">
              <Plus class="w-3.5 h-3.5" />
              <span>Agregar</span>
            </div>
          </div>

          <!-- Custom Manual Entry Quick Row -->
          <button
            type="button"
            @click="openManualAddEmpty"
            class="w-full px-3.5 py-2.5 rounded-xl bg-surface-2/20 hover:bg-surface-2/50 border border-dashed border-border/50 hover:border-accent/50 text-left transition-colors cursor-pointer flex items-center justify-between text-muted hover:text-text group"
          >
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-accent shrink-0 border border-border">
                <Plus class="w-3.5 h-3.5" />
              </div>
              <span class="text-xs font-medium">Registrar otro concepto o gasto manual...</span>
            </div>
            <span class="text-[11px] text-accent font-semibold uppercase tracking-wider">
              + Manual
            </span>
          </button>
        </div>
      </div>

      <!-- Centered prompt when empty -->
      <p class="text-xs text-muted text-center py-2">
        Selecciona un producto o agrega un concepto libre para continuar
      </p>
    </div>

    <!-- STATE 2: MODAL CON PARTIDAS (cart.length > 0) -->
    <template v-else>
      <!-- Cumulative Items List -->
      <div class="flex flex-col gap-1.5 animate-reveal">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-muted uppercase tracking-wider">
            Partidas agregadas ({{ cart.length }})
          </label>
          <button 
            type="button" 
            @click="clearCart" 
            class="text-[11px] text-muted hover:text-danger cursor-pointer transition-colors"
          >
            Limpiar lista
          </button>
        </div>

        <!-- Items Table/List -->
        <div class="bg-surface-2/40 border border-border rounded-xl divide-y divide-border/60 max-h-60 overflow-y-auto">
          <div 
            v-for="(item, idx) in cart" 
            :key="item.cartId"
            class="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2 transition-colors"
          >
            <!-- Left: Icon & Concept Info -->
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div 
                :class="[
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
                  item.sign === '+' 
                    ? 'bg-success/15 border-success/30 text-success' 
                    : 'bg-danger/15 border-danger/30 text-danger'
                ]"
              >
                <ShoppingBag v-if="item.type === 'product'" class="w-4 h-4" />
                <Ticket v-else-if="item.type === 'sporadic'" class="w-4 h-4" />
                <TrendingDown v-else class="w-4 h-4" />
              </div>

              <div class="min-w-0 flex-1">
                <!-- Concept name & Entra/Sale Toggle -->
                <div class="flex items-center gap-2 flex-wrap">
                  <input 
                    v-if="item.type !== 'product'"
                    v-model="item.concept"
                    class="text-xs sm:text-sm font-semibold text-text bg-transparent border-b border-transparent focus:border-accent hover:border-border/60 outline-none transition-colors flex-1 min-w-[120px]"
                    placeholder="Concepto..."
                  />
                  <span v-else class="text-xs sm:text-sm font-bold text-text truncate max-w-[200px]">{{ item.concept }}</span>

                  <!-- "+ Venta" / "- Compra" Segmented Toggle -->
                  <div class="flex items-center bg-surface p-0.5 rounded-lg border border-border shrink-0">
                    <button
                      type="button"
                      @click="setProductMode(idx, '+')"
                      :class="[
                        'px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1',
                        item.sign === '+' ? 'bg-success text-white shadow-xs' : 'text-muted hover:text-text'
                      ]"
                      title="Venta a cliente (descuenta stock)"
                    >
                      <ArrowUpRight class="w-3 h-3" />
                      <span>+ Venta</span>
                    </button>
                    <button
                      type="button"
                      @click="setProductMode(idx, '-')"
                      :class="[
                        'px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1',
                        item.sign === '-' ? 'bg-danger text-white shadow-xs' : 'text-muted hover:text-text'
                      ]"
                      title="Compra / Reabastecimiento (suma stock)"
                    >
                      <ArrowDownRight class="w-3 h-3" />
                      <span>- Compra</span>
                    </button>
                  </div>
                </div>

                <!-- Price / Cost info -->
                <div v-if="item.type === 'product'" class="flex items-center gap-2 text-[11px] text-muted font-mono mt-1">
                  <span>Unitario:</span>
                  <input
                    v-model.number="item.unitPrice"
                    type="number"
                    min="0"
                    step="any"
                    @input="handlePriceChange(idx)"
                    class="w-18 bg-surface border border-border/80 focus:border-accent text-text px-1.5 py-0.5 rounded text-[11px] font-mono font-bold outline-none"
                    placeholder="0"
                  />
                  <span v-if="item.sign === '+'" class="text-[10px] text-muted">(- stock)</span>
                  <span v-else class="text-[10px] text-success font-bold">(+ stock)</span>
                </div>
              </div>
            </div>

            <!-- Right: Quantity controller & Total amount -->
            <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
              <!-- Quantity controller for product -->
              <div v-if="item.type === 'product'" class="flex items-center gap-1 bg-surface px-1.5 py-1 rounded-lg border border-border">
                <button 
                  type="button" 
                  @click="updateItemQty(idx, -1)" 
                  class="w-5 h-5 flex items-center justify-center text-muted hover:text-text cursor-pointer"
                  title="Restar 1"
                >
                  <Minus class="w-3 h-3" />
                </button>
                <span class="font-mono font-bold text-text w-6 text-center text-xs">{{ item.quantity }}</span>
                <button 
                  type="button" 
                  @click="updateItemQty(idx, 1)" 
                  :disabled="item.sign === '+' && item.maxStock !== undefined && (item.quantity || 1) >= item.maxStock"
                  class="w-5 h-5 flex items-center justify-center text-muted hover:text-text disabled:opacity-30 cursor-pointer"
                  title="Sumar 1"
                >
                  <Plus class="w-3 h-3" />
                </button>
              </div>

              <!-- Amount input for editable services or expenses -->
              <div v-else class="flex items-center gap-1">
                <span class="text-xs font-mono text-muted">$</span>
                <input
                  v-model.number="item.amount"
                  type="number"
                  min="0"
                  step="any"
                  class="w-24 bg-surface border border-border focus:border-accent text-text px-2 py-1 rounded-lg text-xs font-mono font-bold outline-none text-right"
                  placeholder="0"
                />
              </div>

              <!-- Line Amount Total -->
              <span 
                :class="[
                  'font-display font-bold text-sm sm:text-base w-24 text-right truncate',
                  item.sign === '+' ? 'text-success' : 'text-danger'
                ]"
              >
                {{ item.sign }}${{ formatCurrency(getItemTotal(item)) }}
              </span>

              <!-- Delete item button -->
              <button 
                type="button" 
                @click="removeItem(idx)"
                class="text-muted hover:text-danger cursor-pointer p-1 rounded hover:bg-surface transition-colors shrink-0"
                title="Quitar de la lista"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaction Settings (Compact Payment Method & Collapsed Customer) -->
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-border/40 animate-reveal">
        <!-- Payment Method: compact segmented control -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-muted uppercase tracking-wider">Método de Pago</label>
          <div class="flex items-center bg-surface p-1 rounded-xl border border-border">
            <button
              type="button"
              @click="paymentMethod = 'cash'"
              :class="[
                'px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center',
                paymentMethod === 'cash' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-text'
              ]"
            >
              Efectivo
            </button>
            <button
              type="button"
              @click="paymentMethod = 'transfer'"
              :class="[
                'px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center',
                paymentMethod === 'transfer' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-text'
              ]"
            >
              Transferencia
            </button>
          </div>
        </div>

        <!-- Expanded Customer Input or Collapsed Link -->
        <div class="flex-1 min-w-0 sm:max-w-xs flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <label v-if="isCustomerOpen" class="text-xs font-semibold text-muted uppercase tracking-wider">Tercero / Cliente (Opcional)</label>
            <button
              v-if="!isCustomerOpen"
              type="button"
              @click="isCustomerOpen = true"
              class="text-xs text-accent hover:underline font-semibold flex items-center gap-1 cursor-pointer transition-colors py-1.5"
            >
              <UserPlus class="w-3.5 h-3.5" />
              <span>+ Agregar cliente o proveedor</span>
            </button>
            <button 
              v-else
              type="button" 
              @click="isCustomerOpen = false; customerName = ''" 
              class="text-[11px] text-muted hover:text-danger cursor-pointer"
              title="Quitar campo"
            >
              Quitar
            </button>
          </div>
          <AppInput
            v-if="isCustomerOpen"
            v-model="customerName"
            placeholder="Nombre de cliente o proveedor..."
            input-class="h-[34px]"
          />
        </div>
      </div>

      <!-- Conditional Net Balance Banner -->
      <div class="bg-surface-2 border border-border rounded-xl p-3.5 flex items-center justify-between animate-reveal">
        <!-- If Mixed Signs: Show Full Breakdown (Entradas, Salidas, Balance) -->
        <template v-if="isMixedSign">
          <div class="flex items-center gap-3 sm:gap-6 text-xs">
            <div>
              <span class="text-[10px] uppercase font-bold text-muted block">Entradas (+)</span>
              <span class="font-display font-bold text-sm sm:text-base text-success leading-tight">
                +${{ formatCurrency(totalIncome) }}
              </span>
            </div>
            <div class="w-px h-7 bg-border"></div>
            <div>
              <span class="text-[10px] uppercase font-bold text-muted block">Salidas (-)</span>
              <span class="font-display font-bold text-sm sm:text-base text-danger leading-tight">
                -${{ formatCurrency(totalExpenses) }}
              </span>
            </div>
          </div>

          <div class="text-right">
            <span class="text-[10px] uppercase font-bold text-muted block">Balance Neto</span>
            <span 
              :class="[
                'font-display font-bold text-lg sm:text-xl lg:text-2xl leading-none',
                netBalance > 0 ? 'text-success' : netBalance < 0 ? 'text-danger' : 'text-text'
              ]"
            >
              {{ netBalance > 0 ? '+' : '' }}${{ formatCurrency(netBalance) }}
            </span>
          </div>
        </template>

        <!-- If Single Sign / Homogeneous: Show Only Balance Neto -->
        <template v-else>
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-muted uppercase tracking-wider">Balance Neto</span>
          </div>
          <div class="text-right">
            <span 
              :class="[
                'font-display font-bold text-lg sm:text-xl lg:text-2xl leading-none',
                netBalance > 0 ? 'text-success' : netBalance < 0 ? 'text-danger' : 'text-text'
              ]"
            >
              {{ netBalance > 0 ? '+' : '' }}${{ formatCurrency(netBalance) }}
            </span>
          </div>
        </template>
      </div>
    </template>

    <!-- Modal Footer Actions Slot (Always visible, Confirm disabled when cart is empty) -->
    <template #footer>
      <div class="flex items-center gap-3">
        <button 
          type="button" 
          @click="handleDismiss"
          class="flex-1 py-2.5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs lg:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          Cancelar
        </button>

        <button 
          type="button" 
          @click="handleSubmit"
          :disabled="cart.length === 0 || submitting || hasInvalidAmounts"
          class="flex-1 py-2.5 rounded-xl bg-accent text-white border border-accent hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
        >
          <span v-if="submitting" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
          <span v-else>Confirmar</span>
        </button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Layers, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  ShoppingBag, 
  Ticket, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  UserPlus
} from 'lucide-vue-next';
import type { Product } from '~/modules/inventory/types';
import AppModal from '~/ui/components/AppModal.vue';

interface CartItem {
  cartId: string;
  type: 'product' | 'sporadic' | 'expense';
  sign: '+' | '-';
  concept: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  productId?: number;
  maxStock?: number;
}

const props = defineProps<{
  isOpen: boolean;
  products: Product[];
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: {
    items: Array<{
      type: 'product' | 'sporadic' | 'expense';
      sign?: '+' | '-';
      productId?: number;
      concept: string;
      amount: number;
      quantity?: number;
      unitPrice?: number;
    }>;
    paymentMethod: 'cash' | 'transfer';
    customerName?: string;
  }): void;
}>();

const searchQuery = ref('');
const isSearchFocused = ref(false);
const cart = ref<CartItem[]>([]);
const paymentMethod = ref<'cash' | 'transfer'>('cash');
const customerName = ref('');
const isCustomerOpen = ref(false);

const isManualOpen = ref(false);
const manualForm = ref({
  concept: '',
  amount: null as number | null,
  sign: '+' as '+' | '-',
});

// Active products for quick add list
const quickProducts = computed(() => {
  return props.products.filter((p) => p.isActive).slice(0, 4);
});

// Search results query all active products (including stock 0 for restocking)
const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return [];

  return props.products
    .filter((p) => p.isActive && (p.name.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)))
    .map((p) => ({
      key: `prod_${p.id}`,
      product: p,
    }));
});

// Dropdown visibility: strictly autocomplete while actively typing
const isSearchDropdownVisible = computed(() => {
  return isSearchFocused.value && searchQuery.value.trim().length > 0;
});

const handleSearchBlur = () => {
  setTimeout(() => {
    isSearchFocused.value = false;
  }, 200);
};

const closeSearchDropdown = () => {
  isSearchFocused.value = false;
  searchQuery.value = '';
};

const addProductToCart = (prod: Product) => {
  const mode: 'sale' | 'purchase' = prod.stock > 0 ? 'sale' : 'purchase';
  const sign: '+' | '-' = mode === 'sale' ? '+' : '-';
  const unitPrice = mode === 'sale' 
    ? prod.price 
    : (prod.cost && prod.cost > 0 ? prod.cost : prod.price);

  const existing = cart.value.find((c) => c.productId === prod.id && c.sign === sign);
  if (existing) {
    if (sign === '-' || (existing.quantity || 1) < (prod.stock || 0)) {
      existing.quantity = (existing.quantity || 1) + 1;
      existing.amount = existing.quantity * (existing.unitPrice || unitPrice);
    }
  } else {
    cart.value.push({
      cartId: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'product',
      sign,
      concept: prod.name,
      productId: prod.id,
      quantity: 1,
      unitPrice,
      amount: unitPrice,
      maxStock: mode === 'sale' ? prod.stock : undefined,
    });
  }

  searchQuery.value = '';
  isSearchFocused.value = false;
};

const setProductMode = (idx: number, newSign: '+' | '-') => {
  const item = cart.value[idx];
  if (!item) return;

  if (item.type !== 'product') {
    item.sign = newSign;
    return;
  }

  if (item.sign === newSign) return;

  const prod = props.products.find((p) => p.id === item.productId);
  if (!prod) {
    item.sign = newSign;
    return;
  }

  item.sign = newSign;
  if (newSign === '-') {
    // Switch to purchase stock
    item.unitPrice = prod.cost && prod.cost > 0 ? prod.cost : prod.price;
    item.maxStock = undefined;
  } else {
    // Switch to customer sale
    item.unitPrice = prod.price;
    item.maxStock = prod.stock;
    if (item.quantity && item.quantity > prod.stock) {
      item.quantity = Math.max(1, prod.stock);
    }
  }
  item.amount = (item.quantity || 1) * (item.unitPrice || 0);
};

const handlePriceChange = (idx: number) => {
  const item = cart.value[idx];
  if (!item) return;
  item.amount = (item.quantity || 1) * (item.unitPrice || 0);
};

const openManualAddWithQuery = () => {
  manualForm.value.concept = searchQuery.value.trim();
  manualForm.value.amount = null;
  manualForm.value.sign = '+';
  isManualOpen.value = true;
  searchQuery.value = '';
  isSearchFocused.value = false;
};

const openManualAddEmpty = () => {
  manualForm.value.concept = '';
  manualForm.value.amount = null;
  manualForm.value.sign = '+';
  isManualOpen.value = true;
  isSearchFocused.value = false;
};

const addManualItem = () => {
  if (!manualForm.value.concept.trim() || !manualForm.value.amount || manualForm.value.amount <= 0) return;

  cart.value.push({
    cartId: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: manualForm.value.sign === '+' ? 'sporadic' : 'expense',
    sign: manualForm.value.sign,
    concept: manualForm.value.concept.trim(),
    amount: Number(manualForm.value.amount),
  });

  manualForm.value.concept = '';
  manualForm.value.amount = null;
  isManualOpen.value = false;
};

const updateItemQty = (idx: number, delta: number) => {
  const item = cart.value[idx];
  if (!item || item.type !== 'product') return;

  const newQty = (item.quantity || 1) + delta;
  if (newQty <= 0) {
    removeItem(idx);
    return;
  }
  if (item.sign === '+' && item.maxStock !== undefined && newQty > item.maxStock) return;

  item.quantity = newQty;
  item.amount = newQty * (item.unitPrice || 0);
};

const removeItem = (idx: number) => {
  cart.value.splice(idx, 1);
};

const clearCart = () => {
  cart.value = [];
};

const getItemTotal = (item: CartItem) => {
  if (item.type === 'product') {
    return (item.quantity || 1) * (item.unitPrice || 0);
  }
  return Number(item.amount) || 0;
};

const totalIncome = computed(() => {
  return cart.value
    .filter((i) => i.sign === '+')
    .reduce((sum, i) => sum + getItemTotal(i), 0);
});

const totalExpenses = computed(() => {
  return cart.value
    .filter((i) => i.sign === '-')
    .reduce((sum, i) => sum + getItemTotal(i), 0);
});

const netBalance = computed(() => {
  return totalIncome.value - totalExpenses.value;
});

// Conditional display: if all items share the same sign, show only Net Balance.
// If mixed (at least one positive and one negative), show full breakdown.
const isMixedSign = computed(() => {
  if (cart.value.length <= 1) return false;
  const firstSign = cart.value[0].sign;
  return cart.value.some((i) => i.sign !== firstSign);
});

const hasInvalidAmounts = computed(() => {
  return cart.value.some((i) => getItemTotal(i) <= 0);
});

// Backdrop click or Esc: closes the modal visually, PRESERVING entered draft state
const handleClose = () => {
  searchQuery.value = '';
  isSearchFocused.value = false;
  emit('close');
};

// Explicit dismissal via 'X' or 'Cancelar': wipes draft state and closes
const handleDismiss = () => {
  searchQuery.value = '';
  isSearchFocused.value = false;
  cart.value = [];
  customerName.value = '';
  isCustomerOpen.value = false;
  isManualOpen.value = false;
  emit('close');
};

const handleSubmit = () => {
  if (cart.value.length === 0 || hasInvalidAmounts.value) return;

  const payloadItems = cart.value.map((i) => ({
    type: i.type,
    sign: i.sign,
    productId: i.productId,
    concept: i.concept,
    amount: getItemTotal(i),
    quantity: i.quantity || 1,
    unitPrice: i.unitPrice,
  }));

  emit('submit', {
    items: payloadItems,
    paymentMethod: paymentMethod.value,
    customerName: customerName.value.trim() || undefined,
  });

  // Clear draft on successful submit
  cart.value = [];
  customerName.value = '';
  searchQuery.value = '';
  isManualOpen.value = false;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val || 0);
};
</script>
