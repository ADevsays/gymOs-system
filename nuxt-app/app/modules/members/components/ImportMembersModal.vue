<template>
  <AppModal
    :is-open="isOpen"
    title="Importar Miembros"
    subtitle="Carga masiva y normalización de socios desde hojas de cálculo CSV."
    :icon="FileSpreadsheet"
    max-width="max-w-5xl"
    @close="handleClose"
    @dismiss="handleDismiss"
  >
    <div class="flex flex-col gap-4">
      <!-- Error Banner -->
      <div v-if="error" class="p-3.5 bg-danger/10 border border-danger/30 text-danger rounded-xl text-xs lg:text-sm flex items-center justify-between">
        <div class="flex items-center gap-2">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ error }}</span>
        </div>
        <button type="button" @click="error = null" class="font-bold underline text-xs cursor-pointer ml-2">Descartar</button>
      </div>

      <!-- ================= STEP 1: UPLOAD ================= -->
      <div v-if="step === 'upload'" class="flex flex-col gap-4">
        <!-- Drag & Drop Zone -->
        <div
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDropFile"
          @click="triggerFileInput"
          :class="[
            'border-2 border-dashed rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200',
            isDragging
              ? 'border-accent bg-accent/5 scale-[0.99]'
              : 'border-border hover:border-accent/60 bg-surface-2/40 hover:bg-surface-2'
          ]"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            class="hidden"
            @change="onFileChange"
          />

          <div class="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-accent">
            <UploadCloud class="w-8 h-8" />
          </div>
          <h3 class="font-display font-bold text-lg uppercase tracking-wider text-text mb-1">
            Arrastra tu archivo CSV aquí
          </h3>
          <p class="text-muted text-xs lg:text-sm max-w-sm mb-4">
            Soporta archivos separados por comas (,) o punto y coma (;). El sistema normalizará automáticamente los datos.
          </p>
          <button
            type="button"
            class="py-2.5 px-5 rounded-xl bg-surface-2 border border-border text-text hover:border-accent text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <FileText class="w-3.5 h-3.5 text-accent" />
            <span>Examinar archivos</span>
          </button>
        </div>

        <!-- Structure Spec Guide -->
        <div class="p-4 bg-surface-2 border border-border rounded-xl">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
            <HelpCircle class="w-3.5 h-3.5 text-accent" />
            <span>Columnas esperadas en la hoja (en orden):</span>
          </h4>
          <ol class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 text-xs text-muted list-decimal list-inside font-mono">
            <li><strong class="text-text font-body">ID Fila</strong> (ej: AG001)</li>
            <li><strong class="text-text font-body">Nombre Completo</strong></li>
            <li><strong class="text-text font-body">Cédula</strong> (6-10 dígitos)</li>
            <li><strong class="text-text font-body">Teléfono</strong> (10 dígitos)</li>
            <li><strong class="text-text font-body">Fecha Inscripción</strong></li>
            <li><strong class="text-text font-body">Fecha Último Pago</strong></li>
            <li><strong class="text-text font-body">Fecha Vencimiento</strong></li>
            <li><strong class="text-text font-body">Tipo de Plan</strong></li>
            <li><strong class="text-text font-body">Valor</strong></li>
            <li><strong class="text-text font-body">Estado</strong> (Activo / Vencido)</li>
            <li><strong class="text-text font-body">Tipo de Sangre</strong> (opc.)</li>
            <li><strong class="text-text font-body">EPS</strong> (opc.)</li>
            <li><strong class="text-text font-body">Fecha Nacimiento</strong> (opc.)</li>
          </ol>
        </div>
      </div>

      <!-- ================= STEP 2: PREVIEW ================= -->
      <div v-else-if="step === 'preview' && previewData" class="flex flex-col gap-4 animate-reveal">
        <!-- Top Metrics Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="bg-surface-2 border border-border rounded-xl p-3.5 flex flex-col justify-center">
            <span class="text-[11px] uppercase font-bold text-muted tracking-wider block truncate">Total Filas</span>
            <span class="font-display font-bold text-2xl lg:text-3xl text-text leading-none mt-1">{{ previewData.totalRawRows }}</span>
            <span class="text-xs text-muted/70 mt-1 font-body">{{ previewData.emptyRowsCount }} vacías omitidas</span>
          </div>

          <div class="bg-surface-2 border border-border rounded-xl p-3.5 flex flex-col justify-center">
            <span class="text-[11px] uppercase font-bold text-success tracking-wider block truncate">Listos Para Crear</span>
            <span class="font-display font-bold text-2xl lg:text-3xl text-success leading-none mt-1">{{ previewData.readyToImportCount }}</span>
            <span class="text-xs text-muted/70 mt-1 font-body">Socios válidos</span>
          </div>

          <div class="bg-surface-2 border border-border rounded-xl p-3.5 flex flex-col justify-center">
            <span class="text-[11px] uppercase font-bold text-warning tracking-wider block truncate">Cédula Pendiente</span>
            <span class="font-display font-bold text-2xl lg:text-3xl text-warning leading-none mt-1">{{ previewData.pendingCedulasCount }}</span>
            <span class="text-xs text-muted/70 mt-1 font-body">ID temporal generado</span>
          </div>

          <div class="bg-surface-2 border border-border rounded-xl p-3.5 flex flex-col justify-center">
            <span class="text-[11px] uppercase font-bold text-danger tracking-wider block truncate">Omitidos / Duplicados</span>
            <span class="font-display font-bold text-2xl lg:text-3xl text-danger leading-none mt-1">
              {{ previewData.duplicateInFileCount + previewData.alreadyInDbCount }}
            </span>
            <span class="text-xs text-muted/70 mt-1 font-body">Revisión manual</span>
          </div>
        </div>

        <!-- Plan / Catalog Alert -->
        <div v-if="previewData.newPlanTypes.length > 0" class="p-3.5 bg-accent/10 border border-accent/30 rounded-xl text-xs lg:text-sm flex items-center gap-2.5">
          <Info class="w-4 h-4 text-accent shrink-0" />
          <p class="text-text font-body leading-relaxed">
            Se detectaron <strong class="text-accent">{{ previewData.newPlanTypes.length }}</strong> tipos de plan nuevos que se crearán automáticamente:
            <span class="font-mono font-semibold text-accent ml-1">{{ previewData.newPlanTypes.join(', ') }}</span>.
          </p>
        </div>

        <!-- Filter Tabs for Preview List -->
        <div class="flex items-center justify-between border-b border-border/50 pb-2.5">
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="previewFilter = 'all'"
              :class="[
                'px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer',
                previewFilter === 'all' ? 'bg-accent text-white' : 'text-muted hover:text-text bg-surface-2'
              ]"
            >
              Todos ({{ previewData.reportRows.length }})
            </button>
            <button
              type="button"
              @click="previewFilter = 'ready'"
              :class="[
                'px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer',
                previewFilter === 'ready' ? 'bg-success text-white' : 'text-muted hover:text-text bg-surface-2'
              ]"
            >
              Listos ({{ previewData.readyToImportCount }})
            </button>
            <button
              type="button"
              @click="previewFilter = 'warnings'"
              :class="[
                'px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer',
                previewFilter === 'warnings' ? 'bg-warning text-black' : 'text-muted hover:text-text bg-surface-2'
              ]"
            >
              Con Advertencias
            </button>
            <button
              type="button"
              @click="previewFilter = 'skipped'"
              :class="[
                'px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer',
                previewFilter === 'skipped' ? 'bg-danger text-white' : 'text-muted hover:text-text bg-surface-2'
              ]"
            >
              Omitidos ({{ previewData.duplicateInFileCount + previewData.alreadyInDbCount }})
            </button>
          </div>
          <span class="text-xs text-muted font-mono truncate max-w-xs">{{ fileName }}</span>
        </div>

        <!-- Preview Rows Table -->
        <div class="border border-border rounded-xl overflow-hidden max-h-80 overflow-y-auto bg-surface">
          <table class="w-full text-left font-body">
            <thead class="bg-surface-2 text-muted uppercase tracking-wider text-xs font-bold sticky top-0 z-10 border-b border-border">
              <tr>
                <th class="py-3 px-3.5">Fila</th>
                <th class="py-3 px-3.5">Nombre</th>
                <th class="py-3 px-3.5">Cédula</th>
                <th class="py-3 px-3.5">Estado</th>
                <th class="py-3 px-3.5">Observaciones / Alertas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/40 text-xs lg:text-sm">
              <tr v-for="r in filteredReportRows" :key="r.rowRef" class="hover:bg-surface-2/50 transition-colors">
                <td class="py-2.5 px-3.5 font-mono font-semibold text-muted">{{ r.rowRef }}</td>
                <td class="py-2.5 px-3.5 font-medium text-text">{{ r.fullName || '—' }}</td>
                <td class="py-2.5 px-3.5 font-mono">
                  <span :class="r.cedula.startsWith('PENDIENTE') ? 'text-warning font-semibold' : 'text-text'">
                    {{ r.cedula }}
                  </span>
                </td>
                <td class="py-2.5 px-3.5 whitespace-nowrap">
                  <span
                    v-if="r.status === 'ready'"
                    class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-success/15 text-success border border-success/30 inline-block"
                  >
                    Listo
                  </span>
                  <span
                    v-else-if="r.status === 'duplicate_in_file'"
                    class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-danger/15 text-danger border border-danger/30 inline-block"
                  >
                    Cédula Repetida
                  </span>
                  <span
                    v-else-if="r.status === 'already_in_db'"
                    class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-danger/15 text-danger border border-danger/30 inline-block"
                  >
                    Ya en Sistema
                  </span>
                </td>
                <td class="py-2.5 px-3.5 text-muted text-xs lg:text-sm">
                  <ul v-if="r.warnings.length > 0" class="space-y-0.5">
                    <li v-for="(w, idx) in r.warnings" :key="idx" class="flex items-center gap-1.5 text-warning font-medium">
                      <span>•</span>
                      <span>{{ w }}</span>
                    </li>
                  </ul>
                  <span v-else class="text-muted/50">Sin observaciones</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ================= STEP 3: RESULT ================= -->
      <div v-else-if="step === 'result' && resultData" class="flex flex-col gap-4 animate-reveal">
        <!-- Success Banner -->
        <div class="p-4 bg-success/10 border border-success/30 rounded-xl flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-success/20 text-success flex items-center justify-center shrink-0">
              <CheckCircle class="w-6 h-6" />
            </div>
            <div>
              <h3 class="font-display font-bold text-base uppercase tracking-wide text-success">
                ¡Importación Completada Exitosamente!
              </h3>
              <p class="text-xs text-muted mt-0.5">
                Se han guardado {{ resultData.importedCount }} socios y sus registros históricos correspondientes.
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="downloadReportTxt"
            class="py-2 px-3.5 rounded-xl border border-border bg-surface text-text hover:border-accent text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Download class="w-3.5 h-3.5 text-accent" />
            <span>Descargar Reporte</span>
          </button>
        </div>

        <!-- Result Metrics Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-surface-2 border border-border rounded-xl p-3 flex flex-col justify-center">
            <span class="text-[10px] uppercase font-bold text-muted">Importados</span>
            <span class="font-display font-bold text-2xl text-success mt-0.5">{{ resultData.importedCount }}</span>
          </div>
          <div class="bg-surface-2 border border-border rounded-xl p-3 flex flex-col justify-center">
            <span class="text-[10px] uppercase font-bold text-muted">Cédula Pendiente</span>
            <span class="font-display font-bold text-2xl text-warning mt-0.5">{{ resultData.pendingCedulasCount }}</span>
          </div>
          <div class="bg-surface-2 border border-border rounded-xl p-3 flex flex-col justify-center">
            <span class="text-[10px] uppercase font-bold text-muted">Omitidos Duplicados</span>
            <span class="font-display font-bold text-2xl text-danger mt-0.5">{{ resultData.skippedDuplicateFileCount + resultData.skippedAlreadyInDbCount }}</span>
          </div>
          <div class="bg-surface-2 border border-border rounded-xl p-3.5 flex flex-col justify-center">
            <span class="text-[11px] uppercase font-bold text-muted tracking-wider block truncate">Planes Creados</span>
            <span class="font-display font-bold text-2xl lg:text-3xl text-text leading-none mt-1">{{ resultData.newPlansCreated.length }}</span>
          </div>
        </div>

        <!-- Detailed Results Log -->
        <div class="border border-border rounded-xl overflow-hidden max-h-80 overflow-y-auto bg-surface">
          <table class="w-full text-left font-body">
            <thead class="bg-surface-2 text-muted uppercase tracking-wider text-xs font-bold sticky top-0 z-10 border-b border-border">
              <tr>
                <th class="py-3 px-3.5">Fila</th>
                <th class="py-3 px-3.5">Nombre</th>
                <th class="py-3 px-3.5">Cédula</th>
                <th class="py-3 px-3.5">Resultado</th>
                <th class="py-3 px-3.5">Detalle</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/40 text-xs lg:text-sm">
              <tr v-for="item in resultData.report" :key="item.rowRef" class="hover:bg-surface-2/50 transition-colors">
                <td class="py-2.5 px-3.5 font-mono font-semibold text-muted">{{ item.rowRef }}</td>
                <td class="py-2.5 px-3.5 font-medium text-text">{{ item.fullName }}</td>
                <td class="py-2.5 px-3.5 font-mono text-text">{{ item.cedula }}</td>
                <td class="py-2.5 px-3.5 whitespace-nowrap">
                  <span
                    v-if="item.action === 'imported'"
                    class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-success/15 text-success border border-success/30 inline-block"
                  >
                    Guardado
                  </span>
                  <span
                    v-else
                    class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-danger/15 text-danger border border-danger/30 inline-block"
                  >
                    Omitido
                  </span>
                </td>
                <td class="py-2.5 px-3.5 text-muted text-xs lg:text-sm">
                  <span v-if="item.warnings.length > 0" class="text-warning font-medium">
                    {{ item.warnings.join('; ') }}
                  </span>
                  <span v-else class="text-muted/50">Correcto</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ================= FOOTER ================= -->
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <!-- Left: Back or Reset -->
        <div>
          <button
            v-if="step === 'preview'"
            type="button"
            :disabled="loading"
            @click="reset"
            class="py-2 px-4 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cargar Otro Archivo
          </button>
        </div>

        <!-- Right: Actions -->
        <div class="flex items-center gap-3">
          <button
            type="button"
            :disabled="loading"
            @click="handleDismiss"
            class="py-2.5 px-4 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            {{ step === 'result' ? 'Cerrar' : 'Cancelar' }}
          </button>

          <button
            v-if="step === 'preview'"
            type="button"
            :disabled="loading || !previewData || previewData.readyToImportCount === 0"
            @click="confirmImport"
            class="py-2.5 px-5 rounded-xl bg-accent text-white border border-accent hover:bg-accent-soft active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            <span v-else>Confirmar e Importar ({{ previewData?.readyToImportCount }})</span>
          </button>

          <button
            v-else-if="step === 'result'"
            type="button"
            @click="handleFinish"
            class="py-2.5 px-5 rounded-xl bg-accent text-white border border-accent hover:bg-accent-soft active:scale-[0.99] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md"
          >
            <CheckCircle class="w-4 h-4" />
            <span>Ver Directorio</span>
          </button>
        </div>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  FileSpreadsheet,
  UploadCloud,
  FileText,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  Info
} from 'lucide-vue-next';
import AppModal from '~/ui/components/AppModal.vue';
import { useMemberImport } from '../composables/useMemberImport';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success'): void;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const previewFilter = ref<'all' | 'ready' | 'warnings' | 'skipped'>('all');

const {
  step,
  fileName,
  loading,
  error,
  previewData,
  resultData,
  loadCsvFile,
  confirmImport,
  reset
} = useMemberImport();

const triggerFileInput = () => {
  if (loading.value) return;
  fileInputRef.value?.click();
};

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    loadCsvFile(file);
  }
};

const onDropFile = (e: DragEvent) => {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    loadCsvFile(file);
  }
};

const filteredReportRows = computed(() => {
  if (!previewData.value) return [];
  const rows = previewData.value.reportRows;

  if (previewFilter.value === 'ready') {
    return rows.filter(r => r.status === 'ready');
  }
  if (previewFilter.value === 'skipped') {
    return rows.filter(r => r.status !== 'ready');
  }
  if (previewFilter.value === 'warnings') {
    return rows.filter(r => r.warnings.length > 0);
  }
  return rows;
});

const handleClose = () => {
  emit('close');
};

const handleDismiss = () => {
  reset();
  emit('close');
};

const handleFinish = () => {
  emit('success');
  reset();
  emit('close');
};

const downloadReportTxt = () => {
  if (!resultData.value) return;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const lines = [
    `REPORTE DE IMPORTACIÓN GYMOS - ${new Date().toLocaleString()}`,
    `============================================================`,
    `Total importados: ${resultData.value.importedCount}`,
    `Cédulas pendientes: ${resultData.value.pendingCedulasCount}`,
    `Omitidos por duplicado en archivo: ${resultData.value.skippedDuplicateFileCount}`,
    `Omitidos ya existentes en BD: ${resultData.value.skippedAlreadyInDbCount}`,
    `Filas vacías: ${resultData.value.skippedEmptyCount}`,
    `Planes creados: ${resultData.value.newPlansCreated.join(', ') || 'Ninguno'}`,
    `============================================================`,
    `DETALLE DE REGISTROS:`,
    ...resultData.value.report.map(r => 
      `[${r.rowRef}] ${r.fullName} | CC: ${r.cedula} | Acción: ${r.action} ${r.warnings.length ? `| Alertas: ${r.warnings.join(', ')}` : ''}`
    )
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-importacion-${timestamp}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>
