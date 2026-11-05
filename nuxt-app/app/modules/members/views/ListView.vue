<template>
  <div class="flex h-full w-full">
    <!-- Main Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <div class="px-6 lg:px-8 py-5 lg:py-6 border-b border-border flex items-center justify-between gap-3 shrink-0">
        <h1 class="font-display font-bold text-2xl tracking-wide uppercase text-text whitespace-nowrap shrink-0">Directorio de Miembros</h1>
        
        <div class="flex items-center gap-2.5 lg:gap-4 min-w-0">
          <!-- Search Bar with Theme-Adaptive Text & Subtle Focus -->
          <div class="relative w-48 sm:w-60 lg:w-72 xl:w-80">
            <SearchIcon 
              :class="[
                'w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 z-10',
                isFocused || searchQuery ? 'text-accent' : 'text-muted'
              ]" 
            />
            <input 
              ref="searchInputRef"
              v-model="searchQuery" 
              @input="onSearch"
              @focus="isFocused = true"
              @blur="isFocused = false"
              @keydown.esc="clearSearch"
              type="text" 
              placeholder="Buscar miembros (CC o Nombre)..." 
              :class="[
                'w-full text-text pl-10 pr-16 py-2 rounded-xl outline-none transition-colors duration-200 font-body text-xs lg:text-sm border bg-surface-2',
                isFocused || searchQuery
                  ? 'border-accent shadow-sm'
                  : 'border-border hover:border-border/80 placeholder:text-muted/60'
              ]"
            />

            <!-- Action Button or Shortcut Badge -->
            <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
              <button 
                v-if="searchQuery" 
                @click="clearSearch" 
                title="Limpiar búsqueda (Esc)"
                class="text-muted hover:text-accent p-1 rounded-md hover:bg-accent/10 transition-colors cursor-pointer"
              >
                <XIcon class="w-3.5 h-3.5" />
              </button>
              <span 
                v-else 
                :class="[
                  'px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors',
                  isFocused ? 'bg-accent/20 text-accent font-bold border border-accent/30' : 'bg-surface border border-border/60 text-muted/70'
                ]"
              >
                Ctrl+K
              </span>
            </div>
          </div>

          <button
            type="button"
            @click="showImportModal = true"
            class="bg-surface-2 text-text border border-border hover:border-accent hover:text-accent cursor-pointer flex items-center justify-center gap-1.5 lg:gap-2 py-2 px-3.5 lg:py-2.5 lg:px-4 rounded-xl font-bold uppercase tracking-wider transition-all duration-200 text-xs lg:text-sm shrink-0"
            title="Importar socios desde archivo CSV"
          >
            <Upload class="w-4 h-4" />
            <span>Importar</span>
          </button>

          <NuxtLink to="/members/new" class="bg-accent text-white border-accent cursor-pointer hover:bg-accent-soft active:scale-[0.99] flex items-center justify-center gap-1.5 lg:gap-2 py-2 px-3.5 lg:py-2.5 lg:px-5 rounded-xl font-bold uppercase tracking-wider transition-all duration-200 text-xs lg:text-sm shadow-md shrink-0">
            <PlusIcon class="w-4 h-4" />
            <span>Nuevo</span>
          </NuxtLink>
        </div>
      </div>

      <!-- List Section -->
      <div class="flex-1 overflow-auto px-6 lg:px-8 py-6">
        <MemberListSection 
          :members="filteredMembersList" 
          :loading="loading" 
          :loading-more="loadingMore"
          :has-more="hasMore"
          @load-more="loadMore"
          @select="onSelectMember" 
          :selected-id="selectedMemberId" 
        />
      </div>
    </div>

    <!-- Right Panel -->
    <div class="w-80 lg:w-88 xl:w-96 2xl:w-[380px] border-l border-border bg-surface shrink-0 flex flex-col">
      <MemberDetailPanel v-if="selectedMemberId" :member-id="selectedMemberId" />
      <div v-else class="flex-1 flex flex-col items-center justify-center p-8 text-center animate-reveal">
        <UserCircleIcon class="w-16 h-16 text-muted opacity-50 mb-4" />
        <template v-if="loading">
          <h3 class="text-text font-display uppercase tracking-widest text-sm mb-2">Cargando...</h3>
        </template>
        <template v-else-if="members.length === 0">
          <h3 class="text-text font-display uppercase tracking-widest text-sm mb-2">Directorio vacío</h3>
          <p class="text-muted text-sm font-body mb-6">Aún no hay miembros registrados en el sistema.</p>
          <NuxtLink to="/members/new" class="bg-accent text-white border-accent cursor-pointer hover:bg-accent-soft active:scale-[0.99] flex items-center justify-center gap-2 py-2 px-6 rounded font-bold uppercase tracking-wider transition-all text-xs">
            <PlusIcon class="w-4 h-4" />
            Registrar el primero
          </NuxtLink>
        </template>
        <template v-else>
          <h3 class="text-text font-display uppercase tracking-widest text-sm mb-2">Ningún perfil seleccionado</h3>
          <p class="text-muted text-sm font-body">Selecciona un miembro de la lista para ver su información y suscripción activa.</p>
        </template>
      </div>
    </div>

    <!-- Import Modal -->
    <ImportMembersModal
      :is-open="showImportModal"
      @close="showImportModal = false"
      @success="handleImportSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { SearchIcon, PlusIcon, UserCircleIcon, XIcon, Upload } from 'lucide-vue-next';
import { useMembers } from '../composables/useMembers';
import MemberListSection from '../sections/MemberListSection.vue';
import MemberDetailPanel from '../sections/MemberDetailPanel.vue';
import ImportMembersModal from '../components/ImportMembersModal.vue';

const { members, loading, loadingMore, hasMore, loadMore, fetchMembers } = useMembers();
const route = useRoute();
const router = useRouter();

const showImportModal = ref(false);
const handleImportSuccess = async () => {
  await fetchMembers();
};

const searchInputRef = ref<HTMLInputElement | null>(null);
const isFocused = ref(false);
const searchQuery = ref((route.query.q as string) || '');
const selectedMemberId = ref<number | null>(route.query.id ? parseInt(route.query.id as string) : null);

watch(() => route.query.id, (newId) => {
  selectedMemberId.value = newId ? parseInt(newId as string) : null;
});

let searchDebounceTimer: any = null;

const onSearch = () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    router.replace({ query: { ...route.query, q: searchQuery.value || undefined } });
  }, 350);
};

const clearSearch = () => {
  clearTimeout(searchDebounceTimer);
  searchQuery.value = '';
  router.replace({ query: { ...route.query, q: undefined } });
  searchInputRef.value?.focus();
};

const filteredMembersList = computed(() => {
  if (!searchQuery.value) return members.value;
  const q = searchQuery.value.toLowerCase();
  return members.value.filter(m => 
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || 
    m.cedula.includes(q)
  );
});

const handleFocusRequest = async () => {
  await nextTick();
  setTimeout(() => {
    searchInputRef.value?.focus();
    searchInputRef.value?.select();
    if (route.query.focus) {
      router.replace({ query: { ...route.query, focus: undefined } });
    }
  }, 30);
};

watch(() => route.query.focus, (focusVal) => {
  if (focusVal === '1') {
    handleFocusRequest();
  }
}, { immediate: true });

watch(() => route.query.q, (newQ) => {
  const queryStr = (newQ as string) || '';
  searchQuery.value = queryStr;
  fetchMembers(queryStr);
}, { immediate: true });

onMounted(() => {
  if (route.query.focus === '1' || route.query.q !== undefined) {
    handleFocusRequest();
  }
});

const onSelectMember = (id: number) => {
  selectedMemberId.value = id;
  router.push({ query: { ...route.query, id: String(id) } });
};
</script>

<style scoped>
@reference "~/assets/css/main.css";
</style>
