<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex justify-end">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closePanel"></div>
    <div class="relative w-full max-w-md bg-bg h-full flex flex-col border-l border-border shadow-2xl overflow-y-auto">
      <div class="p-4 md:p-5 border-b border-border flex items-center justify-between sticky top-0 bg-bg/95 backdrop-blur z-10">
        <h2 class="font-display text-xl md:text-2xl font-bold text-text">{{ editingPlan ? 'Editar Plan' : 'Nuevo Plan' }}</h2>
        <button @click="closePanel" class="text-muted hover:text-text cursor-pointer p-1.5 rounded-full hover:bg-surface-2 transition-colors">
          <XIcon class="w-5 h-5" />
        </button>
      </div>

      <form @submit.prevent="savePlan" class="p-4 md:p-5 flex flex-col gap-4 md:gap-5 flex-1">
        <!-- Datos Básicos -->
        <div class="bg-surface border border-border p-4 md:p-4.5 rounded-xl">
          <h3 class="text-xs font-bold uppercase tracking-widest text-muted mb-3">Información Principal</h3>
          
          <div class="flex flex-col gap-3.5">
            <AppInput
              v-model="form.name"
              required
              label="Nombre del Plan"
              placeholder="Ej. Plan Parejas"
            />
            
            <div class="grid grid-cols-2 gap-3">
              <AppInput
                v-model="form.price"
                type="number"
                min="0"
                required
                mono
                label="Precio ($)"
                placeholder="0"
              />
              <AppInput
                v-model="form.durationDays"
                type="number"
                min="1"
                required
                mono
                label="Duración (Días)"
                placeholder="30"
              />
            </div>

            <AppInput
              v-model="form.description"
              type="textarea"
              :rows="2"
              label="Descripción"
              placeholder="Detalles de lo que incluye el plan..."
            />
          </div>
        </div>

        <!-- Opciones de Membresía -->
        <div class="bg-surface border border-border p-4 md:p-4.5 rounded-xl">
          <h3 class="text-xs font-bold uppercase tracking-widest text-muted mb-3">Opciones de Membresía</h3>
          
          <div class="flex flex-col gap-3.5">
            <!-- Modalidad del Plan -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted uppercase tracking-wide">Modalidad</label>
              <div class="flex gap-2 mt-1">
                <button type="button" @click="form.isGroup = false; form.maxMembers = 1" :class="['flex-1 py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer transition-all', !form.isGroup ? 'border-accent bg-accent text-white' : 'border-border text-muted bg-surface-2 hover:border-accent/50 hover:text-text']">Individual (1 Persona)</button>
                <button type="button" @click="form.isGroup = true; if(form.maxMembers < 2) form.maxMembers = 2" :class="['flex-1 py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer transition-all', form.isGroup ? 'border-accent bg-accent text-white' : 'border-border text-muted bg-surface-2 hover:border-accent/50 hover:text-text']">Grupal / Compartido</button>
              </div>
            </div>

            <div v-if="form.isGroup" class="animate-reveal pl-3 border-l-2 border-accent ml-1 mt-1">
              <AppInput
                v-model="form.maxMembers"
                type="number"
                min="2"
                max="10"
                required
                mono
                label="Límite de Miembros"
                hint="Cuántas personas pueden usar este mismo plan."
                placeholder="Ej. 2 para parejas"
              />
            </div>

            <hr class="border-border/60 my-1" />

            <!-- Disponibilidad (Promoción) -->
            <div class="flex flex-col gap-1">
              <label class="flex items-center gap-3 cursor-pointer group p-3 border border-border rounded-lg bg-surface-2 hover:border-accent/50 transition-colors">
                <input type="checkbox" v-model="form.isPromo" class="w-4.5 h-4.5 accent-accent rounded border-border shrink-0" />
                <div class="flex flex-col">
                  <span class="text-xs sm:text-sm font-bold text-text group-hover:text-accent transition-colors">Promoción por Tiempo Limitado</span>
                  <span class="text-[11px] text-muted">Añade una fecha de vencimiento a la disponibilidad del plan.</span>
                </div>
              </label>
            </div>

            <div v-if="form.isPromo" class="animate-reveal pl-3 border-l-2 border-accent ml-1 mt-1">
              <AppInput
                v-model="form.validUntil"
                type="date"
                label="Válido Hasta (Opcional)"
              />
            </div>
            
            <div v-if="editingPlan" class="flex items-center gap-2 mt-1">
              <input type="checkbox" id="isActive" v-model="form.isActive" class="w-4 h-4 accent-accent" />
              <label for="isActive" class="text-xs font-medium text-text cursor-pointer">Plan Activo (Visible para ventas)</label>
            </div>
          </div>
        </div>

        <div class="mt-auto pt-4 flex gap-3 sticky bottom-0 bg-bg/95 backdrop-blur pb-4">
          <button type="button" @click="closePanel" class="flex-1 bg-surface-2 text-muted border border-border cursor-pointer hover:text-text hover:border-accent py-2.5 px-4 rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-200">
            Cancelar
          </button>
          <button type="submit" :disabled="saving" class="flex-1 bg-accent text-white border-accent cursor-pointer hover:bg-accent-soft active:scale-[0.99] py-2.5 px-4 rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-200 disabled:opacity-50 flex justify-center items-center">
            <span v-if="saving" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
            Guardar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { XIcon } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  editingPlan: any | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', payload: any): void;
}>();

const form = ref({
  name: '',
  price: '',
  durationDays: 30,
  description: '',
  isGroup: false,
  isPromo: false,
  maxMembers: 1,
  validUntil: '',
  isActive: true
});

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (props.editingPlan) {
      form.value = {
        name: props.editingPlan.name,
        price: props.editingPlan.price.toString(),
        durationDays: props.editingPlan.durationDays,
        description: props.editingPlan.description || '',
        isGroup: props.editingPlan.maxMembers > 1,
        isPromo: !!props.editingPlan.validUntil,
        maxMembers: props.editingPlan.maxMembers,
        validUntil: props.editingPlan.validUntil || '',
        isActive: props.editingPlan.isActive
      };
    } else {
      form.value = {
        name: '',
        price: '',
        durationDays: 30,
        description: '',
        isGroup: false,
        isPromo: false,
        maxMembers: 1,
        validUntil: '',
        isActive: true
      };
    }
  }
});

const closePanel = () => {
  emit('close');
};

const savePlan = () => {
  if (!form.value.isGroup) {
    form.value.maxMembers = 1;
  } else if (form.value.maxMembers < 2) {
    form.value.maxMembers = 2;
  }
  if (!form.value.isPromo) {
    form.value.validUntil = '';
  }

  const payload = {
    ...form.value,
    type: form.value.isGroup && form.value.isPromo ? 'promo-group' : (form.value.isPromo ? 'promo' : (form.value.isGroup ? 'group' : 'standard')),
    price: Number(form.value.price)
  };

  emit('save', payload);
};
</script>

<style scoped>
@reference "~/assets/css/main.css";

.animate-reveal {
  animation: reveal 0.2s ease-out;
}
@keyframes reveal {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
