<template>
  <div class="w-full flex flex-col pb-8">
    <!-- Top Header -->
    <header class="px-6 lg:px-8 py-5 lg:py-6 border-b border-border/30 flex items-center justify-between gap-4 shrink-0">
      <div class="pt-1.5 md:pt-2">
        <h1 class="font-display font-bold text-2xl tracking-wide uppercase text-text whitespace-nowrap shrink-0">Planes y Promociones</h1>
      </div>
      <button 
        @click="openCreatePanel"
        class="bg-accent text-white border-accent cursor-pointer hover:bg-accent-soft active:scale-[0.99] flex items-center justify-center gap-1.5 lg:gap-2 py-2 px-3.5 lg:py-2.5 lg:px-5 rounded-xl font-bold uppercase tracking-wider transition-all duration-200 text-xs lg:text-sm shadow-md shrink-0"
      >
        <PlusIcon class="w-4 h-4" />
        <span>Nuevo Plan</span>
      </button>
    </header>

    <!-- Plans Content Area -->
    <div class="px-6 lg:px-8 py-6 flex flex-col">
      <!-- Estado de Carga -->
      <div v-if="loading" class="flex-1 flex items-center justify-center py-20">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
      </div>
      
      <!-- Error -->
      <div v-else-if="error" class="bg-danger/10 border border-danger p-4 rounded-xl text-danger flex items-center gap-3">
        <AlertCircleIcon class="w-5 h-5" />
        <span class="text-sm">{{ error }}</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="plans.length === 0" class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-8 md:p-12 text-center bg-surface-2/40 my-6">
        <div class="w-14 h-14 bg-surface border border-border rounded-full flex items-center justify-center mb-4">
          <PlusIcon class="w-7 h-7 text-muted" />
        </div>
        <h2 class="font-display text-lg md:text-xl font-bold text-text mb-1.5">No hay planes creados</h2>
        <p class="text-muted text-xs md:text-sm max-w-md mb-5">Aún no has configurado ninguna membresía. Crea tu primer plan para que puedas empezar a registrar a los miembros del gimnasio.</p>
        <button 
          @click="openCreatePanel"
          class="bg-accent text-white border-accent cursor-pointer hover:bg-accent-soft active:scale-[0.99] flex items-center justify-center gap-2 py-2 px-5 rounded-xl font-bold uppercase tracking-wider transition-all duration-200 text-xs shadow-md"
        >
          <PlusIcon class="w-4 h-4" />
          Crear Plan
        </button>
      </div>

      <!-- Lista de Planes -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3.5 md:gap-4">
        <PlanCard 
          v-for="plan in plans" 
          :key="plan.id" 
          :plan="plan" 
          @edit="editPlan" 
          @archive="handleArchive" 
        />
      </div>
    </div>

    <!-- Panel Lateral para Crear/Editar -->
    <PlanForm 
      :is-open="isPanelOpen" 
      :editing-plan="editingPlan" 
      :saving="saving" 
      @close="closePanel" 
      @save="savePlan" 
    />
    <!-- Modal Confirmar Desactivación de Plan -->
    <AppConfirmDeleteModal
      :is-open="isDeleteModalOpen"
      title="Desactivar Plan"
      subtitle="El plan dejará de estar disponible para nuevas ventas."
      :item-title="planToDelete?.name"
      description="Las membresías activas existentes asociadas a este plan seguirán funcionando con normalidad hasta su fecha de vencimiento."
      confirm-text="Sí, Desactivar"
      :loading="deleteLoading"
      @close="isDeleteModalOpen = false"
      @confirm="confirmArchivePlan"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { PlusIcon, AlertCircleIcon } from 'lucide-vue-next';
import { usePlans } from '../composables/usePlans';
import PlanForm from '../components/PlanForm.vue';
import PlanCard from '../components/PlanCard.vue';
import AppConfirmDeleteModal from '~/ui/components/AppConfirmDeleteModal.vue';

const { plans, loading, error, fetchPlans, createPlan, updatePlan, archivePlan } = usePlans();

// Form State
const isPanelOpen = ref(false);
const editingPlan = ref<any>(null);
const saving = ref(false);

// Deletion State
const isDeleteModalOpen = ref(false);
const planToDelete = ref<any>(null);
const deleteLoading = ref(false);

onMounted(() => {
  fetchPlans();
});

const openCreatePanel = () => {
  editingPlan.value = null;
  isPanelOpen.value = true;
};

const editPlan = (plan: any) => {
  editingPlan.value = plan;
  isPanelOpen.value = true;
};

const closePanel = () => {
  isPanelOpen.value = false;
};

const savePlan = async (payload: any) => {
  saving.value = true;
  
  let result;
  if (editingPlan.value) {
    result = await updatePlan(editingPlan.value.id, payload);
  } else {
    result = await createPlan(payload);
  }

  saving.value = false;

  if (result.success) {
    closePanel();
  } else {
    alert(result.error);
  }
};

const handleArchive = (id: number) => {
  const target = plans.value.find((p) => p.id === id);
  planToDelete.value = target || { id, name: 'Plan seleccionado' };
  isDeleteModalOpen.value = true;
};

const confirmArchivePlan = async () => {
  if (!planToDelete.value) return;
  deleteLoading.value = true;
  await archivePlan(planToDelete.value.id);
  deleteLoading.value = false;
  isDeleteModalOpen.value = false;
  planToDelete.value = null;
};
</script>

<style scoped></style>
