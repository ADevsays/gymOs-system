<template>
  <!-- Cédula (protagonista) -->
  <div class="reg-card">
    <label class="reg-section-label">Número de Cédula *</label>
    <input
      v-model="form.cedula"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      class="w-full bg-transparent text-4xl font-display font-bold tracking-widest text-text placeholder-border/40 outline-none border-b-2 border-border focus:border-accent transition-colors duration-200 pb-2 mt-2"
      placeholder="0 000 000 000"
    />
  </div>

  <!-- Datos Personales -->
  <div class="reg-card mt-4">
    <h3 class="reg-section-label">Datos Personales</h3>
    <div class="grid grid-cols-2 gap-4 mt-4">

      <AppInput
        v-model="form.firstName"
        label="Nombres"
        required
        placeholder="Juan David"
        :input-class="ocrFields.firstName ? 'border-warning/50 bg-warning/5' : ''"
        :hint="lowConfidence.firstName ? 'Baja precisión — verifica el nombre' : undefined"
      >
        <template #suffix v-if="ocrFields.firstName">
          <span class="text-[9px] font-bold uppercase tracking-widest bg-warning/20 text-warning border border-warning/30 px-1.5 py-0.5 rounded">Escáner</span>
        </template>
      </AppInput>

      <AppInput
        v-model="form.lastName"
        label="Apellidos"
        required
        placeholder="Pérez García"
        :input-class="ocrFields.lastName ? 'border-warning/50 bg-warning/5' : ''"
        :hint="lowConfidence.lastName ? 'Baja precisión — verifica el apellido' : undefined"
      >
        <template #suffix v-if="ocrFields.lastName">
          <span class="text-[9px] font-bold uppercase tracking-widest bg-warning/20 text-warning border border-warning/30 px-1.5 py-0.5 rounded">Escáner</span>
        </template>
      </AppInput>

      <AppInput
        v-model="form.birthDate"
        type="date"
        label="Fecha de Nacimiento"
        :input-class="ocrFields.birthDate ? 'border-warning/50 bg-warning/5' : ''"
        :hint="lowConfidence.birthDate ? 'Baja precisión — verifica la fecha' : undefined"
      />

      <div class="field-group">
        <label class="field-label">Género</label>
        <div class="flex gap-2 mt-1.5">
          <button
            @click="form.gender = 'M'"
            :class="['select-chip flex-1', form.gender === 'M' ? 'active' : '']"
          >Masc.</button>
          <button
            @click="form.gender = 'F'"
            :class="['select-chip flex-1', form.gender === 'F' ? 'active' : '']"
          >Fem.</button>
        </div>
      </div>

      <AppInput
        v-model="form.phone"
        label="Teléfono / Celular"
        placeholder="3001234567"
        prefix-text="+57"
        mono
        hint="10 dígitos para contacto y WhatsApp"
      />

      <div class="field-group col-span-2" :class="{ 'ocr-filled': ocrFields.bloodType }">
        <label class="field-label">Tipo de Sangre (Opcional)</label>
        <div class="flex gap-2 mt-1.5">
          <button
            v-for="bt in bloodTypes"
            :key="bt"
            @click="form.bloodType = form.bloodType === bt ? '' : bt"
            :class="['blood-chip flex-1', form.bloodType === bt ? 'active' : '']"
          >{{ bt }}</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Observaciones / Notas Médicas -->
  <div class="reg-card mt-4">
    <h3 class="reg-section-label">Observaciones <span class="text-muted/60 font-normal lowercase">(opcional)</span></h3>
    <div class="field-group mt-4 mb-2">
      <label class="field-label mb-1">Notas médicas o información adicional</label>
      <textarea
        v-model="form.notes"
        class="field-input min-h-[80px] resize-y mb-2"
        placeholder="Ej: EPS, migraña, alergias, condiciones médicas, emergencias, información relevante..."
        rows="3"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRegisterForm } from '../composables/useRegisterForm';
import { useOcrScanner } from '../composables/useOcrScanner';

const { form } = useRegisterForm();
const { ocrFields, lowConfidence } = useOcrScanner();

const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
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
  @apply flex flex-col gap-1 transition-all duration-200;
}

.field-group.ocr-filled .field-input {
  @apply border-warning/50 bg-warning/5;
  animation: fill-flash 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fill-flash {
  0% { opacity: 0; transform: translateY(-4px); }
  100% { opacity: 1; transform: translateY(0); }
}

.field-label {
  @apply text-xs font-medium text-muted uppercase tracking-wide;
}

.field-input {
  @apply w-full bg-surface-2 border border-border text-text px-3 py-2.5 rounded-sm
         outline-none focus:border-accent transition-colors duration-150 text-sm
         placeholder-muted/40;
}

.ocr-badge {
  @apply absolute right-2 top-1/2 -translate-y-1/2
         text-[9px] font-bold uppercase tracking-widest
         bg-warning/20 text-warning border border-warning/30
         px-1.5 py-0.5 rounded pointer-events-none;
}

.confidence-warn {
  @apply text-xs text-warning mt-0.5;
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
</style>
