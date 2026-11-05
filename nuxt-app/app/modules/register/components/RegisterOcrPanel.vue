<template>
  <div class="w-64 flex-shrink-0 space-y-4">
    <!-- Tarjeta QR -->
    <div class="reg-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <div
          :class="[
            'w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300',
            (scanStep === 'scan_reverse' || scanStep === 'scan_front') ? 'bg-warning animate-bounce' : polling ? 'bg-accent animate-pulse' : ocrReceived ? 'bg-success' : 'bg-border'
          ]"
        ></div>
        <span class="text-xs font-bold uppercase tracking-wider text-muted leading-none">
          {{ scanStep === 'scan_reverse' ? 'Frontal listo (1/2) — Voltea la cédula' : scanStep === 'scan_front' ? 'Reverso listo (1/2) — Escanea el frontal' : polling ? 'Esperando escaneo...' : ocrReceived ? '¡Escaneo completo!' : 'Escáner listo' }}
        </span>
      </div>

      <!-- Estado Éxito -->
      <div v-if="ocrReceived" class="flex flex-col items-center py-4 animate-reveal">
        <div class="w-12 h-12 rounded-full bg-success/10 border border-success/40 flex items-center justify-center text-success mb-3">
          <CheckCircle class="w-6 h-6" />
        </div>
        <p class="text-sm font-bold text-success text-center">¡Escaneo Completo!</p>
        <p class="text-xs text-muted text-center mt-1">Revisa los campos en el formulario</p>
        <button @click="resetOcr" class="mt-4 text-xs text-muted hover:text-text underline cursor-pointer transition-colors">
          Escanear de nuevo
        </button>
      </div>

      <!-- QR Code -->
      <div v-else>
        <div class="bg-white rounded-lg p-2.5 flex items-center justify-center aspect-square mb-2">
          <qrcode-vue v-if="qrUrl" :value="qrUrl" :size="180" level="H" />
          <div v-else class="flex flex-col items-center gap-2 text-gray-400 text-xs text-center">
            <Loader2 class="w-5 h-5 animate-spin" />
            Conectando...
          </div>
        </div>
        <p v-if="scanStep === 'scan_reverse'" class="text-xs font-semibold text-warning text-center animate-pulse">
          ¡Frontal registrado! Ahora escanea el REVERSO en el móvil
        </p>
        <p v-else-if="scanStep === 'scan_front'" class="text-xs font-semibold text-warning text-center animate-pulse">
          ¡Reverso registrado! Ahora escanea el FRONTAL en el móvil
        </p>
        <p v-else class="text-xs text-muted text-center mb-2">Apunta con la cámara de tu celular</p>

        <!-- Relay Connection Info -->
        <div class="pt-2 border-t border-border/50 flex items-center justify-between text-[10px]">
          <span class="text-muted flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-success"></span>
            Cámara Relay (Vercel)
          </span>
          <button
            type="button"
            @click="retryTunnel"
            :disabled="isConnectingTunnel"
            class="text-accent hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Refrescar conexión"
          >
            <RefreshCw :class="['w-2.5 h-2.5', isConnectingTunnel ? 'animate-spin' : '']" />
            <span>{{ isConnectingTunnel ? 'Reconectando...' : 'Refrescar' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Estado del formulario (campos pendientes) -->
    <div class="reg-card p-4">
      <h4 class="text-xs font-bold uppercase tracking-wider text-muted mb-3">Campos</h4>
      <div class="space-y-2">
        <div
          v-for="field in formStatus"
          :key="field.key"
          class="flex items-center gap-2 text-xs"
        >
          <div
            class="w-3 h-3 rounded-full border flex items-center justify-center transition-colors"
            :class="field.filled ? 'bg-success/20 border-success text-success' : 'border-border'"
          >
            <CheckCircle v-if="field.filled" class="w-2.5 h-2.5" />
          </div>
          <span :class="field.filled ? 'text-text' : 'text-muted'">
            {{ field.label }}
          </span>
          <span v-if="field.required" class="text-accent text-[10px]">*</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import QrcodeVue from 'qrcode.vue';
import { Loader2, CheckCircle, RefreshCw } from 'lucide-vue-next';
import { useOcrScanner } from '../composables/useOcrScanner';

const {
  polling,
  ocrReceived,
  qrUrl,
  relayUrl,
  isConnectingTunnel,
  retryTunnel,
  formStatus,
  scanStep,
  resetOcr
} = useOcrScanner();
</script>

<style scoped>
@reference "~/assets/css/main.css";

.reg-card {
  @apply bg-surface border border-border rounded;
}
</style>
