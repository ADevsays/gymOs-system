<template>
  <div class="w-full flex flex-col pb-12">
    <!-- Top Header with Back Button -->
    <header class="px-6 lg:px-8 py-5 lg:py-6 border-b border-border/30 flex items-center justify-between gap-4 shrink-0">
      <div class="flex items-center gap-4">
        <button 
          @click="router.push('/plans')"
          class="p-2 rounded-xl bg-surface-2 border border-border text-muted hover:text-text hover:border-accent transition-colors cursor-pointer"
          title="Volver al catálogo de planes"
        >
          <ArrowLeft class="w-4 h-4" />
        </button>
        <div class="pt-1.5 md:pt-2">
          <div class="flex items-center gap-2">
            <h1 class="font-display font-bold text-2xl tracking-wide uppercase text-text">
              {{ plan?.name || 'Detalle del Plan' }}
            </h1>
            <span v-if="plan?.validUntil" class="bg-warning/15 text-warning border border-warning/30 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Promo</span>
            <span v-if="plan?.maxMembers > 1" class="bg-info/15 text-info border border-info/30 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Grupal</span>
          </div>
        </div>
      </div>

      <div v-if="plan" class="flex items-center gap-3">
        <div class="bg-surface-2 border border-border px-3.5 py-1.5 rounded-xl flex items-center gap-2">
          <span class="text-xs text-muted">Tarifa:</span>
          <span class="font-display font-bold text-base text-accent">${{ formatCurrency(plan.price) }}</span>
          <span class="text-xs text-muted">/ {{ plan.durationDays }} días</span>
        </div>
      </div>
    </header>

    <!-- Content Area -->
    <div class="px-6 lg:px-8 py-6 flex flex-col gap-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-danger/10 border border-danger p-4 rounded-xl text-danger flex items-center gap-3">
        <AlertCircle class="w-5 h-5" />
        <span class="text-sm">{{ error }}</span>
      </div>

      <template v-else-if="plan">
        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-accent shrink-0">
              <Users class="w-5 h-5" />
            </div>
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-muted/80 block leading-none">Total Miembros</span>
              <p class="font-display font-bold text-2xl lg:text-3xl text-text leading-tight mt-1">{{ plan.totalMembersCount }}</p>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-success/15 border border-success/30 flex items-center justify-center text-success shrink-0">
              <CheckCircle class="w-5 h-5" />
            </div>
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-muted/80 block leading-none">Suscripciones Activas</span>
              <p class="font-display font-bold text-2xl lg:text-3xl text-success leading-tight mt-1">{{ plan.activeMembersCount }}</p>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-silver shrink-0">
              <Clock class="w-5 h-5" />
            </div>
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-muted/80 block leading-none">Duración de Ciclo</span>
              <p class="font-display font-bold text-2xl lg:text-3xl text-text leading-tight mt-1">{{ plan.durationDays }} <span class="text-xs text-muted font-normal">días</span></p>
            </div>
          </div>
        </div>

        <!-- Search and Action Bar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface border border-border p-3.5 rounded-xl">
          <div class="relative w-full sm:w-80">
            <Search class="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por nombre o cédula..."
              class="w-full bg-surface-2 border border-border text-text text-xs lg:text-sm pl-9 pr-3 py-2 rounded-xl outline-none focus:border-accent transition-colors"
            />
          </div>

          <div class="flex items-center gap-2 text-xs text-muted">
            <span>Mostrando: <strong class="text-text">{{ filteredMembers.length }}</strong> miembro(s)</span>
          </div>
        </div>

        <!-- Members Table / List -->
        <div class="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <!-- Empty State -->
          <div v-if="filteredMembers.length === 0" class="py-16 text-center flex flex-col items-center justify-center">
            <Users class="w-10 h-10 text-muted/50 mb-3" />
            <h3 class="font-display font-bold text-base text-text">No se encontraron miembros</h3>
            <p class="text-xs text-muted max-w-sm mt-1">
              {{ searchQuery ? 'No hay resultados que coincidan con la búsqueda.' : 'Actualmente no hay usuarios adscritos a este plan.' }}
            </p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left font-body">
              <thead class="bg-surface-2 text-muted uppercase font-bold text-xs tracking-wider border-b border-border">
                <tr>
                  <th class="py-3.5 px-4">Miembro</th>
                  <th class="py-3.5 px-4">Cédula</th>
                  <th class="py-3.5 px-4">Teléfono</th>
                  <th class="py-3.5 px-4">Vencimiento</th>
                  <th class="py-3.5 px-4">Estado</th>
                  <th class="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/40 text-xs lg:text-sm">
                <tr 
                  v-for="member in filteredMembers" 
                  :key="member.id" 
                  class="hover:bg-surface-2/40 transition-colors group"
                >
                  <!-- Member Avatar & Name -->
                  <td class="py-3.5 px-4 flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl overflow-hidden bg-surface-2 border border-border flex items-center justify-center shrink-0">
                      <img v-if="member.photoPath" :src="member.photoPath" class="w-full h-full object-cover" alt="Foto" />
                      <span v-else class="font-display font-bold text-xs text-text">{{ getInitials(member) }}</span>
                    </div>
                    <div class="min-w-0">
                      <NuxtLink :to="`/members?id=${member.id}`" class="font-medium text-text text-sm hover:text-accent transition-colors truncate block">
                        {{ member.firstName }} {{ member.lastName }}
                      </NuxtLink>
                      <span v-if="member.email" class="text-xs text-muted block truncate">{{ member.email }}</span>
                    </div>
                  </td>

                  <!-- Cedula -->
                  <td class="py-3.5 px-4 font-mono text-xs lg:text-sm">
                    <span :class="member.cedula && member.cedula.startsWith('PENDIENTE') ? 'text-warning font-semibold' : 'text-text'">
                      {{ member.cedula }}
                    </span>
                  </td>

                  <!-- Phone -->
                  <td class="py-3.5 px-4 font-mono text-xs lg:text-sm text-muted">
                    {{ member.phone || '—' }}
                  </td>

                  <!-- Expiry Date -->
                  <td class="py-3.5 px-4 font-mono text-xs lg:text-sm">
                    <span v-if="isNoExpiryPlan(member.endDate)" class="text-success font-medium">
                      No vence
                    </span>
                    <span v-else class="text-text">
                      {{ formatDate(member.endDate) }}
                    </span>
                  </td>

                  <!-- Status Badge -->
                  <td class="py-3.5 px-4 whitespace-nowrap">
                    <span 
                      v-if="member.status === 'active'"
                      class="bg-success/15 text-success border border-success/30 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider inline-block"
                    >
                      Activo
                    </span>
                    <span 
                      v-else
                      class="bg-danger/15 text-danger border border-danger/30 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider inline-block"
                    >
                      Vencido
                    </span>
                  </td>

                  <!-- Move Plan Action -->
                  <td class="py-3.5 px-4 text-right whitespace-nowrap">
                    <button 
                      @click="openMoveModal(member)"
                      class="bg-surface-2 hover:bg-accent hover:text-white border border-border hover:border-accent text-text px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <ArrowRightLeft class="w-3.5 h-3.5" />
                      <span>Mover de Plan</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <!-- Move Member Modal -->
    <div 
      v-if="isMoveModalOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-reveal"
      @click.self="closeMoveModal"
    >
      <div class="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
        <div class="flex items-center justify-between border-b border-border/40 pb-3">
          <div class="flex items-center gap-2">
            <ArrowRightLeft class="w-5 h-5 text-accent" />
            <h3 class="font-display font-bold text-lg text-text uppercase">Cambiar Plan de Miembro</h3>
          </div>
          <button @click="closeMoveModal" class="text-muted hover:text-text cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div v-if="selectedMember" class="bg-surface-2 border border-border/60 rounded-xl p-3 flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center font-display font-bold text-sm text-text shrink-0 overflow-hidden">
            <img v-if="selectedMember.photoPath" :src="selectedMember.photoPath" class="w-full h-full object-cover" />
            <span v-else>{{ getInitials(selectedMember) }}</span>
          </div>
          <div class="min-w-0">
            <h4 class="font-medium text-text text-sm truncate">{{ selectedMember.firstName }} {{ selectedMember.lastName }}</h4>
            <p class="text-xs text-muted">C.C. {{ selectedMember.cedula }} · Plan actual: <strong class="text-accent">{{ plan?.name }}</strong></p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-muted uppercase">Selecciona el Nuevo Plan</label>
          <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
            <div 
              v-for="p in otherPlans" 
              :key="p.id"
              @click="targetPlanId = p.id"
              :class="[
                'p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between',
                targetPlanId === p.id 
                  ? 'bg-accent/10 border-accent text-text' 
                  : 'bg-surface-2 border-border/70 text-muted hover:text-text hover:border-border'
              ]"
            >
              <div>
                <div class="font-medium text-text text-xs flex items-center gap-1.5">
                  <span>{{ p.name }}</span>
                  <span v-if="p.maxMembers > 1" class="text-[9px] bg-info/20 text-info px-1 py-0.2 rounded font-bold">Grupal</span>
                </div>
                <span class="text-[11px] text-muted">{{ p.durationDays }} días de acceso</span>
              </div>
              <span class="font-display font-bold text-sm text-accent">${{ formatCurrency(p.price) }}</span>
            </div>
          </div>
        </div>

        <!-- Alert -->
        <p class="text-[11px] text-muted bg-surface-2 p-2.5 rounded-lg border border-border/40">
          La suscripción activa del miembro se actualizará inmediatamente al plan seleccionado manteniendo su registro histórico.
        </p>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2">
          <button 
            @click="closeMoveModal"
            class="flex-1 py-2.5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            @click="confirmMoveMember"
            :disabled="!targetPlanId || moving"
            class="flex-1 py-2.5 rounded-xl bg-accent text-white border border-accent hover:bg-accent-soft disabled:opacity-50 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span v-if="moving" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
            <span v-else>Confirmar Cambio</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Users, CheckCircle, Clock, Search, AlertCircle, ArrowRightLeft, X } from 'lucide-vue-next';
import { usePlans } from '../composables/usePlans';

const route = useRoute();
const router = useRouter();
const { plans, fetchPlans, fetchPlanDetail, moveMember } = usePlans();

const plan = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const searchQuery = ref('');

// Move Member Modal State
const isMoveModalOpen = ref(false);
const selectedMember = ref<any>(null);
const targetPlanId = ref<number | null>(null);
const moving = ref(false);

const loadData = async () => {
  loading.value = true;
  error.value = null;

  const slugParam = route.params.slug as string;
  const result = await fetchPlanDetail(slugParam);

  if (result.success) {
    plan.value = result.data;
  } else {
    error.value = result.error;
  }

  await fetchPlans();
  loading.value = false;
};

onMounted(() => {
  loadData();
});

const otherPlans = computed(() => {
  if (!plan.value) return [];
  return plans.value.filter((p) => p.id !== plan.value.id && p.isActive);
});

const filteredMembers = computed(() => {
  if (!plan.value || !plan.value.members) return [];
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return plan.value.members;

  return plan.value.members.filter((m: any) => {
    const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
    const cedula = (m.cedula || '').toLowerCase();
    return fullName.includes(q) || cedula.includes(q);
  });
});

const openMoveModal = (member: any) => {
  selectedMember.value = member;
  targetPlanId.value = null;
  isMoveModalOpen.value = true;
};

const closeMoveModal = () => {
  isMoveModalOpen.value = false;
  selectedMember.value = null;
  targetPlanId.value = null;
};

const confirmMoveMember = async () => {
  if (!selectedMember.value || !targetPlanId.value) return;

  moving.value = true;
  const res = await moveMember(selectedMember.value.id, targetPlanId.value);
  moving.value = false;

  if (res.success) {
    closeMoveModal();
    await loadData();
  } else {
    alert(res.error);
  }
};

const getInitials = (m: any) => {
  const f = m.firstName ? m.firstName.charAt(0) : '';
  const l = m.lastName ? m.lastName.charAt(0) : '';
  return (f + l).toUpperCase() || 'U';
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val || 0);
};

const isNoExpiryPlan = (endDate: string) => {
  if (!endDate) return false;
  return endDate.startsWith('2099') || (plan.value && (plan.value.name || '').toUpperCase().includes('ESPECIAL'));
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO');
};
</script>
