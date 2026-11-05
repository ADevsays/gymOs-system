<template>
  <div class="w-full relative min-h-75">
    <!-- Initial Loading Spinner (only when no members are loaded yet) -->
    <div v-if="loading && members.length === 0" class="flex items-center justify-center py-24">
      <div class="flex flex-col items-center gap-5">
        <div class="w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin"></div>
        <p class="text-muted text-sm font-display tracking-[0.2em] uppercase animate-pulse">Cargando Miembros...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && members.length === 0" class="flex flex-col items-center justify-center py-24 transition-opacity duration-300">
      <div class="w-20 h-20 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-6">
        <UsersIcon class="w-10 h-10 text-muted opacity-50" />
      </div>
      <h3 class="text-text font-display text-xl uppercase tracking-[0.15em] mb-2">No se encontraron miembros</h3>
      <p class="text-muted text-sm font-body max-w-md text-center leading-relaxed">
        Intenta con otro término de búsqueda o registra a un nuevo miembro.
      </p>
    </div>

    <!-- Member Cards Grid (Smooth in-place rendering without layout jumps) -->
    <div 
      v-else 
      :class="[
        'grid grid-cols-1 gap-4 pb-4 transition-opacity duration-300',
        loading ? 'opacity-70 pointer-events-none' : 'opacity-100'
      ]"
    >
      <div
        v-for="member in members"
        :key="member.id"
        :id="'member-row-' + member.id"
        @click="$emit('select', member.id)"
        :class="[
          'group relative flex items-center gap-3.5 lg:gap-4.5 p-3.5 lg:p-4.5 rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden',
          selectedId === member.id
            ? 'border-accent bg-accent/6 shadow-[0_0_30px_-8px_rgba(230,0,0,0.15)]'
            : 'border-border bg-surface hover:border-accent/30 hover:shadow-[0_0_20px_-12px_rgba(0,0,0,0.2)]'
        ]"
      >
        <!-- Photo -->
        <div class="relative shrink-0">
          <div
            class="w-20 h-20 sm:w-22 sm:h-22 lg:w-24 lg:h-24 xl:w-26 xl:h-26 rounded-xl overflow-hidden border-2 border-border transition-all duration-300 flex items-center justify-center group-hover:border-accent/30 bg-surface-2"
          >
            <img
              v-if="member.photoPath"
              :src="member.photoPath"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div v-else class="w-full h-full bg-surface-2 flex items-center justify-center">
              <span class="font-display font-bold text-2xl sm:text-3xl xl:text-4xl text-accent/80">
                {{ member.firstName.charAt(0) }}{{ member.lastName.charAt(0) }}
              </span>
            </div>
          </div>

          <!-- Status dot -->
          <div
            :class="[
              'absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full border-2 border-surface transition-colors duration-300',
              getStatusDotClass(member)
            ]"
          ></div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <h4
            :class="[
              'font-display font-bold text-base sm:text-lg xl:text-xl uppercase tracking-wide transition-colors duration-200 truncate',
              selectedId === member.id ? 'text-accent' : 'text-text group-hover:text-accent'
            ]"
          >
            {{ member.firstName }} {{ member.lastName }}
          </h4>

          <div class="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
            <span class="font-mono text-xs text-muted tracking-wider">
              CC: {{ member.cedula }}
            </span>
            <span class="w-1 h-1 rounded-full bg-border"></span>
            <span class="font-body text-xs text-muted/70">
              Registrado {{ formatRelativeDate(member.createdAt) }}
            </span>
          </div>

          <!-- Subscription info -->
          <div v-if="member.activeSubscription" class="mt-2.5 flex flex-wrap items-center gap-2 sm:gap-3">
            <div
              :class="[
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider',
                getDiffDays(member) < 0
                  ? 'bg-danger/10 text-danger border border-danger/20'
                  : getDiffDays(member) <= 7
                    ? 'bg-warning/10 text-warning border border-warning/20'
                    : 'bg-success/10 text-success border border-success/20'
              ]"
            >
              <span
                :class="[
                  'w-1.5 h-1.5 rounded-full',
                  getDiffDays(member) < 0 ? 'bg-danger' :
                  getDiffDays(member) <= 7 ? 'bg-warning' : 'bg-success'
                ]"
              ></span>
              {{ member.activeSubscription.planName }}
            </div>
            <span :class="['font-body text-xs', getSubscriptionTextClass(member)]">
              {{ getSubscriptionExpiryText(member) }}
            </span>
          </div>
          <div v-else class="mt-2.5">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-surface-2 text-muted border border-border">
              <span class="w-1.5 h-1.5 rounded-full bg-muted"></span>
              Sin suscripción
            </span>
          </div>
        </div>

        <!-- Right chevron -->
        <div
          :class="[
            'shrink-0 transition-all duration-300',
            selectedId === member.id
              ? 'text-accent translate-x-0.5'
              : 'text-muted/30 group-hover:text-accent/60 group-hover:translate-x-0.5'
          ]"
        >
          <ChevronRight class="w-5 h-5" />
        </div>
      </div>

      <!-- Infinite Scroll Sentinel & Bottom Loader -->
      <div ref="sentinelRef" class="w-full py-4 flex items-center justify-center">
        <div v-if="loadingMore" class="flex items-center gap-2.5 text-muted text-xs font-mono">
          <div class="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          <span>Cargando más miembros...</span>
        </div>
        <div v-else-if="!hasMore && members.length > 20" class="text-muted/40 text-[11px] font-mono tracking-wider uppercase">
          Fin del directorio ({{ members.length }} miembros)
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { UsersIcon, ChevronRight } from 'lucide-vue-next';
import type { MemberListItem } from '../types';
import { calendarDaysUntil, formatCalendarDate } from '~/utils/calendarDate';

const props = withDefaults(defineProps<{
  members: MemberListItem[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  selectedId: number | null;
}>(), {
  loadingMore: false,
  hasMore: false,
});

const emit = defineEmits<{
  (e: 'select', id: number): void;
  (e: 'load-more'): void;
}>();

const sentinelRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting && props.hasMore && !props.loading && !props.loadingMore) {
        emit('load-more');
      }
    }, {
      rootMargin: '200px',
    });

    if (sentinelRef.value) {
      observer.observe(sentinelRef.value);
    }
  }
});

watch(sentinelRef, (newEl) => {
  if (observer && newEl) {
    observer.disconnect();
    observer.observe(newEl);
  }
});

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});

const scrollToSelected = async () => {
  if (props.selectedId) {
    await nextTick();
    const el = document.getElementById('member-row-' + props.selectedId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
};

watch(() => props.selectedId, scrollToSelected, { immediate: true });

watch(() => props.members.length, (newLen, oldLen) => {
  if (newLen > 0 && (oldLen === 0 || oldLen === undefined)) {
    scrollToSelected();
  }
});

const isNoExpiryPlan = (member: MemberListItem) => {
  if (!member.activeSubscription) return false;
  const name = (member.activeSubscription.planName || '').toUpperCase();
  return name.includes('ESPECIAL') || (member.activeSubscription.planPrice === 0 && name.includes('ESPECIAL'));
};

const getDiffDays = (member: MemberListItem) => {
  if (!member.activeSubscription) return Infinity;
  if (isNoExpiryPlan(member)) return Infinity;
  return calendarDaysUntil(member.activeSubscription.endDate);
};

const getStatusDotClass = (member: MemberListItem) => {
  if (!member.activeSubscription) return 'bg-zinc-600';
  if (isNoExpiryPlan(member)) return 'bg-success';
  const diff = getDiffDays(member);
  if (diff < 0) return 'bg-danger';
  if (diff <= 3) return 'bg-warning';
  if (diff <= 7) return 'bg-amber-400';
  return 'bg-success';
};

const getSubscriptionExpiryText = (member: MemberListItem) => {
  if (!member.activeSubscription) return 'Sin suscripción';
  if (isNoExpiryPlan(member)) return 'No vence';
  const diff = getDiffDays(member);
  const formattedDate = formatDate(member.activeSubscription.endDate);

  if (diff < 0) {
    const days = Math.abs(diff);
    return `Venció hace ${days} ${days === 1 ? 'día' : 'días'} (${formattedDate})`;
  }
  if (diff === 0) return `Vence hoy (${formattedDate})`;
  if (diff === 1) return `Vence mañana (${formattedDate})`;
  if (diff <= 7) return `Vence en ${diff} días (${formattedDate})`;
  return `Vence el ${formattedDate}`;
};

const getSubscriptionTextClass = (member: MemberListItem) => {
  if (!member.activeSubscription) return 'text-muted/60';
  if (isNoExpiryPlan(member)) return 'text-success/90 font-medium';
  const diff = getDiffDays(member);
  if (diff < 0) return 'text-danger/90 font-medium';
  if (diff <= 3) return 'text-warning/90 font-medium';
  return 'text-muted/70';
};

const formatRelativeDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} sem`;
  return formatDate(dateStr);
};

const formatDate = (dateStr: string) => {
  return formatCalendarDate(dateStr);
};
</script>

<style scoped>
@reference "~/assets/css/main.css";
</style>
