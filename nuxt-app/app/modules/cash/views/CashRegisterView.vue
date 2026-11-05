<template>
  <div class="w-full flex flex-col pb-16">
    <!-- Top Header -->
    <header class="px-6 lg:px-8 py-5 lg:py-6 border-b border-border/30 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
      <div class="pt-1.5 md:pt-2">
        <div class="flex items-center gap-3">
          <h1 class="font-display font-bold text-2xl tracking-wide uppercase text-text">Caja y Flujo Diario</h1>
          <!-- Status Badge -->
          <span 
            v-if="isSessionOpen"
            class="bg-success/15 text-success border border-success/30 text-xs px-3 py-1 rounded-lg font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <span class="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            <span>Caja Abierta ({{ formatTime(currentSession?.openedAt) }})</span>
          </span>
          <span 
            v-else
            class="bg-surface-2 text-muted border border-border text-xs px-3 py-1 rounded-lg font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <span class="w-2 h-2 rounded-full bg-muted"></span>
            <span>Caja Cerrada</span>
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2.5">
        <template v-if="isSessionOpen">
          <!-- Primary action button -->
          <button 
            type="button"
            @click="isMovementModalOpen = true"
            class="bg-accent text-white border-accent cursor-pointer hover:bg-accent-soft active:scale-[0.99] flex items-center justify-center gap-1.5 lg:gap-2 py-2 px-3.5 lg:py-2.5 lg:px-5 rounded-xl font-bold uppercase tracking-wider transition-all duration-200 text-xs lg:text-sm shadow-md shrink-0"
          >
            <Plus class="w-4 h-4" />
            <span>Nuevo movimiento</span>
          </button>

          <!-- Secondary button for closing register -->
          <button 
            type="button"
            @click="openCloseModal"
            class="bg-surface-2 text-muted hover:text-text border border-border hover:border-accent/40 cursor-pointer flex items-center justify-center gap-1.5 lg:gap-2 py-2 px-3.5 lg:py-2.5 lg:px-4 rounded-xl font-bold uppercase tracking-wider transition-all duration-200 text-xs lg:text-sm shadow-sm shrink-0"
          >
            <Lock class="w-4 h-4" />
            <span>Cerrar Caja</span>
          </button>
        </template>

        <template v-else>
          <button 
            type="button"
            @click="isOpenModalOpen = true"
            class="bg-accent text-white border-accent cursor-pointer hover:bg-accent-soft active:scale-[0.99] flex items-center justify-center gap-1.5 lg:gap-2 py-2 px-3.5 lg:py-2.5 lg:px-5 rounded-xl font-bold uppercase tracking-wider transition-all duration-200 text-xs lg:text-sm shadow-md shrink-0"
          >
            <LockOpen class="w-4 h-4" />
            <span>Abrir Caja de Hoy</span>
          </button>
        </template>
      </div>
    </header>

    <!-- Content Area -->
    <div class="px-6 lg:px-8 py-6 flex flex-col gap-6">
      <!-- Time Period & Navigation Selector -->
      <div class="flex flex-col gap-2.5 bg-surface border border-border p-2.5 sm:p-3 rounded-xl">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button 
              @click="changePeriod('daily')"
              :class="[
                'py-1.5 px-3.5 rounded-lg text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer',
                activeTab === 'daily' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-text hover:bg-surface-2'
              ]"
            >
              Diario (Hoy)
            </button>
            <button 
              @click="changePeriod('weekly')"
              :class="[
                'py-1.5 px-3.5 rounded-lg text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer',
                activeTab === 'weekly' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-text hover:bg-surface-2'
              ]"
            >
              Semanal
            </button>
            <button 
              @click="changePeriod('monthly')"
              :class="[
                'py-1.5 px-3.5 rounded-lg text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer',
                activeTab === 'monthly' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-text hover:bg-surface-2'
              ]"
            >
              Mensual
            </button>
            <button 
              @click="changePeriod('custom')"
              :class="[
                'py-1.5 px-3.5 rounded-lg text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer',
                activeTab === 'custom' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-text hover:bg-surface-2'
              ]"
            >
              Personalizado
            </button>
            <button 
              @click="activeTab = 'history'"
              :class="[
                'py-1.5 px-3.5 rounded-lg text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer',
                activeTab === 'history' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-text hover:bg-surface-2'
              ]"
            >
              Historial de Cierres
            </button>
          </div>

          <span class="text-xs lg:text-sm text-muted pr-2 font-medium">
            {{ periodLabel }}
          </span>
        </div>

        <!-- Custom Date Range Pickers (shown when activeTab === 'custom') -->
        <div v-if="activeTab === 'custom'" class="flex flex-wrap items-center gap-3 pt-2.5 border-t border-border/50 animate-reveal">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-muted uppercase">Desde:</span>
            <input 
              v-model="customDateRange.startDate" 
              type="date" 
              @change="handleCustomDateChange"
              class="bg-surface-2 border border-border text-text font-mono text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-accent cursor-pointer"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-muted uppercase">Hasta:</span>
            <input 
              v-model="customDateRange.endDate" 
              type="date" 
              @change="handleCustomDateChange"
              class="bg-surface-2 border border-border text-text font-mono text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-accent cursor-pointer"
            />
          </div>
          <div class="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              @click="setQuickRange(7)"
              class="text-[11px] px-2.5 py-1 rounded-md bg-surface-2 text-muted hover:text-text border border-border hover:border-accent/40 transition-colors font-medium cursor-pointer"
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              @click="setQuickRange(30)"
              class="text-[11px] px-2.5 py-1 rounded-md bg-surface-2 text-muted hover:text-text border border-border hover:border-accent/40 transition-colors font-medium cursor-pointer"
            >
              Últimos 30 días
            </button>
          </div>
        </div>
      </div>

      <!-- Financial KPI Cards (Standard 4-column responsive grid matching Inventory, fully reactive to filters) -->
      <template v-if="activeTab !== 'history'">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <!-- Ingresos Totales -->
          <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-success shrink-0">
              <TrendingUp class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="text-[11px] text-muted uppercase font-semibold tracking-wider block truncate">
                {{ filterCategory !== 'all' || filterMethod !== 'all' ? 'Ingresos Filtrados' : 'Ingresos Totales' }}
              </span>
              <p class="font-display font-bold text-xl lg:text-2xl text-success leading-none mt-1 truncate">
                +${{ formatCurrency(filteredSummary.income) }}
              </p>
            </div>
          </div>

          <!-- Egresos / Gastos -->
          <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-danger shrink-0">
              <TrendingDown class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="text-[11px] text-muted uppercase font-semibold tracking-wider block truncate">
                {{ filterCategory !== 'all' || filterMethod !== 'all' ? 'Egresos Filtrados' : 'Egresos / Gastos' }}
              </span>
              <p class="font-display font-bold text-xl lg:text-2xl text-danger leading-none mt-1 truncate">
                -${{ formatCurrency(filteredSummary.expenses) }}
              </p>
            </div>
          </div>

          <!-- Balance Neto -->
          <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
            <div 
              :class="[
                'w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0',
                filteredSummary.net > 0 ? 'text-success' : filteredSummary.net < 0 ? 'text-danger' : 'text-text'
              ]"
            >
              <Scale class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="text-[11px] text-muted uppercase font-semibold tracking-wider block truncate">Balance Neto</span>
              <p 
                :class="[
                  'font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate',
                  filteredSummary.net > 0 ? 'text-success' : filteredSummary.net < 0 ? 'text-danger' : 'text-text'
                ]"
              >
                {{ filteredSummary.net > 0 ? '+' : '' }}${{ formatCurrency(filteredSummary.net) }}
              </p>
            </div>
          </div>

          <!-- Efectivo Físico en Cajón / Transferencias Dinámico -->
          <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
            <div 
              :class="[
                'w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0',
                filterMethod === 'transfer' ? 'text-info' : 'text-text'
              ]"
            >
              <ArrowLeftRight v-if="filterMethod === 'transfer'" class="w-5 h-5" />
              <Banknote v-else class="w-5 h-5" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
              <span class="text-[11px] text-muted uppercase font-semibold tracking-wider block truncate">
                {{ fourthCardLabel }}
              </span>
              <p 
                :class="[
                  'font-display font-bold text-xl lg:text-2xl leading-none mt-1 truncate',
                  filterMethod === 'transfer' ? (fourthCardValue > 0 ? 'text-info' : fourthCardValue < 0 ? 'text-danger' : 'text-text') : 'text-text'
                ]"
              >
                {{ fourthCardValuePrefix }}${{ formatCurrency(fourthCardValue) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Movements Feed Section -->
        <div class="flex flex-col gap-3.5">
          <!-- Compact Unified Filters Bar -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface border border-border p-3 lg:p-3.5 rounded-xl">
            <div class="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              <button 
                v-for="cat in movementFilters" 
                :key="cat.id"
                @click="filterCategory = cat.id"
                :class="[
                  'py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border',
                  filterCategory === cat.id 
                    ? 'bg-accent text-white border-accent' 
                    : 'bg-surface-2 text-muted border-border hover:text-text'
                ]"
              >
                {{ cat.name }}
              </button>
            </div>

            <div class="flex items-center gap-2 text-xs text-muted shrink-0">
              <span>Método:</span>
              <select 
                v-model="filterMethod"
                class="bg-surface-2 border border-border text-text text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-accent cursor-pointer"
              >
                <option value="all">Todos</option>
                <option value="cash">Solo Efectivo</option>
                <option value="transfer">Solo Transferencia</option>
              </select>
            </div>
          </div>

          <!-- Compact Movements List -->
          <div class="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <div v-if="movementsLoading" class="py-16 flex items-center justify-center">
              <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
            </div>

            <div v-else-if="filteredMovements.length === 0" class="py-16 text-center flex flex-col items-center justify-center">
              <Receipt class="w-10 h-10 text-muted/40 mb-2" />
              <h4 class="font-display font-bold text-base text-text">No hay movimientos registrados</h4>
              <p class="text-xs text-muted max-w-sm mt-1">No se registran transacciones en el período seleccionado con los filtros actuales.</p>
            </div>

            <div v-else class="divide-y divide-border/40">
              <div 
                v-for="m in filteredMovements" 
                :key="m.id"
                class="p-3.5 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-surface-2/40 transition-colors"
              >
                <!-- Left: Category Icon + Concept and Details -->
                <div class="flex items-center gap-3.5 min-w-0 flex-1">
                  <!-- Category Icon Avatar -->
                  <div 
                    :class="[
                      'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border',
                      getCategoryBadgeClass(m)
                    ]"
                  >
                    <Users v-if="m.category === 'membership'" class="w-4.5 h-4.5 text-info" />
                    <ShoppingBag v-else-if="m.category === 'product'" class="w-4.5 h-4.5 text-emerald-400" />
                    <Ticket v-else-if="m.category === 'sporadic'" class="w-4.5 h-4.5 text-warning" />
                    <TrendingDown v-else class="w-4.5 h-4.5 text-danger" />
                  </div>

                  <!-- Concept + Subtitle -->
                  <div class="min-w-0 flex-1 pr-2">
                    <div class="flex items-center gap-2 truncate">
                      <span class="font-medium text-text text-sm lg:text-base truncate">{{ m.concept }}</span>
                      <span v-if="m.items && m.items.length > 0" class="text-xs text-muted truncate hidden sm:inline">
                        ({{ m.items.map((i: any) => `${i.quantity}x ${i.productName}`).join(' · ') }})
                      </span>
                    </div>
                    <div class="text-xs text-muted mt-0.5 flex items-center gap-1.5 truncate">
                      <!-- Format time/date according to activeTab -->
                      <span>{{ activeTab === 'daily' ? formatTime(m.createdAt) : formatDateTime(m.createdAt) }}</span>
                      <span>·</span>
                      <span>{{ m.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia' }}</span>
                      <template v-if="m.customerName">
                        <span>·</span>
                        <span class="text-text/80 truncate">{{ m.customerName }}</span>
                      </template>
                      <template v-else-if="m.memberId">
                        <span>·</span>
                        <span class="text-text/80">Miembro</span>
                      </template>
                    </div>
                  </div>
                </div>

                <!-- Right: Amount with semantic color & Action Buttons -->
                <div class="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div class="text-right">
                    <span 
                      :class="[
                        'font-display font-bold text-base sm:text-lg lg:text-xl',
                        m.type === 'income' ? 'text-success' : 'text-danger'
                      ]"
                    >
                      {{ m.type === 'income' ? '+' : '-' }}${{ formatCurrency(m.amount) }}
                    </span>
                  </div>

                  <!-- Actions (Edit & Delete) -->
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      @click="openEditMovement(m)"
                      :disabled="m.category === 'membership'"
                      :class="[
                        'p-1.5 rounded-lg text-muted transition-colors',
                        m.category === 'membership' ? 'opacity-30 cursor-not-allowed' : 'hover:text-accent hover:bg-surface-2 cursor-pointer'
                      ]"
                      :title="m.category === 'membership' ? 'Los pagos de membresía se gestionan desde el módulo de Socios' : 'Editar movimiento'"
                    >
                      <Pencil class="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      @click="openDeleteMovement(m)"
                      :disabled="m.category === 'membership'"
                      :class="[
                        'p-1.5 rounded-lg text-muted transition-colors',
                        m.category === 'membership' ? 'opacity-30 cursor-not-allowed' : 'hover:text-danger hover:bg-surface-2 cursor-pointer'
                      ]"
                      :title="m.category === 'membership' ? 'Los pagos de membresía se gestionan desde el módulo de Socios' : 'Anular movimiento'"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- History Tab -->
      <template v-else>
        <div class="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div class="px-5 py-4 border-b border-border/40 flex items-center justify-between">
            <h3 class="font-display font-bold text-base lg:text-lg text-text uppercase">Cierres Diarios de Caja Anteriores</h3>
            <span class="text-xs lg:text-sm text-muted">{{ history.length }} cierres registrados</span>
          </div>

          <div v-if="history.length === 0" class="py-16 text-center text-muted text-xs lg:text-sm">
            No hay registros de cierres anteriores en la base de datos.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs lg:text-sm">
              <thead class="bg-surface-2/60 border-b border-border/80 text-muted uppercase font-semibold text-xs tracking-wider">
                <tr>
                  <th class="py-3.5 px-4">Fecha Apertura</th>
                  <th class="py-3.5 px-4">Fecha Cierre</th>
                  <th class="py-3.5 px-4">Base Inicial</th>
                  <th class="py-3.5 px-4">Esperado</th>
                  <th class="py-3.5 px-4">Contado Real</th>
                  <th class="py-3.5 px-4">Diferencia</th>
                  <th class="py-3.5 px-4">Observaciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/40">
                <tr v-for="h in history" :key="h.id" class="hover:bg-surface-2/40 transition-colors font-mono">
                  <td class="py-3.5 px-4 text-muted">{{ formatDateTime(h.openedAt) }}</td>
                  <td class="py-3.5 px-4 text-muted">{{ formatDateTime(h.closedAt) }}</td>
                  <td class="py-3.5 px-4 text-text">${{ formatCurrency(h.openingBalance) }}</td>
                  <td class="py-3.5 px-4 text-text">${{ formatCurrency(h.expectedCash || 0) }}</td>
                  <td class="py-3.5 px-4 text-text font-bold">${{ formatCurrency(h.closingBalance || 0) }}</td>
                  <td class="py-3.5 px-4">
                    <span 
                      :class="[
                        'text-xs px-2 py-0.5 rounded-md font-bold uppercase',
                        (h.difference || 0) === 0 ? 'bg-success/15 text-success' :
                        (h.difference || 0) > 0 ? 'bg-info/15 text-info' : 'bg-danger/15 text-danger'
                      ]"
                    >
                      {{ (h.difference || 0) > 0 ? '+' : '' }}${{ formatCurrency(h.difference || 0) }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-muted font-body truncate max-w-xs">{{ h.notes || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <!-- Modals -->
    <OpenRegisterModal 
      :is-open="isOpenModalOpen"
      :submitting="modalSubmitting"
      @close="isOpenModalOpen = false"
      @submit="handleOpenRegister"
    />

    <CloseRegisterModal 
      :is-open="isCloseModalOpen"
      :opening-balance="kpis.openingBalance"
      :expected-cash="kpis.expectedCashInDrawer"
      :cash-income="kpis.cashIncome"
      :cash-expenses="kpis.cashExpenses"
      :transfer-income="kpis.transferIncome"
      :transfer-expenses="kpis.transferExpenses"
      :net-transfer="kpis.netTransfer"
      :closing="modalSubmitting"
      @close="isCloseModalOpen = false"
      @submit="handleCloseRegister"
    />

    <UnifiedMovementModal 
      :is-open="isMovementModalOpen"
      :products="availableProducts"
      :submitting="modalSubmitting"
      @close="isMovementModalOpen = false"
      @submit="handleRecordUnifiedMovement"
    />

    <EditMovementModal
      :is-open="isEditModalOpen"
      :movement="selectedMovement"
      :submitting="editSubmitting"
      @close="isEditModalOpen = false"
      @submit="handleUpdateMovement"
    />

    <DeleteMovementConfirmModal
      :is-open="isDeleteModalOpen"
      :movement="selectedMovement"
      :submitting="deleteSubmitting"
      @close="isDeleteModalOpen = false"
      @confirm="handleConfirmDeleteMovement"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  ShoppingBag, 
  Ticket, 
  TrendingDown, 
  TrendingUp, 
  Scale, 
  Banknote, 
  ArrowLeftRight,
  Lock, 
  LockOpen, 
  Receipt, 
  Plus, 
  Users, 
  Pencil, 
  Trash2 
} from 'lucide-vue-next';
import { useCashRegister } from '../composables/useCashRegister';
import type { Product } from '~/modules/inventory/types';
import OpenRegisterModal from '../components/OpenRegisterModal.vue';
import CloseRegisterModal from '../components/CloseRegisterModal.vue';
import UnifiedMovementModal from '../components/UnifiedMovementModal.vue';
import EditMovementModal from '../components/EditMovementModal.vue';
import DeleteMovementConfirmModal from '../components/DeleteMovementConfirmModal.vue';

const {
  isSessionOpen,
  currentSession,
  kpis,
  period,
  customDateRange,
  periodSummary,
  movements,
  history,
  movementsLoading,
  fetchSession,
  fetchMovements,
  fetchHistory,
  openCashRegister,
  closeCashRegister,
  recordBatchMovements,
  deleteMovement,
  updateMovement,
} = useCashRegister();

const activeTab = ref<'daily' | 'weekly' | 'monthly' | 'custom' | 'history'>('daily');
const filterCategory = ref('all');
const filterMethod = ref('all');

// Modals
const isOpenModalOpen = ref(false);
const isCloseModalOpen = ref(false);
const isMovementModalOpen = ref(false);
const modalSubmitting = ref(false);

const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const selectedMovement = ref<any | null>(null);
const editSubmitting = ref(false);
const deleteSubmitting = ref(false);

const availableProducts = ref<Product[]>([]);

const movementFilters = [
  { id: 'all', name: 'Todos' },
  { id: 'membership', name: 'Membresías' },
  { id: 'product', name: 'Productos' },
  { id: 'sporadic', name: 'No Miembros' },
  { id: 'expense', name: 'Egresos' },
];

const fetchProducts = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: Product[] }>('/api/products');
    if (res && res.data) {
      availableProducts.value = res.data;
    }
  } catch (err) {
    console.error('Failed to load products for cash register:', err);
  }
};

onMounted(async () => {
  await Promise.all([
    fetchSession(),
    fetchMovements(),
    fetchHistory(),
    fetchProducts(),
  ]);
});

const formatDateToInput = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
};

const changePeriod = (p: 'daily' | 'weekly' | 'monthly' | 'custom') => {
  activeTab.value = p;
  period.value = p;
  if (p === 'custom') {
    if (!customDateRange.value.startDate || !customDateRange.value.endDate) {
      const today = new Date();
      const prior = new Date();
      prior.setDate(today.getDate() - 7);
      customDateRange.value.endDate = formatDateToInput(today);
      customDateRange.value.startDate = formatDateToInput(prior);
    }
  }
  fetchMovements();
};

const handleCustomDateChange = () => {
  if (customDateRange.value.startDate && customDateRange.value.endDate) {
    fetchMovements();
  }
};

const setQuickRange = (days: number) => {
  const today = new Date();
  const prior = new Date();
  prior.setDate(today.getDate() - days);
  customDateRange.value.endDate = formatDateToInput(today);
  customDateRange.value.startDate = formatDateToInput(prior);
  fetchMovements();
};

const periodLabel = computed(() => {
  if (activeTab.value === 'daily') return 'Mostrando flujo de caja del día de hoy';
  if (activeTab.value === 'weekly') return 'Mostrando consolidado de esta semana';
  if (activeTab.value === 'monthly') return 'Mostrando consolidado de este mes';
  if (activeTab.value === 'custom') {
    if (customDateRange.value.startDate && customDateRange.value.endDate) {
      return `Mostrando consolidado del ${formatDisplayDate(customDateRange.value.startDate)} al ${formatDisplayDate(customDateRange.value.endDate)}`;
    }
    return 'Selecciona un rango de fechas';
  }
  return 'Historial de sesiones cerradas';
});

const filteredMovements = computed(() => {
  return movements.value.filter((m) => {
    const matchCat = filterCategory.value === 'all' || m.category === filterCategory.value;
    const matchMethod = filterMethod.value === 'all' || m.paymentMethod === filterMethod.value;
    return matchCat && matchMethod;
  });
});

const filteredSummary = computed(() => {
  let income = 0;
  let expenses = 0;
  let cashInc = 0;
  let cashExp = 0;
  let transferInc = 0;
  let transferExp = 0;

  for (const m of filteredMovements.value) {
    if (m.type === 'income') {
      income += m.amount;
      if (m.paymentMethod === 'cash') cashInc += m.amount;
      else if (m.paymentMethod === 'transfer') transferInc += m.amount;
    } else if (m.type === 'expense') {
      expenses += m.amount;
      if (m.paymentMethod === 'cash') cashExp += m.amount;
      else if (m.paymentMethod === 'transfer') transferExp += m.amount;
    }
  }

  const net = income - expenses;
  return {
    income,
    expenses,
    net,
    cashInc,
    cashExp,
    transferInc,
    transferExp,
    netCash: cashInc - cashExp,
    netTransfer: transferInc - transferExp,
  };
});

const fourthCardLabel = computed(() => {
  if (filterMethod.value === 'transfer') return 'Neto Transferencias';
  if (filterMethod.value === 'cash') {
    return activeTab.value === 'daily' ? 'Efectivo en Cajón' : 'Neto Efectivo';
  }
  return activeTab.value === 'daily' ? 'Efectivo en Cajón' : 'Neto Efectivo';
});

const fourthCardValue = computed(() => {
  if (filterMethod.value === 'transfer') {
    return filteredSummary.value.netTransfer;
  }
  if (activeTab.value !== 'daily') {
    return filteredSummary.value.netCash;
  }
  if (filterMethod.value === 'cash') {
    return (kpis.value.openingBalance || 0) + filteredSummary.value.netCash;
  }
  // All methods: show expected drawer cash for today/session
  return kpis.value.expectedCashInDrawer || 0;
});

const fourthCardValuePrefix = computed(() => {
  if ((filterMethod.value === 'transfer' || activeTab.value !== 'daily') && fourthCardValue.value > 0) {
    return '+';
  }
  return '';
});

const openCloseModal = () => {
  isCloseModalOpen.value = true;
};

const handleOpenRegister = async (payload: { openingBalance: number; notes: string }) => {
  modalSubmitting.value = true;
  const res = await openCashRegister(payload.openingBalance, payload.notes);
  modalSubmitting.value = false;

  if (res.success) {
    isOpenModalOpen.value = false;
  } else {
    alert(res.error);
  }
};

const handleCloseRegister = async (payload: { countedCash: number; notes: string }) => {
  if (!currentSession.value) return;

  modalSubmitting.value = true;
  const res = await closeCashRegister(currentSession.value.id, payload.countedCash, payload.notes);
  modalSubmitting.value = false;

  if (res.success) {
    isCloseModalOpen.value = false;
  } else {
    alert(res.error);
  }
};

const handleRecordUnifiedMovement = async (payload: any) => {
  modalSubmitting.value = true;
  const res = await recordBatchMovements(payload);
  modalSubmitting.value = false;

  if (res.success) {
    isMovementModalOpen.value = false;
    await fetchProducts();
  } else {
    alert(res.error || 'Ocurrió un error al registrar los movimientos');
  }
};

const openEditMovement = (m: any) => {
  selectedMovement.value = m;
  isEditModalOpen.value = true;
};

const openDeleteMovement = (m: any) => {
  selectedMovement.value = m;
  isDeleteModalOpen.value = true;
};

const handleUpdateMovement = async (payload: any) => {
  editSubmitting.value = true;
  const res = await updateMovement(payload.id, payload);
  editSubmitting.value = false;

  if (res.success) {
    isEditModalOpen.value = false;
    selectedMovement.value = null;
  } else {
    alert(res.error || 'Error al actualizar el movimiento');
  }
};

const handleConfirmDeleteMovement = async (id: number) => {
  deleteSubmitting.value = true;
  const res = await deleteMovement(id);
  deleteSubmitting.value = false;

  if (res.success) {
    isDeleteModalOpen.value = false;
    selectedMovement.value = null;
    await fetchProducts();
  } else {
    alert(res.error || 'Error al anular el movimiento');
  }
};

const getCategoryBadgeClass = (m: any) => {
  if (m.type === 'expense') return 'bg-danger/15 text-danger border-danger/30';
  if (m.category === 'membership') return 'bg-info/15 text-info border-info/30';
  if (m.category === 'product') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  return 'bg-warning/15 text-warning border-warning/30';
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val || 0);
};

const formatTime = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
};
</script>
