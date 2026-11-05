<template>
  <AppModal
    :is-open="isOpen"
    :title="editingProduct ? 'Editar Producto' : 'Nuevo Producto'"
    subtitle="Ingresa la información, precios y stock del artículo."
    :icon="Package"
    max-width="max-w-lg"
    @close="handleClose"
    @dismiss="handleDismiss"
  >
    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Photo Section: Dropzone & QR Mobile Capture -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-muted uppercase tracking-wide">
              Foto del Producto
            </label>
            <span v-if="previewImage" class="text-[11px] text-accent font-medium">
              Foto seleccionada
            </span>
          </div>

          <!-- Dropzone Container -->
          <div
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            :class="[
              'relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden flex flex-col items-center justify-center text-center p-4',
              isDragging 
                ? 'border-accent bg-accent/10 scale-[1.005]' 
                : previewImage 
                  ? 'border-border bg-surface-2/40' 
                  : 'border-border hover:border-accent/60 bg-surface-2/30 hover:bg-surface-2/60'
            ]"
          >
            <!-- Mode 1: Active QR Scanner for Mobile Camera -->
            <div v-if="isScanningQr" class="w-full flex flex-col items-center py-2 animate-reveal">
              <div class="bg-white rounded-xl p-2.5 flex items-center justify-center aspect-square mb-2.5 w-41 h-41 shadow-lg">
                <QrcodeVue v-if="qrUrl" :value="qrUrl" :size="144" level="H" />
                <div v-else class="flex flex-col items-center justify-center gap-2 text-gray-400 text-xs w-full h-full animate-pulse bg-gray-100 rounded-lg">
                  <Loader2 class="w-6 h-6 animate-spin text-accent" />
                  <span class="text-[10px] text-gray-500 font-medium">Generando QR...</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                <p class="text-xs font-bold text-text uppercase tracking-wider">
                  Escanea con tu celular
                </p>
              </div>
              <p class="text-[11px] text-muted max-w-xs mt-0.5 leading-tight">
                Abre la cámara del celular para tomar la foto del producto y se cargará aquí al instante.
              </p>

              <!-- Relay Connection Info -->
              <div class="w-full max-w-55 pt-2 mt-2 border-t border-border/50 flex items-center justify-between text-[10px]">
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

              <button 
                type="button" 
                @click="cancelPhotoSession" 
                class="mt-2.5 px-3 py-1 bg-surface-2 border border-border text-muted hover:text-danger hover:border-danger/40 rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors"
              >
                Cancelar escaneo
              </button>
            </div>

            <!-- Mode 2: Image Preview -->
            <div v-else-if="previewImage" class="w-full flex items-center gap-4 animate-reveal">
              <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-border shrink-0 bg-surface shadow-sm">
                <img :src="previewImage" class="w-full h-full object-cover" alt="Vista previa del producto" />
              </div>
              <div class="flex-1 flex flex-col items-start text-left gap-2 min-w-0">
                <div>
                  <p class="text-xs font-bold text-text truncate">Foto cargada</p>
                  <p class="text-[11px] text-muted leading-tight">
                    Puedes soltar otra imagen para cambiarla o usar tu celular.
                  </p>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <label class="px-2.5 py-1.5 bg-surface border border-border hover:border-accent rounded-lg text-[11px] font-bold text-text cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs">
                    <Upload class="w-3 h-3 text-accent" />
                    <span>Cambiar</span>
                    <input type="file" accept="image/*" class="hidden" @change="handleFileChange" />
                  </label>
                  <button 
                    type="button" 
                    @click="startPhotoSession" 
                    class="px-2.5 py-1.5 bg-surface border border-border hover:border-accent rounded-lg text-[11px] font-bold text-text cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Camera class="w-3 h-3 text-accent" />
                    <span>Celular</span>
                  </button>
                  <button 
                    type="button" 
                    @click="clearImage" 
                    class="px-2.5 py-1.5 bg-surface border border-border hover:border-danger hover:text-danger rounded-lg text-[11px] font-bold text-muted cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Trash2 class="w-3 h-3" />
                    <span>Quitar</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Mode 3: Empty State Dropzone -->
            <div v-else class="w-full flex flex-col items-center justify-center py-5 px-3">
              <div class="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center text-accent mb-2.5 shadow-xs">
                <UploadCloud class="w-6 h-6" />
              </div>
              <p class="text-xs lg:text-sm font-bold text-text leading-tight">
                Arrastra y suelta una foto aquí
              </p>
              <p class="text-[11px] text-muted mt-1 max-w-xs leading-normal">
                Formatos PNG, JPG o WEBP (máx. 5MB), o elige una opción:
              </p>

              <div class="flex items-center gap-2 mt-3.5 flex-wrap justify-center">
                <label class="px-3.5 py-1.5 bg-surface border border-border hover:border-accent text-text text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors">
                  <Upload class="w-3.5 h-3.5 text-accent" />
                  <span>Subir foto</span>
                  <input type="file" accept="image/*" class="hidden" @change="handleFileChange" />
                </label>
                
                <button 
                  type="button"
                  @click="startPhotoSession"
                  class="px-3.5 py-1.5 bg-accent/10 border border-accent/40 hover:bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <QrCode class="w-3.5 h-3.5" />
                  <span>Tomar con celular (QR)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Name Input -->
        <AppInput
          v-model="form.name"
          label="Nombre del Producto"
          required
          placeholder="Ej: Bebida Hidratante 500ml"
        />

        <!-- Category Dropdown (Dynamic from Database) -->
        <AppSelect
          v-model="form.categoryId"
          label="Categoría"
          required
          :options="categoryOptions"
        />

        <!-- Precios y Stock Section -->
        <div class="flex flex-col gap-2.5 pt-1">
          <h4 class="text-[11px] font-bold text-muted uppercase tracking-wider">Precios y stock</h4>
          
          <div class="grid grid-cols-2 gap-3">
            <AppInput
              v-model="form.price"
              type="number"
              min="0"
              required
              mono
              label="Precio de Venta ($)"
              placeholder="0"
            />
            <AppInput
              v-model="form.cost"
              type="number"
              min="0"
              mono
              label="Costo Unitario ($)"
              placeholder="0"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <AppInput
              v-model="form.stock"
              type="number"
              min="0"
              required
              mono
              label="Stock Inicial (Uds)"
              placeholder="0"
            />
            <AppInput
              v-model="form.minStock"
              type="number"
              min="1"
              mono
              label="Alerta Stock Mínimo"
              placeholder="5"
            />
          </div>
        </div>

        <!-- Detalles Opcionales (Standardized to AppInput dimensions) -->
        <details class="group w-full transition-all">
          <summary class="w-full bg-surface-2 border border-border hover:border-accent text-text px-3.5 py-2.5 rounded-xl text-xs lg:text-sm flex items-center justify-between cursor-pointer select-none list-none transition-colors duration-150">
            <div class="flex items-center gap-2 font-medium">
              <ChevronRight class="w-4 h-4 transition-transform duration-200 group-open:rotate-90 text-accent shrink-0" />
              <span class="text-xs uppercase font-bold tracking-wide text-muted group-hover:text-text">Detalles opcionales</span>
            </div>
            <span class="text-[11px] text-muted font-normal group-open:hidden">Código de barras, descripción...</span>
          </summary>
          <div class="mt-2.5 p-3.5 bg-surface-2/40 border border-border rounded-xl flex flex-col gap-3 animate-reveal">
            <AppInput
              v-model="form.barcode"
              mono
              label="Código de Barras / SKU"
              placeholder="Opcional (para lector de código)"
            />

            <AppInput
              v-model="form.description"
              type="textarea"
              :rows="2"
              label="Descripción"
              placeholder="Detalles del producto (sabor, presentación, etc.)"
            />
          </div>
        </details>

        <!-- Modal Actions -->
        <div class="flex items-center gap-3 pt-3 border-t border-border/40">
          <button 
            type="button" 
            @click="handleDismiss"
            class="flex-1 py-2.5 rounded-xl border border-border text-muted hover:text-text bg-surface-2 text-xs lg:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            :disabled="saving"
            class="flex-1 py-2.5 rounded-xl bg-accent text-white border border-accent hover:bg-accent-soft disabled:opacity-50 text-xs lg:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <span v-if="saving" class="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
            <span v-else>{{ editingProduct ? 'Actualizar' : 'Guardar Producto' }}</span>
          </button>
        </div>
      </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { Package, UploadCloud, Upload, Camera, QrCode, X, Trash2, ChevronRight, Loader2, RefreshCw } from 'lucide-vue-next';
import QrcodeVue from 'qrcode.vue';
import type { Product, CategoryItem } from '../types';
import AppModal from '~/ui/components/AppModal.vue';

const props = defineProps<{
  isOpen: boolean;
  editingProduct?: Product | null;
  saving?: boolean;
  categories: CategoryItem[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', payload: any): void;
}>();

const isDragging = ref(false);
const isScanningQr = ref(false);
const qrUrl = ref('');
const relayUrl = ref<string>('');
const isConnectingTunnel = ref(false);
let sessionId = '';
let pollTimer: any = null;
let expireTimer: any = null;

const previewImage = ref<string | null>(null);

const form = ref<any>({
  name: '',
  categoryId: null,
  category: 'bebidas',
  price: 0,
  cost: 0,
  stock: 0,
  minStock: 5,
  barcode: '',
  description: '',
  photoBase64: null,
});

const categoryOptions = computed(() => {
  return props.categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));
});

const sessionExp = ref<number | null>(null);
const sessionSig = ref<string | null>(null);

function updateQrUrl() {
  if (relayUrl.value) {
    const exp = sessionExp.value || (Date.now() + 5 * 60 * 1000);
    let url = `${relayUrl.value}/cam?session=${sessionId}&mode=product&exp=${exp}`;
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
  await loadTunnelInfo();
}

function cancelPhotoSession() {
  isScanningQr.value = false;
  qrUrl.value = '';
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (expireTimer) {
    clearTimeout(expireTimer);
    expireTimer = null;
  }
}

async function startPhotoSession() {
  sessionId = Math.random().toString(36).substring(2, 9);
  isScanningQr.value = true;
  qrUrl.value = '';
  await loadTunnelInfo();
  startPolling();
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  if (expireTimer) clearTimeout(expireTimer);

  expireTimer = setTimeout(() => {
    cancelPhotoSession();
  }, 5 * 60 * 1000);

  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/cam-signal/${sessionId}`);
      const data = await res.json();

      if (data.status === 'processed' && data.photo) {
        cancelPhotoSession();
        previewImage.value = data.photo;
        form.value.photoBase64 = data.photo;
      }
    } catch {
      // silent retry
    }
  }, 2000);
}

const resetForm = () => {
  const defaultCategoryId = props.categories[0]?.id ?? null;
  form.value = {
    name: '',
    categoryId: defaultCategoryId,
    category: 'bebidas',
    price: null,
    cost: null,
    stock: 0,
    minStock: 5,
    barcode: '',
    description: '',
    photoBase64: null,
  };
  previewImage.value = null;
};

watch(
  () => props.editingProduct,
  (prod) => {
    const defaultCategoryId = props.categories[0]?.id ?? null;

    if (prod) {
      let matchedId = prod.categoryId;
      if (!matchedId && prod.category) {
        const found = props.categories.find(c => c.slug === prod.category || c.name.toLowerCase() === prod.category?.toLowerCase());
        matchedId = found ? found.id : defaultCategoryId;
      }

      form.value = {
        name: prod.name,
        categoryId: matchedId || defaultCategoryId,
        category: prod.category || 'bebidas',
        price: prod.price,
        cost: prod.cost || 0,
        stock: prod.stock,
        minStock: prod.minStock || 5,
        barcode: prod.barcode || '',
        description: prod.description || '',
        photoBase64: null,
      };
      previewImage.value = prod.photoPath || null;
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  readFile(file);
};

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  readFile(file);
};

const readFile = (file: File) => {
  const reader = new FileReader();
  reader.onload = (uploadEvent) => {
    const base64 = uploadEvent.target?.result as string;
    previewImage.value = base64;
    form.value.photoBase64 = base64;
  };
  reader.readAsDataURL(file);
};

const clearImage = () => {
  previewImage.value = null;
  form.value.photoBase64 = '';
};

// Backdrop or Esc: close without destroying draft
const handleClose = () => {
  cancelPhotoSession();
  emit('close');
};

// Explicit dismiss via 'X' or Cancel: reset draft and close
const handleDismiss = () => {
  cancelPhotoSession();
  resetForm();
  emit('close');
};

const handleSubmit = () => {
  const selectedCat = props.categories.find(c => c.id === form.value.categoryId);
  emit('save', {
    ...form.value,
    categoryId: form.value.categoryId,
    category: selectedCat?.slug || form.value.category || 'bebidas',
  });
  resetForm();
};

onUnmounted(() => {
  cancelPhotoSession();
});
</script>
