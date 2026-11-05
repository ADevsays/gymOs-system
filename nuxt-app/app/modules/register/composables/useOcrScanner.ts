import { ref, onMounted, onUnmounted, computed, provide, inject, type Ref } from 'vue';

export const OcrScannerKey = Symbol('OcrScanner');

export function provideOcrScanner(form: Ref<any>, selectedPlanId: Ref<number | null>) {

  const ocrReceived = ref(false);
  const polling = ref(false);
  const qrUrl = ref('');
  const sessionId = Math.random().toString(36).substring(2, 9);
  
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let expireTimer: ReturnType<typeof setTimeout> | null = null;

  const ocrFields = ref<Record<string, boolean>>({});
  const lowConfidence = ref<Record<string, boolean>>({});
  const scanStep = ref<'scan_any' | 'scan_front' | 'scan_reverse' | 'completed'>('scan_any');

  const formStatus = computed(() => [
    { key: 'cedula', label: 'Cédula', filled: !!form.value.cedula, required: true },
    { key: 'firstName', label: 'Nombres', filled: !!form.value.firstName, required: true },
    { key: 'lastName', label: 'Apellidos', filled: !!form.value.lastName, required: true },
    { key: 'birthDate', label: 'Fecha de nacimiento', filled: !!form.value.birthDate, required: false },
    { key: 'bloodType', label: 'Tipo de sangre', filled: !!form.value.bloodType, required: false },
    { key: 'gender', label: 'Género', filled: !!form.value.gender, required: false },
    { key: 'plan', label: 'Plan de membresía', filled: selectedPlanId.value !== null, required: true },
  ]);

  function startPolling() {
    polling.value = true;

    expireTimer = setTimeout(() => {
      if (pollTimer) clearInterval(pollTimer);
      polling.value = false;
    }, 10 * 60 * 1000);

    pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/cam-signal/${sessionId}`);
        const data = await res.json();

        if (data.ocrResult) {
          fillFromOcr(data.ocrResult);
        }

        if (data.status === 'waiting_reverse') {
          scanStep.value = 'scan_reverse';
        } else if (data.status === 'waiting_front') {
          scanStep.value = 'scan_front';
        } else if (data.status === 'processed' && data.ocrResult) {
          scanStep.value = 'completed';
          polling.value = false;
          ocrReceived.value = true;
          if (pollTimer) clearInterval(pollTimer);
          if (expireTimer) clearTimeout(expireTimer);
        }
      } catch (e) {
        // Fallo silencioso
      }
    }, 2000);
  }

  function fillFromOcr(data: any) {
    const fields = ['cedula', 'firstName', 'lastName', 'birthDate', 'gender', 'bloodType'] as const;
    const conf = data.confidence ?? {};

    fields.forEach(field => {
      if (data[field]) {
        if (import.meta.dev) {
          console.log(`[OCR][formulario] asignando ${field}:`, data[field]);
        }
        (form.value as any)[field] = data[field];
        ocrFields.value[field] = true;

        const confidenceValue = conf[field];
        if (typeof confidenceValue === 'number' && confidenceValue < 80) {
          lowConfidence.value[field] = true;
        }
      }
    });

    if (import.meta.dev) {
      console.log('[OCR][formulario] estado final:', {
        cedula: form.value.cedula,
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        birthDate: form.value.birthDate,
        gender: form.value.gender,
        bloodType: form.value.bloodType,
      });
    }
  }

  async function resetOcr() {
    try {
      await $fetch(`/api/cam-signal/${sessionId}`, { method: 'POST', body: { type: 'reset' } });
    } catch (e) {
      console.error('Error al reiniciar la sesión del escáner:', e);
    }
    ocrReceived.value = false;
    ocrFields.value = {};
    lowConfidence.value = {};
    scanStep.value = 'scan_any';
    startPolling();
  }

  const relayUrl = ref<string>('');
  const isConnectingTunnel = ref(false);
  const sessionExp = ref<number | null>(null);
  const sessionSig = ref<string | null>(null);

  function updateQrUrl() {
    if (relayUrl.value) {
      const exp = sessionExp.value || (Date.now() + 5 * 60 * 1000);
      let url = `${relayUrl.value}/cam?session=${sessionId}&exp=${exp}`;
      if (sessionSig.value) {
        url += `&sig=${sessionSig.value}`;
      }
      qrUrl.value = url;
    }
  }

  async function loadTunnelInfo() {
    isConnectingTunnel.value = true;
    try {
      const query = sessionId ? `?session=${encodeURIComponent(sessionId)}` : '';
      const res = await fetch(`/api/tunnel${query}`);
      const data = await res.json();
      
      relayUrl.value = data.relayUrl || data.url || '';
      if (data.exp) sessionExp.value = data.exp;
      if (data.sig) sessionSig.value = data.sig;
      updateQrUrl();
    } catch (e) {
      console.error('Error fetching relay config:', e);
    } finally {
      isConnectingTunnel.value = false;
    }
  }

  async function retryTunnel() {
    await loadTunnelInfo();
  }

  onMounted(async () => {
    startPolling();
    await loadTunnelInfo();
  });

  onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer);
    if (expireTimer) clearTimeout(expireTimer);
  });

  const state = {
    ocrReceived,
    polling,
    qrUrl,
    relayUrl,
    isConnectingTunnel,
    retryTunnel,
    ocrFields,
    lowConfidence,
    formStatus,
    scanStep,
    resetOcr
  };

  provide(OcrScannerKey, state);
  return state;
}

export function useOcrScanner() {
  const state = inject(OcrScannerKey);
  if (!state) throw new Error('useOcrScanner must be used within provideOcrScanner');
  return state as ReturnType<typeof provideOcrScanner>;
}
