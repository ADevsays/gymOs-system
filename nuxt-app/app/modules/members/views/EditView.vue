<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-start justify-between mb-6 flex-shrink-0">
      <div>
        <NuxtLink :to="`/members?id=${memberId}`" class="text-accent hover:underline text-xs md:text-sm font-medium mb-1.5 inline-flex items-center gap-1 transition-colors">
          &larr; Volver al perfil
        </NuxtLink>
        <h1 class="font-display font-bold text-2xl tracking-wide uppercase text-text leading-none">Editar Miembro</h1>
      </div>
      <div v-if="saving" class="flex items-center gap-2 text-muted text-sm pt-1">
        <Loader2 class="w-4 h-4 animate-spin" />
        Guardando...
      </div>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <Loader2 class="w-8 h-8 animate-spin text-accent" />
    </div>
    
    <div v-else-if="member" class="flex gap-5 flex-1 min-h-0">
      
      <!-- Panel Lateral (Foto de Perfil) -->
      <ProfilePhotoScanner 
        :memberId="memberId" 
        :memberName="`${member.firstName} ${member.lastName}`"
        :currentPhoto="member.photoPath"
        @photo-updated="(url) => member.photoPath = url"
      />

      <!-- Formulario Principal -->
      <div class="flex-1 overflow-y-auto pr-1 space-y-4">
        
        <div class="reg-card">
          <div class="flex items-center justify-between">
            <label class="reg-section-label">
              {{ isPendingCedula ? 'Número de Cédula (Pendiente — Edición Única)' : 'Número de Cédula (No editable)' }}
            </label>
            <span v-if="isPendingCedula" class="text-[10px] uppercase font-bold text-warning bg-warning/15 border border-warning/30 px-2 py-0.5 rounded">
              Cédula Pendiente
            </span>
          </div>
          <input
            v-if="!isPendingCedula"
            :value="member.cedula"
            type="text"
            disabled
            class="w-full bg-transparent text-2xl font-display font-bold tracking-widest text-muted outline-none border-b-2 border-border pb-2 mt-2 cursor-not-allowed"
          />
          <div v-else class="mt-2">
            <input
              v-model="editableCedula"
              type="text"
              inputmode="numeric"
              placeholder="Ingresa la cédula real (6 a 10 dígitos)"
              class="w-full bg-transparent text-2xl font-display font-bold tracking-widest text-text outline-none border-b-2 border-warning focus:border-accent pb-2"
            />
            <p class="text-[11px] text-muted mt-1.5">Una vez asignada la cédula definitiva, el registro quedará inmutable.</p>
          </div>
        </div>

        <div class="reg-card">
          <h3 class="reg-section-label">Datos Personales</h3>
          <div class="grid grid-cols-2 gap-4 mt-4">

            <AppInput
              v-model="member.firstName"
              label="Nombres"
              required
              placeholder="Juan David"
            />

            <AppInput
              v-model="member.lastName"
              label="Apellidos"
              required
              placeholder="Pérez García"
            />

            <AppInput
              v-model="member.birthDate"
              type="date"
              label="Fecha de Nacimiento"
            />

            <div class="field-group">
              <label class="field-label">Género</label>
              <div class="flex gap-2 mt-1.5">
                <button
                  @click="member.gender = 'M'"
                  :class="['select-chip flex-1', member.gender === 'M' ? 'active' : '']"
                >Masc.</button>
                <button
                  @click="member.gender = 'F'"
                  :class="['select-chip flex-1', member.gender === 'F' ? 'active' : '']"
                >Fem.</button>
              </div>
            </div>

            <AppInput
              v-model="member.phone"
              label="Teléfono / Celular"
              placeholder="3001234567"
              prefix-text="+57"
              mono
              hint="10 dígitos para contacto y WhatsApp"
              class="col-span-2"
            />

            <div class="field-group col-span-2">
              <label class="field-label">Tipo de Sangre</label>
              <div class="flex gap-2 mt-1.5">
                <button
                  v-for="bt in bloodTypes"
                  :key="bt"
                  @click="member.bloodType = member.bloodType === bt ? '' : bt"
                  :class="['blood-chip flex-1', member.bloodType === bt ? 'active' : '']"
                >{{ bt }}</button>
              </div>
            </div>
            
          </div>
        </div>

        <!-- Observaciones -->
        <div class="reg-card">
          <h3 class="reg-section-label mb-3">Observaciones</h3>
          <AppInput
            v-model="member.notes"
            type="textarea"
            :rows="3"
            label="Notas médicas o información adicional"
            placeholder="Ej: EPS, migraña, alergias, condiciones médicas, emergencias, información relevante..."
          />
        </div>

        <!-- Botón Final -->
        <button
          @click="submit"
          :disabled="!isFormValid || saving"
          class="submit-btn w-full mt-4"
          :class="isFormValid ? 'ready' : ''"
        >
          <template v-if="!saving">
            <Save class="w-5 h-5" />
            Guardar Cambios
          </template>
          <template v-else>
            <Loader2 class="w-5 h-5 animate-spin" />
            Guardando...
          </template>
        </button>

        <div class="h-6"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Loader2, Save } from 'lucide-vue-next';
import ProfilePhotoScanner from '../components/ProfilePhotoScanner.vue';

const route = useRoute();
const router = useRouter();
const memberId = parseInt(route.query.id as string, 10);

const loading = ref(true);
const saving = ref(false);
const member = ref<any>(null);
const editableCedula = ref('');

const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const isPendingCedula = computed(() => {
  return typeof member.value?.cedula === 'string' && member.value.cedula.startsWith('PENDIENTE');
});

const isFormValid = computed(() => {
  if (!member.value || !member.value.firstName || !member.value.lastName) return false;
  if (isPendingCedula.value && editableCedula.value.trim()) {
    const digits = editableCedula.value.replace(/\D/g, '');
    if (digits.length < 6 || digits.length > 10) return false;
  }
  return true;
});

onMounted(async () => {
  if (!memberId) {
    router.push('/members');
    return;
  }
  
  try {
    const res = await $fetch<any>(`/api/members/${memberId}`);
    if (res.data) {
      member.value = res.data;
    } else {
      router.push('/members');
    }
  } catch (e) {
    console.error(e);
    router.push('/members');
  } finally {
    loading.value = false;
  }
});

async function submit() {
  if (!isFormValid.value || saving.value) return;
  saving.value = true;
  
  try {
    const bodyPayload: any = {
      firstName: member.value.firstName,
      lastName: member.value.lastName,
      birthDate: member.value.birthDate,
      gender: member.value.gender,
      bloodType: member.value.bloodType,
      phone: member.value.phone ? String(member.value.phone).replace(/\D/g, '') : null,
      notes: member.value.notes
    };

    if (isPendingCedula.value && editableCedula.value.trim()) {
      bodyPayload.cedula = editableCedula.value.trim().replace(/\D/g, '');
    }

    const res = await $fetch<any>(`/api/members/${memberId}`, {
      method: 'PUT',
      body: bodyPayload
    });

    if (res.success) {
      router.push(`/members?id=${memberId}`);
    } else {
      alert(`Error al guardar: ${res.error}`);
    }
  } catch (e: any) {
    alert(`Error: ${e.message}`);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
@reference "~/assets/css/main.css";

.reg-card {
  @apply bg-surface border border-border rounded p-6;
}
.reg-section-label {
  @apply text-xs font-bold uppercase tracking-widest text-muted;
}
.field-group {
  @apply flex flex-col gap-1;
}
.field-label {
  @apply text-xs font-medium text-muted uppercase tracking-wide;
}
.field-input {
  @apply w-full bg-surface-2 border border-border text-text px-3 py-2.5 rounded-sm
         outline-none focus:border-accent transition-colors duration-150 text-sm;
}
.select-chip {
  @apply px-4 py-2 rounded-sm text-sm font-medium border border-border
         text-muted bg-surface-2 cursor-pointer transition-all duration-150
         hover:border-accent hover:text-text;
}
.select-chip.active {
  @apply border-accent bg-accent text-white;
}
.blood-chip {
  @apply py-2 rounded-sm text-sm font-bold border border-border
         text-muted bg-surface-2 cursor-pointer transition-all duration-150
         hover:border-accent/50 hover:text-text text-center;
}
.blood-chip.active {
  @apply border-accent bg-accent text-white;
}

.submit-btn {
  @apply flex items-center justify-center gap-2 py-4 rounded
         font-bold text-base uppercase tracking-wider transition-all duration-200
         bg-surface-2 text-muted border border-border cursor-not-allowed;
}

.submit-btn.ready {
  @apply bg-accent text-white border-accent cursor-pointer
         hover:bg-accent-soft active:scale-[0.99];
}
</style>
