<template>
  <div v-if="loading" class="flex-1 flex items-center justify-center">
    <div class="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
  </div>
  
  <div v-else-if="!member" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
    <p class="text-danger text-sm font-bold">Error cargando perfil</p>
  </div>
  
  <div v-else class="flex-1 overflow-y-auto bg-surface animate-reveal">
    <!-- Header Cover -->
    <div class="h-32 bg-surface-2 border-b border-border relative">
      <div 
        class="absolute -bottom-10 left-6 w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center shadow-lg overflow-hidden select-none"
        :class="member.photoPath ? 'cursor-pointer group hover:ring-2 hover:ring-accent transition-all duration-200' : ''"
        @click="member.photoPath ? showPhotoModal = true : null"
        :title="member.photoPath ? 'Clic para ampliar foto' : ''"
      >
        <template v-if="member.photoPath">
          <img :src="member.photoPath" class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 text-white">
            <ZoomIn class="w-5 h-5 drop-shadow" />
          </div>
        </template>
        <span v-else class="text-accent font-display font-bold text-2xl">{{ member.firstName.charAt(0) }}{{ member.lastName.charAt(0) }}</span>
      </div>
      <div class="absolute right-4 top-4 flex items-center gap-1.5">
        <NuxtLink :to="`/members/edit?id=${member.id}`" class="w-8 h-8 rounded bg-surface border border-border flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors" title="Editar Perfil">
          <PenLine class="w-4 h-4" />
        </NuxtLink>
        <button 
          type="button" 
          @click="showDeleteModal = true" 
          class="w-8 h-8 rounded bg-surface border border-border flex items-center justify-center text-muted hover:text-danger hover:border-danger/40 transition-colors cursor-pointer" 
          title="Archivar Socio"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Info -->
    <div class="pt-12 px-4 pb-4 lg:pt-14 lg:px-5 lg:pb-5 xl:px-6 xl:pb-6 border-b border-border">
      <h2 class="text-lg lg:text-xl font-display font-bold text-text uppercase tracking-wide">{{ member.firstName }} {{ member.lastName }}</h2>
      <p class="text-muted text-xs lg:text-sm font-mono mt-1 flex items-center">
        CC: {{ member.cedula }}
        <span v-if="age !== null" class="ml-2 font-body text-xs text-muted/70">• {{ age }} años</span>
      </p>

      <!-- WhatsApp Contact Link -->
      <div v-if="whatsappLink" class="mt-2.5 flex items-center gap-2">
        <a 
          :href="whatsappLink" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
          title="Abrir chat en WhatsApp"
        >
          <MessageCircle class="w-3.5 h-3.5" />
          <span>{{ formattedPhone }}</span>
        </a>
      </div>

      <div class="mt-3 flex flex-wrap gap-2">
        <div v-if="member.bloodType" class="px-2 py-0.5 bg-surface-2 border border-border rounded-sm text-xs font-bold text-text">
          🩸 {{ member.bloodType }}
        </div>
        <div class="px-2 py-0.5 bg-surface-2 border border-border rounded-sm text-xs font-bold text-text">
          LTV: ${{ formatCurrency(member.ltv) }}
        </div>
      </div>
    </div>

    <!-- Observaciones -->
    <div v-if="member.notes" class="p-4 lg:p-5 xl:p-6 border-b border-border">
      <h3 class="text-xs font-bold uppercase tracking-widest text-muted mb-2">Observaciones</h3>
      <div class="bg-warning/5 border border-warning/20 rounded p-3">
        <p class="text-xs lg:text-sm text-text/80 whitespace-pre-wrap leading-relaxed">{{ member.notes }}</p>
      </div>
    </div>

    <!-- Active Subscription -->
    <div class="p-4 lg:p-5 xl:p-6 border-b border-border">
      <h3 class="text-xs font-bold uppercase tracking-widest text-muted mb-3">Estado Actual</h3>
      
      <!-- Payer (Si es beneficiario) -->
      <div v-if="member.payer" class="mb-3 bg-info/10 border border-info/30 p-2.5 rounded-sm flex items-start gap-2.5">
        <UsersIcon class="w-4 h-4 text-info shrink-0 mt-0.5" />
        <div>
          <p class="text-[10px] font-bold text-info uppercase tracking-wider mb-0.5">Beneficiario</p>
          <p class="text-xs text-text font-medium">Plan pagado por <NuxtLink :to="`/members?id=${member.payer.id}`" class="underline hover:text-accent">{{ member.payer.firstName }} {{ member.payer.lastName }}</NuxtLink></p>
        </div>
      </div>

      <!-- Beneficiarios a cargo (Si es pagador) -->
      <div v-if="member.beneficiaries && member.beneficiaries.length > 0" class="mb-3">
        <h4 class="text-xs font-bold uppercase tracking-wider text-muted mb-2">Beneficiarios a Cargo</h4>
        <div class="space-y-1.5">
          <div v-for="b in member.beneficiaries" :key="b.id" class="flex justify-between items-center bg-surface-2 p-2 border border-border rounded-sm">
            <span class="text-xs font-medium truncate mr-2"><NuxtLink :to="`/members?id=${b.id}`" class="hover:text-accent">{{ b.firstName }} {{ b.lastName }}</NuxtLink></span>
            <span class="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">{{ b.subscription.planName }}</span>
          </div>
        </div>
      </div>
      
      <div v-if="activeSub" class="bg-surface-2 border border-border rounded p-3.5 lg:p-4 relative overflow-hidden">
        <div class="absolute top-0 left-0 w-1 h-full" :class="statusColorClass"></div>
        <div class="flex justify-between items-start mb-2">
          <h4 class="font-bold text-text text-sm">{{ activeSub.planName }}</h4>
          <SubscriptionBadge :is-active="daysRemaining >= 0" :days-remaining="daysRemaining" />
        </div>
        <p :class="['text-xs font-mono mb-3', daysRemaining < 0 ? 'text-danger/90 font-medium' : 'text-muted']">
          {{ expiryText }}
        </p>
        <div class="flex items-center gap-2">
          <button 
            type="button"
            @click="showRenewModal = true"
            class="flex-1 bg-surface text-text border border-border cursor-pointer hover:border-accent flex items-center justify-center gap-2 py-2 px-3 rounded-sm font-bold uppercase tracking-wider transition-all text-xs"
          >
            Renovar Plan
          </button>
          <button 
            type="button"
            @click="showRefundModal = true"
            class="bg-surface text-danger/80 border border-border cursor-pointer hover:border-danger hover:text-danger flex items-center justify-center gap-1.5 py-2 px-3 rounded-sm font-bold uppercase tracking-wider transition-all text-xs"
            title="Cancelar plan y reembolsar"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Reembolsar</span>
          </button>
        </div>
      </div>
      
      <div v-else class="bg-surface-2 border border-border rounded p-4 text-center">
        <p class="text-muted text-xs lg:text-sm font-body mb-3">Sin suscripción activa</p>
        <button 
          type="button"
          @click="showRenewModal = true"
          class="w-full bg-accent text-white border-accent cursor-pointer hover:bg-accent-soft active:scale-[0.99] flex items-center justify-center gap-2 py-2 px-4 rounded-sm font-bold uppercase tracking-wider transition-all text-xs"
        >
          Nuevo Plan
        </button>
      </div>
    </div>

    <!-- Payments -->
    <div class="p-4 lg:p-5 xl:p-6 flex-1">
      <h3 class="text-xs font-bold uppercase tracking-widest text-muted mb-3">Últimos Pagos</h3>
      <PaymentHistory :payments="member.payments" />
    </div>

    <!-- Member Photo Lightbox Modal -->
    <ImagePreviewModal
      v-if="member.photoPath"
      :is-open="showPhotoModal"
      :src="member.photoPath"
      :title="`${member.firstName} ${member.lastName}`"
      :subtitle="`CC: ${member.cedula}`"
      @close="showPhotoModal = false"
    />

    <!-- Renew Plan Modal -->
    <RenewPlanModal
      :is-open="showRenewModal"
      :member="member"
      @close="showRenewModal = false"
      @success="handleRenewSuccess"
    />

    <!-- Refund Subscription Modal -->
    <RefundSubscriptionModal
      :is-open="showRefundModal"
      :member="member"
      @close="showRefundModal = false"
      @success="handleRefundSuccess"
    />

    <!-- Archive Member Confirmation Modal -->
    <AppConfirmDeleteModal
      :is-open="showDeleteModal"
      title="Archivar Socio"
      subtitle="El socio dejará de aparecer en el directorio activo."
      :item-title="member ? `${member.firstName} ${member.lastName}` : ''"
      description="El historial de pagos y membresías de este socio se conservará de forma segura en la base de datos para auditorías."
      confirm-text="Sí, Archivar"
      :loading="archiveLoading"
      @close="showDeleteModal = false"
      @confirm="handleArchiveMember"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { MoreVerticalIcon, UsersIcon, PenLine, ZoomIn, Trash2, RotateCcw, MessageCircle } from 'lucide-vue-next';
import { useMembers } from '../composables/useMembers';
import type { MemberDetail } from '../types';
import SubscriptionBadge from '../components/SubscriptionBadge.vue';
import PaymentHistory from '../components/PaymentHistory.vue';
import ImagePreviewModal from '~/ui/components/ImagePreviewModal.vue';
import RenewPlanModal from '../components/RenewPlanModal.vue';
import RefundSubscriptionModal from '../components/RefundSubscriptionModal.vue';
import AppConfirmDeleteModal from '~/ui/components/AppConfirmDeleteModal.vue';
import { calendarDaysUntil, formatCalendarDate, parseCalendarDate } from '~/utils/calendarDate';

const props = defineProps<{
  memberId: number;
}>();

const router = useRouter();
const showPhotoModal = ref(false);
const showRenewModal = ref(false);
const showRefundModal = ref(false);
const showDeleteModal = ref(false);
const archiveLoading = ref(false);

const { getMemberDetails, archiveMember, fetchMembers } = useMembers();
const member = ref<MemberDetail | null>(null);
const loading = ref(true);

const whatsappLink = computed(() => {
  if (!member.value?.phone) return null;
  const digits = String(member.value.phone).replace(/\D/g, '');
  if (!digits) return null;
  const fullNumber = digits.length === 10 ? `57${digits}` : digits;
  return `https://wa.me/${fullNumber}`;
});

const formattedPhone = computed(() => {
  if (!member.value?.phone) return '';
  const digits = String(member.value.phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return member.value.phone;
});

const load = async () => {
  loading.value = true;
  member.value = await getMemberDetails(props.memberId);
  loading.value = false;
};

const handleRenewSuccess = async () => {
  await load();
  await fetchMembers();
};

const handleRefundSuccess = async () => {
  await load();
  await fetchMembers();
};

const handleArchiveMember = async () => {
  if (!member.value) return;
  archiveLoading.value = true;
  const res = await archiveMember(member.value.id);
  archiveLoading.value = false;
  if (res.success) {
    showDeleteModal.value = false;
    router.push('/members');
    await fetchMembers();
  } else {
    alert(res.error || 'Error al archivar el socio');
  }
};

watch(() => props.memberId, load, { immediate: true });

const activeSub = computed(() => {
  if (!member.value) return null;
  return member.value.subscriptions.find(s => s.status === 'active') || null;
});

const isNoExpiryPlan = computed(() => {
  if (!activeSub.value) return false;
  const name = (activeSub.value.planName || '').toUpperCase();
  return name.includes('ESPECIAL') || (activeSub.value.planPrice === 0 && name.includes('ESPECIAL'));
});

const daysRemaining = computed(() => {
  if (!activeSub.value) return -1;
  if (isNoExpiryPlan.value) return Infinity;
  return calendarDaysUntil(activeSub.value.endDate);
});

const expiryText = computed(() => {
  if (!activeSub.value) return '';
  if (isNoExpiryPlan.value) return 'Sin fecha de vencimiento (No vence)';
  const days = daysRemaining.value;
  const formattedDate = formatDate(activeSub.value.endDate);
  if (days < 0) {
    const absDays = Math.abs(days);
    return `Venció hace ${absDays} ${absDays === 1 ? 'día' : 'días'} (${formattedDate})`;
  }
  if (days === 0) return `Vence hoy (${formattedDate})`;
  if (days === 1) return `Vence mañana (${formattedDate})`;
  if (days <= 7) return `Vence en ${days} días (${formattedDate})`;
  return `Vence: ${formattedDate}`;
});

const statusColorClass = computed(() => {
  if (isNoExpiryPlan.value) return 'bg-success';
  const days = daysRemaining.value;
  if (days < 0) return 'bg-danger';
  if (days <= 7) return 'bg-warning';
  return 'bg-success';
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO').format(val);
};

const formatDate = (dateStr: string) => {
  return formatCalendarDate(dateStr);
};

const age = computed(() => {
  if (!member.value?.birthDate) return null;
  const birth = parseCalendarDate(member.value.birthDate);
  const today = new Date();
  let a = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    a--;
  }
  return a;
});
</script>
<style scoped>
@reference "~/assets/css/main.css";
</style>
