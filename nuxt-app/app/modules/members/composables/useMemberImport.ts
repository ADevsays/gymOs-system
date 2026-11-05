import { ref } from 'vue';

export interface ImportPreviewData {
  totalRawRows: number;
  emptyRowsCount: number;
  readyToImportCount: number;
  duplicateInFileCount: number;
  alreadyInDbCount: number;
  pendingCedulasCount: number;
  newPlanTypes: string[];
  newStatuses: string[];
  warningsCount: number;
  sampleRows: any[];
  reportRows: Array<{
    rowRef: string;
    fullName: string;
    cedula: string;
    status: 'ready' | 'duplicate_in_file' | 'already_in_db';
    warnings: string[];
  }>;
}

export interface ImportResultData {
  success: boolean;
  importedCount: number;
  skippedEmptyCount: number;
  skippedDuplicateFileCount: number;
  skippedAlreadyInDbCount: number;
  pendingCedulasCount: number;
  newPlansCreated: string[];
  report: Array<{
    rowRef: string;
    fullName: string;
    cedula: string;
    action: 'imported' | 'skipped_duplicate_file' | 'skipped_already_in_db' | 'skipped_empty';
    warnings: string[];
  }>;
}

export function useMemberImport() {
  const step = ref<'upload' | 'preview' | 'result'>('upload');
  const fileName = ref<string>('');
  const csvContent = ref<string>('');
  const loading = ref(false);
  const error = ref<string | null>(null);

  const previewData = ref<ImportPreviewData | null>(null);
  const resultData = ref<ImportResultData | null>(null);

  const loadCsvFile = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      error.value = 'Por favor selecciona un archivo con extensión .csv';
      return;
    }

    fileName.value = file.name;
    loading.value = true;
    error.value = null;

    try {
      const text = await file.text();
      csvContent.value = text;

      const res = await $fetch<{ success: boolean; data?: ImportPreviewData; error?: string }>('/api/members/import', {
        method: 'POST',
        body: { action: 'preview', csvContent: text }
      });

      if (res?.success && res.data) {
        previewData.value = res.data;
        step.value = 'preview';
      } else {
        error.value = res?.error || 'Error al analizar el archivo CSV';
      }
    } catch (err: any) {
      error.value = err?.data?.error || err.message || 'Error al leer el archivo';
    } finally {
      loading.value = false;
    }
  };

  const confirmImport = async () => {
    if (!csvContent.value) return;
    loading.value = true;
    error.value = null;

    try {
      const res = await $fetch<{ success: boolean; data?: ImportResultData; error?: string }>('/api/members/import', {
        method: 'POST',
        body: { action: 'execute', csvContent: csvContent.value }
      });

      if (res?.success && res.data) {
        resultData.value = res.data;
        step.value = 'result';
      } else {
        error.value = res?.error || 'Error al ejecutar la importación';
      }
    } catch (err: any) {
      error.value = err?.data?.error || err.message || 'Error al ejecutar la importación';
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    step.value = 'upload';
    fileName.value = '';
    csvContent.value = '';
    loading.value = false;
    error.value = null;
    previewData.value = null;
    resultData.value = null;
  };

  return {
    step,
    fileName,
    csvContent,
    loading,
    error,
    previewData,
    resultData,
    loadCsvFile,
    confirmImport,
    reset
  };
}
