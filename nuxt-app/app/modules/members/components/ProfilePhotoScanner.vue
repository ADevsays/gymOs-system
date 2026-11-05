<template>
  <div class="w-64 shrink-0 space-y-4">
    <!-- Estado Actual -->
    <div class="reg-card p-4 flex flex-col items-center">
      <div class="w-32 h-32 rounded-full overflow-hidden border-2 border-border mb-4 bg-surface-2 flex items-center justify-center">
        <img v-if="currentPhoto" :src="(currentPhoto as string)" alt="Profile" class="w-full h-full object-cover" />
        <User class="w-12 h-12 text-muted/50" v-else />
      </div>
      <p class="text-xs font-bold text-center text-text uppercase tracking-wider">{{ memberName }}</p>
    </div>

    <!-- Escáner / Captura -->
    <div class="reg-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <div
          :class="[
            'w-2 h-2 rounded-full shrink-0 transition-colors duration-300',
            polling ? 'bg-accent animate-pulse' : successMessage ? 'bg-success' : 'bg-border'
          ]"
        ></div>
        <span class="text-xs font-bold uppercase tracking-wider text-muted leading-none">
          {{ polling ? 'Esperando foto...' : successMessage ? 'Foto guardada' : 'Actualizar foto' }}
        </span>
      </div>

      <div v-if="successMessage" class="flex flex-col items-center py-4 animate-reveal text-center">
        <CheckCircle class="w-8 h-8 text-success mb-2" />
        <p class="text-sm font-bold text-success">¡Foto subida!</p>
        <button @click="reset" class="mt-4 text-xs text-muted hover:text-text underline cursor-pointer transition-colors">
          Tomar otra
        </button>
      </div>
      
      <div v-else-if="polling" class="flex flex-col items-center">
        <div class="bg-white rounded-lg p-2.5 flex items-center justify-center aspect-square mb-2 w-[200px] h-[200px]">
          <qrcode-vue v-if="qrUrl" :value="qrUrl" :size="180" level="H" />
          <div v-else class="flex flex-col items-center justify-center gap-2 text-gray-400 text-xs w-full h-full animate-pulse bg-gray-100 rounded">
            <Loader2 class="w-5 h-5 animate-spin text-gray-400" />
          </div>
        </div>
        <p class="text-[10px] text-muted text-center leading-tight">Escanea este código con tu celular para tomar la foto</p>

        <!-- Relay Connection Info -->
        <div class="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] mt-2 w-full">
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

        <button @click="cancelPolling" class="mt-3 text-xs text-muted hover:text-error underline cursor-pointer transition-colors">
          Cancelar
        </button>
      </div>

      <div v-else class="flex flex-col gap-2">
        <button @click="startPhotoSession" class="w-full py-2.5 bg-surface-2 border border-border rounded text-xs font-bold text-text hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2 uppercase tracking-wide">
          <Camera class="w-4 h-4" /> Tomar con celular
        </button>
      </div>

      <!-- Upload fallback -->
      <div class="mt-4 pt-4 border-t border-border" v-if="!polling && !successMessage">
        <label class="w-full py-2 bg-transparent border border-border border-dashed rounded text-xs font-bold text-muted hover:border-text hover:text-text transition-colors flex items-center justify-center gap-2 cursor-pointer uppercase">
          <Upload class="w-3.5 h-3.5" /> Subir archivo
          <input type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
        </label>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import QrcodeVue from 'qrcode.vue';
import { User, Camera, Upload, CheckCircle, Loader2, RefreshCw } from 'lucide-vue-next';

const props = defineProps<{
  memberId: number;
  memberName?: string;
  currentPhoto?: string | null;
}>();

const emit = defineEmits<{
  'photo-updated': [url: string];
}>();

const polling = ref(false);
const qrUrl = ref('');
const successMessage = ref(false);
const relayUrl = ref<string>('');
const isConnectingTunnel = ref(false);
const sessionExp = ref<number | null>(null);
const sessionSig = ref<string | null>(null);
let sessionId = '';
let pollTimer: any = null;
let expireTimer: any = null;

function updateQrUrl() {
  if (relayUrl.value) {
    const exp = sessionExp.value || (Date.now() + 5 * 60 * 1000);
    let url = `${relayUrl.value}/cam?session=${sessionId}&mode=photo&exp=${exp}`;
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
    console.error('Error fetching relay info:', e);
  } finally {
    isConnectingTunnel.value = false;
  }
}


async function retryTunnel() {
  await loadTunnelInfo(true);
}

async function startPhotoSession() {
  sessionId = Math.random().toString(36).substring(2, 9);
  polling.value = true;
  successMessage.value = false;
  qrUrl.value = '';

  await loadTunnelInfo();
  startPolling();
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  if (expireTimer) clearTimeout(expireTimer);

  expireTimer = setTimeout(() => {
    cancelPolling();
  }, 5 * 60 * 1000); // 5 min timeout

  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/cam-signal/${sessionId}`);
      const data = await res.json();

      if (data.status === 'processed' && data.photo) {
        cancelPolling();
        await savePhoto(data.photo);
      }
    } catch (e) {
      // silencioso
    }
  }, 2000);
}

function cancelPolling() {
  polling.value = false;
  if (pollTimer) clearInterval(pollTimer);
  if (expireTimer) clearTimeout(expireTimer);
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const file = input.files.item(0);
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const result = e.target?.result;
    if (typeof result !== 'string') return;
    await savePhoto(result);
  };
  reader.readAsDataURL(file);
}

async function savePhoto(base64Data: string) {
  try {
    const res = await $fetch<any>(`/api/members/${props.memberId}/photo`, {
      method: 'POST',
      body: { photo: base64Data }
    });
    
    if (res.success) {
      successMessage.value = true;
      emit('photo-updated', res.photoUrl);
    } else {
      alert(`Error al guardar foto: ${res.error}`);
    }
  } catch (e: any) {
    alert(`Error de red: ${e.message}`);
  }
}

function reset() {
  successMessage.value = false;
}

onUnmounted(() => {
  cancelPolling();
});
</script>

<style scoped>
@reference "~/assets/css/main.css";

.reg-card {
  @apply bg-surface border border-border rounded;
}
</style>
