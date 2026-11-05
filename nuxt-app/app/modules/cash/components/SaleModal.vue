<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-reveal"
    @click.self="$emit('close')"
  >
    <div class="bg-surface border border-border rounded-xl w-full max-w-xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b border-border/40 pb-3">
        <div class="flex items-center gap-2">
          <ShoppingBag class="w-5 h-5 text-accent" />
          <h3 class="font-display font-bold text-lg text-text uppercase">Venta de Productos</h3>
        </div>
        <button @click="$emit('close')" class="text-muted hover:text-text cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Select Products Area -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-muted uppercase">Selecciona los Productos</label>
          <div class="w-52">
            <AppInput
              v-model="productSearch"
              placeholder="Buscar..."
            >
              <template #prefix>
                <Search class="w-4 h-4 text-muted" />
              </template>
            </AppInput>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          <div 
            v-for="prod in filteredProducts" 
            :key="prod.id"
            @click="addToCart(prod)"
            :class="[
              'p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all',
              prod.stock <= 0 
                ? 'opacity-40 cursor-not-allowed bg-surface-2/40 border-border/40' 
                : 'bg-surface-2 border-border/70 hover:border-accent hover:bg-surface-2'
            ]"
          >
            <div class="min-w-0 pr-2">
              <h4 class="font-medium text-text text-xs lg:text-sm truncate">{{ prod.name }}</h4>
              <div class="flex items-center gap-1.5 text-xs text-muted">
                <span>Stock: {{ prod.stock }}</span>
                <span>·</span>
                <span class="text-accent font-bold">${{ formatCurrency(prod.price) }}</span>
              </div>
            </div>
            <button 
              type="button"
              :disabled="prod.stock <= 0"
              class="w-7 h-7 rounded-lg bg-surface border border-border text-muted hover:text-text hover:border-accent flex items-center justify-center shrink-0"
            >
              <Plus class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Cart Table -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-muted uppercase">Detalle de la Venta (Carrito)</label>
        
        <div v-if="cart.length === 0" class="p-6 text-center border border-dashed border-border rounded-xl bg-surface-2/30 text-muted text-xs lg:text-sm">
          Selecciona productos arriba para agregarlos a la venta.
        </div>

        <div v-else class="bg-surface-2 border border-border rounded-xl divide-y divide-border/40 max-h-40 overflow-y-auto">
          <div v-for="item in cart" :key="item.productId" class="p-2.5 flex items-center justify-between text-xs lg:text-sm">
            <div class="min-w-0 flex-1 pr-2">
              <h5 class="font-medium text-text truncate">{{ item.name }}</h5>
              <span class="text-xs text-muted font-mono">${{ formatCurrency(item.price) }} c/u</span>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <div class="flex items-center gap-1 bg-surface px-1.5 py-0.5 rounded-lg border border-border">
                <button 
                  type="button" 
                  @click="updateCartQty(item.productId, -1)" 
                  class="w-6 h-6 flex items-center justify-center text-muted hover:text-text cursor-pointer"
                >
                  <Minus class="w-3.5 h-3.5" />
                </button>
                <span class="font-mono font-bold text-text w-6 text-center text-xs lg:text-sm">{{ item.quantity }}</span>
                <button 
                  type="button" 
                  @click="updateCartQty(item.productId, 1)" 
                  :disabled="item.quantity >= item.maxStock"
                  class="w-6 h-6 flex items-center justify-center text-muted hover:text-text disabled:opacity-30 cursor-pointer"
                >
                  <Plus class="w-3.5 h-3.5" />
                </button>
              </div>

              <span class="font-display font-bold text-accent text-sm lg:text-base w-20 text-right">
                ${{ formatCurrency(item.price * item.quantity) }}
              </span>

              <button 
                type="button" 
                @click="removeFromCart(item.productId)" 
                class="text-muted hover:text-danger p-1 cursor-pointer"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Details -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold text-muted uppercase">Método de Pago</label>
          <div class="grid grid-cols-2 gap-2">
            <button 
              type="button"
              @click="paymentMethod = 'cash'"
              :class="[
                'py-2.5 px-3 rounded-xl border text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer text-center',
                paymentMethod === 'cash' ? 'bg-accent text-white border-accent' : 'bg-surface-2 border-border text-muted hover:text-text'
              ]"
            >
              Efectivo
            </button>
            <button 
              type="button"
              @click="paymentMethod = 'transfer'"
              :class="[
                'py-2.5 px-3 rounded-xl border text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer text-center',
                paymentMethod === 'transfer' ? 'bg-accent text-white border-accent' : 'bg-surface-2 border-border text-muted hover:text-text'
              ]"
            >
              Transferencia
            </button>
          </div>
        </div>

        <AppInput
          v-model="customerName"
          label="Cliente (Opcional)"
          placeholder="Cliente General / No Miembro"
        />
      </div>

      <!-- Total & Submit -->
      <div class="flex items-center justify-between pt-3 border-t border-border/40">
        <div>
          <span class="text-xs text-muted uppercase font-semibold">Total a Cobrar:</span>
          <p class="font-display font-bold text-2xl lg:text-3xl text-accent leading-none mt-0.5">
            ${{ formatCurrency(cartTotal) }}
          </p>
        </div>

        <div class="flex items-center gap-2.5">
          <button 
            type="button" 
            @click="$emit('close')"
            class="py-2.5 px-4 lg:px-5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs lg:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            @click="handleSubmit"
            :disabled="cart.length === 0 || submitting"
            class="py-2.5 px-5 rounded-xl bg-accent text-white border border-accent hover:bg-accent-soft disabled:opacity-50 text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md"
          >
            <span v-if="submitting" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
            <span v-else>Cobrar Venta</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ShoppingBag, Search, Plus, Minus, Trash2, X } from 'lucide-vue-next';
import { useInventory } from '~/modules/inventory/composables/useInventory';

defineProps<{
  isOpen: boolean;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: any): void;
}>();

const { products, fetchProducts } = useInventory();

const productSearch = ref('');
const paymentMethod = ref<'cash' | 'transfer'>('cash');
const customerName = ref('');
const cart = ref<any[]>([]);

onMounted(() => {
  fetchProducts();
});

const filteredProducts = computed(() => {
  const q = productSearch.value.trim().toLowerCase();
  if (!q) return products.value;
  return products.value.filter((p) => p.name.toLowerCase().includes(q) || (p.barcode || '').includes(q));
});

const cartTotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

const addToCart = (prod: any) => {
  if (prod.stock <= 0) return;
  const existing = cart.value.find((item) => item.productId === prod.id);
  if (existing) {
    if (existing.quantity < prod.stock) {
      existing.quantity++;
    }
  } else {
    cart.value.push({
      productId: prod.id,
      name: prod.name,
      price: prod.price,
      quantity: 1,
      maxStock: prod.stock,
    });
  }
};

const updateCartQty = (prodId: number, delta: number) => {
  const item = cart.value.find((i) => i.productId === prodId);
  if (!item) return;
  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeFromCart(prodId);
  } else if (newQty <= item.maxStock) {
    item.quantity = newQty;
  }
};

const removeFromCart = (prodId: number) => {
  cart.value = cart.value.filter((i) => i.productId !== prodId);
};

const handleSubmit = () => {
  if (cart.value.length === 0) return;

  emit('submit', {
    items: cart.value.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    paymentMethod: paymentMethod.value,
    customerName: customerName.value.trim() || 'Cliente General',
  });

  cart.value = [];
  customerName.value = '';
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val || 0);
};
</script>
