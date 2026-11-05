<template>
  <AppModal
    :is-open="isOpen"
    title="Gestión de Categorías"
    subtitle="Administra las categorías dinámicas del inventario."
    :icon="Tags"
    max-width="max-w-lg"
    @close="handleClose"
    @dismiss="handleDismiss"
  >
    <div class="flex flex-col gap-4">

      <!-- Alert or error message -->
      <div v-if="actionError" class="p-3 bg-danger/15 border border-danger/30 rounded-xl text-xs text-danger font-medium flex items-center justify-between animate-reveal">
        <span>{{ actionError }}</span>
        <button @click="actionError = null" class="text-danger hover:opacity-75 cursor-pointer ml-2">
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- New Category Form -->
      <form @submit.prevent="handleCreate" class="flex items-end gap-2 bg-surface-2/40 border border-border/60 p-3 rounded-xl">
        <div class="flex-1 min-w-0">
          <AppInput
            v-model="newCategoryName"
            label="Nueva Categoría"
            placeholder="Ej: Ropa Deportiva, Bebidas Isotónicas..."
            :required="true"
          />
        </div>
        <button
          type="submit"
          :disabled="!newCategoryName.trim() || submitting"
          class="bg-accent text-white border border-accent hover:bg-accent-soft disabled:opacity-50 h-10.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <span v-if="submitting" class="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>
          <Plus v-else class="w-3.5 h-3.5" />
          <span>Agregar</span>
        </button>
      </form>

      <!-- Categories List -->
      <div class="flex flex-col gap-1.5 overflow-y-auto flex-1 pr-1 min-h-45">
        <div v-if="loading" class="py-12 flex items-center justify-center">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent"></div>
        </div>

        <div v-else-if="categories.length === 0" class="py-12 text-center text-muted text-xs">
          No hay categorías registradas.
        </div>

        <div 
          v-else
          v-for="cat in categories" 
          :key="cat.id"
          class="p-3 rounded-xl bg-surface-2 border border-border/80 flex items-center justify-between gap-3 group hover:border-accent/40 transition-colors"
        >
          <!-- Editing Mode -->
          <template v-if="editingId === cat.id">
            <div class="flex-1 min-w-0 flex items-center gap-2">
              <AppInput
                v-model="editingName"
                input-class="py-1.5 px-3 rounded-lg text-xs lg:text-sm bg-surface border-accent"
                @keydown.enter.prevent="saveEdit(cat.id)"
                @keydown.esc="cancelEdit"
              />
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                @click="saveEdit(cat.id)"
                :disabled="!editingName.trim() || savingEdit"
                class="p-1.5 rounded-lg bg-accent text-white hover:bg-accent-soft cursor-pointer transition-colors"
                title="Guardar cambios"
              >
                <Check class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                @click="cancelEdit"
                class="p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-text cursor-pointer transition-colors"
                title="Cancelar"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </template>

          <!-- Normal Display Mode -->
          <template v-else>
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-2 h-2 rounded-full bg-accent/80 shrink-0"></div>
              <span class="text-xs lg:text-sm font-semibold text-text truncate">{{ cat.name }}</span>
              <span class="text-[10px] text-muted font-mono bg-surface px-2 py-0.5 rounded-md border border-border shrink-0">
                {{ cat.productCount || 0 }} {{ (cat.productCount || 0) === 1 ? 'producto' : 'productos' }}
              </span>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                @click="startEdit(cat)"
                class="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border cursor-pointer transition-colors"
                title="Editar nombre"
              >
                <Pencil class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                @click="handleDelete(cat)"
                :disabled="deletingId === cat.id"
                class="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-surface border border-transparent hover:border-border cursor-pointer transition-colors disabled:opacity-40"
                :title="(cat.productCount || 0) > 0 ? 'Tiene productos asociados' : 'Eliminar categoría'"
              >
                <span v-if="deletingId === cat.id" class="animate-spin block h-3.5 w-3.5 border-2 border-danger border-t-transparent rounded-full"></span>
                <Trash2 v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex justify-end pt-2 border-t border-border/40">
        <button
          type="button"
          @click="$emit('close')"
          class="py-2 px-5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  </AppModal>

  <!-- Delete Category Confirmation Modal -->
  <AppConfirmDeleteModal
    :is-open="isDeleteModalOpen"
    title="Eliminar Categoría"
    subtitle="La categoría será removida permanentemente del sistema."
    :item-title="categoryToDelete?.name"
    description="Esta categoría no tiene productos asignados y puede eliminarse con total seguridad."
    confirm-text="Sí, Eliminar"
    @close="isDeleteModalOpen = false"
    @confirm="confirmDeleteCategory"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Tags, Plus, X, Pencil, Check, Trash2 } from 'lucide-vue-next';
import type { CategoryItem } from '../types';
import AppModal from '~/ui/components/AppModal.vue';
import AppConfirmDeleteModal from '~/ui/components/AppConfirmDeleteModal.vue';

const props = defineProps<{
  isOpen: boolean;
  categories: CategoryItem[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'create', name: string): void;
  (e: 'update', payload: { id: number; name: string }): void;
  (e: 'delete', id: number): void;
}>();

const newCategoryName = ref('');
const submitting = ref(false);
const actionError = ref<string | null>(null);

const editingId = ref<number | null>(null);
const editingName = ref('');
const savingEdit = ref(false);
const deletingId = ref<number | null>(null);

// Delete state
const isDeleteModalOpen = ref(false);
const categoryToDelete = ref<CategoryItem | null>(null);

// Backdrop close: retain draft
const handleClose = () => {
  emit('close');
};

// Explicit dismiss: reset and close
const handleDismiss = () => {
  newCategoryName.value = '';
  editingId.value = null;
  editingName.value = '';
  actionError.value = null;
  emit('close');
};

const handleCreate = async () => {
  if (!newCategoryName.value.trim()) return;
  actionError.value = null;
  submitting.value = true;
  try {
    emit('create', newCategoryName.value.trim());
    newCategoryName.value = '';
  } catch (err: any) {
    actionError.value = err.message || 'Error al crear categoría';
  } finally {
    submitting.value = false;
  }
};

const startEdit = (cat: CategoryItem) => {
  editingId.value = cat.id;
  editingName.value = cat.name;
};

const cancelEdit = () => {
  editingId.value = null;
  editingName.value = '';
};

const saveEdit = (id: number) => {
  if (!editingName.value.trim()) return;
  actionError.value = null;
  emit('update', { id, name: editingName.value.trim() });
  cancelEdit();
};

const handleDelete = (cat: CategoryItem) => {
  actionError.value = null;
  if ((cat.productCount || 0) > 0) {
    actionError.value = `No puedes eliminar "${cat.name}" porque tiene ${cat.productCount} producto(s) asignado(s).`;
    return;
  }
  categoryToDelete.value = cat;
  isDeleteModalOpen.value = true;
};

const confirmDeleteCategory = () => {
  if (categoryToDelete.value) {
    emit('delete', categoryToDelete.value.id);
    isDeleteModalOpen.value = false;
    categoryToDelete.value = null;
  }
};
</script>
