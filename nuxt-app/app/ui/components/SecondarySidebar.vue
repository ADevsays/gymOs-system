<template>
  <aside class="w-(--sidebar-list-width) h-full bg-surface border-r border-border/30 flex flex-col z-10 relative">
    <!-- Header -->
    <div class="px-5 py-6 shrink-0 border-b border-border/20 flex items-center justify-between gap-3">
      <h2 class="text-xl font-display font-bold text-text tracking-wide uppercase">Miembros</h2>
      <div class="relative">
        <button
          type="button"
          class="w-7 h-7 rounded-sm border border-border bg-surface-2 text-muted hover:text-text hover:border-accent transition-colors cursor-pointer flex items-center justify-center"
          title="Inspeccionar versión de GymOS"
          aria-label="Inspeccionar versión de GymOS"
          @click="showVersion = !showVersion"
        >
          <Info class="w-3.5 h-3.5" />
        </button>
        <div
          v-if="showVersion"
          class="absolute right-0 top-9 z-30 w-44 rounded-sm border border-border bg-surface shadow-lg px-3 py-2 animate-dropdown"
        >
          <p class="text-[10px] font-bold uppercase tracking-wider text-muted">GymOS</p>
          <p class="mt-0.5 font-mono text-xs text-text">Versión {{ currentVersion }}</p>
        </div>
      </div>
    </div>

    <!-- Lists -->
    <div class="flex-1 overflow-y-auto px-3 py-4 space-y-6">

      <!-- Section: Recientes -->
      <div v-if="recentMembers.length > 0">
        <div class="flex items-center justify-between px-2 mb-2">
          <span class="text-xs font-bold uppercase tracking-wider text-muted/80 flex items-center gap-1.5">
            <Clock class="w-3.5 h-3.5" /> Recientes
          </span>
        </div>
        <div class="space-y-1.5">
          <div 
            v-for="member in recentMembers" 
            :key="member.id"
            @click="selectMember(member.id)"
            :class="[
              'relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all group overflow-hidden',
              getCardClass(member)
            ]"
          >
            <!-- Left active indicator bar -->
            <div v-if="isActive(member.id)" class="absolute left-0 top-2 bottom-2 w-1 bg-accent rounded-r-full"></div>

            <!-- Avatar -->
            <div class="relative shrink-0">
              <div class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-surface-2 border border-white/5">
                <img 
                  v-if="member.photoPath" 
                  :src="member.photoPath" 
                  class="w-full h-full object-cover" 
                  alt="Foto"
                />
                <div v-else class="w-full h-full flex items-center justify-center bg-surface-2 font-display font-bold text-xs text-text">
                  {{ getInitials(member) }}
                </div>
              </div>
              <div :class="['absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-surface', getStatusDotClass(member)]"></div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0 pr-1">
              <h3 class="font-medium text-text text-sm truncate group-hover:text-accent transition-colors">
                {{ member.firstName }} {{ member.lastName }}
              </h3>
              <p :class="['text-xs mt-0.5 truncate', getStatusTextClass(member)]">
                {{ getDaysLeftText(member) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Próximos cumpleaños -->
      <div v-if="displayUpcomingBirthdays.length > 0">
        <div class="flex items-center justify-between px-2 mb-2">
          <span class="text-xs font-bold uppercase tracking-wider text-warning flex items-center gap-1.5">
            <Cake class="w-3.5 h-3.5" /> Próximos cumpleaños
          </span>
          <span class="text-[11px] font-medium text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full">{{ displayUpcomingBirthdays.length }}</span>
        </div>
        <div class="space-y-1.5">
          <div
            v-for="member in displayUpcomingBirthdays"
            :key="member.id"
            @click="selectMember(member.id)"
            :class="[
              'relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all group overflow-hidden bg-warning/[0.06] border border-warning/20 hover:bg-warning/10',
              isActive(member.id) ? 'shadow-sm border-warning/40' : ''
            ]"
          >
            <div v-if="isActive(member.id)" class="absolute left-0 top-2 bottom-2 w-1 bg-warning rounded-r-full"></div>
            <div class="relative shrink-0">
              <div class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-surface-2 border border-warning/20">
                <img v-if="member.photoPath" :src="member.photoPath" class="w-full h-full object-cover" alt="Foto" />
                <div v-else class="w-full h-full flex items-center justify-center bg-surface-2 font-display font-bold text-xs text-text">
                  {{ getInitials(member) }}
                </div>
              </div>
              <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-surface bg-warning"></div>
            </div>
            <div class="flex-1 min-w-0 pr-1">
              <h3 class="font-medium text-text text-sm truncate group-hover:text-warning transition-colors">
                {{ member.firstName }} {{ member.lastName }}
              </h3>
              <p class="text-xs mt-0.5 truncate text-warning font-medium">{{ getBirthdayText(member.daysUntil) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Próximos a Vencer -->
      <div v-if="displayUpcomingMembers.length > 0">
        <div class="flex items-center justify-between px-2 mb-2">
          <span class="text-xs font-bold uppercase tracking-wider text-muted/80 flex items-center gap-1.5">
            <User class="w-3.5 h-3.5" /> Próximos a Vencer
          </span>
          <span class="text-[11px] font-medium text-muted bg-surface-2 px-2 py-0.5 rounded-full">{{ displayUpcomingMembers.length }}</span>
        </div>
        <div class="space-y-1.5">
          <div 
            v-for="member in displayUpcomingMembers" 
            :key="member.id"
            @click="selectMember(member.id)"
            :class="[
              'relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all group overflow-hidden',
              getCardClass(member)
            ]"
          >
            <!-- Left active indicator bar -->
            <div v-if="isActive(member.id)" class="absolute left-0 top-2 bottom-2 w-1 bg-accent rounded-r-full"></div>

            <!-- Avatar -->
            <div class="relative shrink-0">
              <div class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-surface-2 border border-white/5">
                <img 
                  v-if="member.photoPath" 
                  :src="member.photoPath" 
                  class="w-full h-full object-cover" 
                  alt="Foto"
                />
                <div v-else class="w-full h-full flex items-center justify-center bg-surface-2 font-display font-bold text-xs text-text">
                  {{ getInitials(member) }}
                </div>
              </div>
              <div :class="['absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-surface', getStatusDotClass(member)]"></div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0 pr-1">
              <h3 class="font-medium text-text text-sm truncate group-hover:text-accent transition-colors">
                {{ member.firstName }} {{ member.lastName }}
              </h3>
              <p :class="['text-xs mt-0.5 truncate', getStatusTextClass(member)]">
                {{ getDaysLeftText(member) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="recentMembers.length === 0 && displayUpcomingBirthdays.length === 0 && displayUpcomingMembers.length === 0" class="text-center py-8 px-4">
        <p class="text-sm text-muted">No hay miembros cargados.</p>
      </div>

    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { User, Clock, Cake, Info } from 'lucide-vue-next';
import { useMembers, type UpcomingBirthdayMember } from '~/modules/members/composables/useMembers';
import type { MemberListItem } from '~/modules/members/types';
import { calendarDaysUntil } from '~/utils/calendarDate';
import { useAutoUpdater } from '~/composables/useAutoUpdater';

const route = useRoute();
const router = useRouter();
const { allMembers, members, fetchMembers, upcomingMembers, fetchUpcomingMembers, upcomingBirthdays, fetchUpcomingBirthdays } = useMembers();
const { currentVersion, checkUpdates } = useAutoUpdater();

const recentSlots = ref<{id: number, ts: number}[]>([]);
const showVersion = ref(false);

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

onMounted(() => {
  fetchMembers();
  fetchUpcomingMembers();
  fetchUpcomingBirthdays();
  checkUpdates();
  try {
    const saved = localStorage.getItem('recentMemberSlots');
    if (saved) {
      recentSlots.value = JSON.parse(saved);
    } else {
      const oldSaved = localStorage.getItem('recentMemberIds');
      if (oldSaved) {
        const ids = JSON.parse(oldSaved) as number[];
        recentSlots.value = ids.slice(0, 3).map((id, index) => ({ id, ts: Date.now() - index * 1000 }));
      }
    }
  } catch (e) {}
});

watch(() => route.query.id, (newId) => {
  if (newId) {
    const id = Number(newId);
    if (!isNaN(id)) {
      const idx = recentSlots.value.findIndex(slot => slot.id === id);
      if (idx > -1 && recentSlots.value[idx]) {
        recentSlots.value[idx]!.ts = Date.now();
      } else {
        if (recentSlots.value.length < 3) {
          recentSlots.value.push({ id, ts: Date.now() });
        } else {
          let oldestIdx = 0;
          for (let i = 1; i < recentSlots.value.length; i++) {
            const slotI = recentSlots.value[i];
            const slotOldest = recentSlots.value[oldestIdx];
            if (slotI && slotOldest && slotI.ts < slotOldest.ts) {
              oldestIdx = i;
            }
          }
          recentSlots.value[oldestIdx] = { id, ts: Date.now() };
        }
      }
      try {
        localStorage.setItem('recentMemberSlots', JSON.stringify(recentSlots.value));
      } catch (e) {}
    }
  }
}, { immediate: true });

const getInitials = (member: MemberListItem) => {
  const f = member.firstName?.charAt(0) || '';
  const l = member.lastName?.charAt(0) || '';
  return (f + l).toUpperCase() || '?';
};

const memberListSource = computed(() => {
  return allMembers.value.length > 0 ? allMembers.value : members.value;
});

const recentMembers = computed(() => {
  return recentSlots.value
    .map(slot => memberListSource.value.find(m => m.id === slot.id))
    .filter((m): m is MemberListItem => Boolean(m));
});

const recentIds = computed(() => new Set(recentMembers.value.map(m => m.id)));

const displayUpcomingMembers = computed(() => {
  const source = upcomingMembers.value.length > 0 
    ? upcomingMembers.value 
    : memberListSource.value.filter(m => m.activeSubscription && !isNoExpiryPlan(m)).sort((a, b) => getDiffDays(a) - getDiffDays(b));

  return source
    .filter(m => !recentIds.value.has(m.id) && !isNoExpiryPlan(m))
    .slice(0, 10);
});

// Un miembro puede ser reciente y cumplir años esta semana; ambas alertas deben verse.
const displayUpcomingBirthdays = computed(() => upcomingBirthdays.value);

const getBirthdayText = (daysUntil: UpcomingBirthdayMember['daysUntil']) => {
  if (daysUntil === 0) return 'Cumple hoy';
  if (daysUntil === 1) return 'Cumple mañana';
  return `Cumple en ${daysUntil} días`;
};

const getCardClass = (member: MemberListItem) => {
  const active = isActive(member.id);
  if (!member.activeSubscription) {
    return active 
      ? 'bg-surface-2 border border-white/10' 
      : 'bg-surface-2/30 border border-transparent hover:bg-surface-2/60';
  }

  if (isNoExpiryPlan(member)) {
    return active 
      ? 'bg-surface-2/90 shadow-sm border-white/10' 
      : 'bg-surface-2/40 border border-white/[0.03] hover:bg-surface-2/70';
  }

  const diff = getDiffDays(member);
  let colorClass = '';

  if (diff < 0) {
    colorClass = 'bg-danger/[0.06] border border-danger/20 hover:bg-danger/12';
  } else if (diff <= 3) {
    colorClass = 'bg-warning/[0.04] border border-warning/15 hover:bg-warning/10';
  } else if (diff <= 7) {
    colorClass = 'bg-surface-2/40 border border-white/[0.03] hover:bg-surface-2/70';
  } else {
    colorClass = 'bg-surface-2/40 border border-white/[0.03] hover:bg-surface-2/70';
  }

  if (active) {
    return `${colorClass} bg-surface-2/90 shadow-sm border-white/10`;
  }
  return colorClass;
};

const getStatusDotClass = (member: MemberListItem) => {
  if (!member.activeSubscription) return 'bg-zinc-600';
  if (isNoExpiryPlan(member)) return 'bg-success';
  const diff = getDiffDays(member);
  if (diff < 0) return 'bg-danger';
  if (diff <= 3) return 'bg-warning';
  if (diff <= 7) return 'bg-warning/80';
  return 'bg-success';
};

const getDaysLeftText = (member: MemberListItem) => {
  if (!member.activeSubscription) return 'Sin plan activo';
  if (isNoExpiryPlan(member)) return 'No vence';
  const diffDays = getDiffDays(member);
  
  if (diffDays < 0) return `Venció hace ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'día' : 'días'}`;
  if (diffDays === 0) return 'Vence hoy';
  if (diffDays === 1) return 'Vence mañana';
  return `Vence en ${diffDays} días`;
};

const getStatusTextClass = (member: MemberListItem) => {
  if (!member.activeSubscription) return 'text-muted/60';
  if (isNoExpiryPlan(member)) return 'text-success font-medium';
  const diff = getDiffDays(member);
  if (diff < 0) return 'text-danger font-medium';
  if (diff <= 3) return 'text-warning font-medium';
  if (diff <= 7) return 'text-warning/80';
  return 'text-muted';
};

const selectMember = (id: number) => {
  router.push(`/members?id=${id}${route.query.q ? `&q=${encodeURIComponent(route.query.q as string)}` : ''}`);
};

const isActive = (id: number) => {
  return route.path === '/members' && route.query.id === String(id);
};
</script>
