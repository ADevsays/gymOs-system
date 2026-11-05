<template>
  <div 
    v-if="updateAvailable && !bannerDismissed" 
    class="fixed bottom-6 right-6 z-50 max-w-md w-full animate-reveal"
  >
    <div class="bg-surface border-2 border-accent/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md relative overflow-hidden">
      <!-- Glow effect -->
      <div class="absolute -top-12 -right-12 w-28 h-28 bg-accent/20 rounded-full blur-2xl pointer-events-none"></div>

      <!-- Header -->
      <div class="flex items-start justify-between gap-3 relative z-10">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
            <Sparkles class="w-4 h-4" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-display font-bold text-sm tracking-wide uppercase text-text">GymOS Actualización</span>
              <span class="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-accent text-white">v{{ latestVersion }}</span>
            </div>
            <p class="text-xs text-muted mt-0.5">Versión actual: v{{ currentVersion }}</p>
          </div>
        </div>

        <button 
          @click="dismissBanner" 
          class="text-muted hover:text-text p-1 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
          title="Posponer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Notes -->
      <div v-if="releaseNotes" class="mt-2.5 text-xs text-muted bg-surface-2/60 border border-border/50 rounded-xl p-2.5 max-h-24 overflow-y-auto font-body">
        <p class="text-[11px] font-semibold text-text uppercase tracking-wider mb-1">Novedades:</p>
        <p class="whitespace-pre-line">{{ releaseNotes }}</p>
      </div>

      <!-- Error message -->
      <div v-if="updateError" class="mt-2.5 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl p-2.5 flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span class="text-[11px]">{{ updateError }}</span>
      </div>

      <!-- Actions -->
      <div class="mt-3.5 relative z-10 flex flex-col gap-2">
        <!-- Progress bar when downloading -->
        <div v-if="isDownloading" class="flex flex-col gap-1.5">
          <div class="flex justify-between text-[11px] font-mono text-muted">
            <span>Descargando ejecutable...</span>
            <span class="font-bold text-accent">{{ downloadProgress }}%</span>
          </div>
          <div class="w-full h-2 bg-surface-2 border border-border rounded-full overflow-hidden">
            <div 
              class="h-full bg-accent transition-all duration-300 rounded-full"
              :style="{ width: `${downloadProgress}%` }"
            ></div>
          </div>
        </div>

        <!-- Button: Start download -->
        <button 
          v-else-if="!isReadyToInstall && !isInstalling"
          @click="startDownload"
          class="w-full py-2.5 px-4 rounded-xl bg-accent text-white hover:bg-accent-soft text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-accent/20"
        >
          <Download class="w-4 h-4" />
          <span>Actualizar Ahora</span>
        </button>

        <!-- Button: Install & Restart -->
        <button 
          v-else-if="isReadyToInstall && !isInstalling"
          @click="installAndRestart"
          class="w-full py-2.5 px-4 rounded-xl bg-success text-white hover:bg-emerald-600 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md animate-pulse"
        >
          <RefreshCw class="w-4 h-4" />
          <span>Instalar y Reiniciar GymOS</span>
        </button>

        <!-- Installing state -->
        <div v-else-if="isInstalling" class="py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-muted uppercase">
          <Loader2 class="w-4 h-4 animate-spin text-accent" />
          <span>Instalando y reiniciando aplicación...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { Sparkles, Download, RefreshCw, X, AlertCircle, Loader2 } from 'lucide-vue-next';
import { useAutoUpdater } from '~/composables/useAutoUpdater';

const {
  updateAvailable,
  currentVersion,
  latestVersion,
  releaseNotes,
  isDownloading,
  downloadProgress,
  isReadyToInstall,
  isInstalling,
  updateError,
  bannerDismissed,
  checkUpdates,
  startDownload,
  installAndRestart,
  dismissBanner
} = useAutoUpdater();

onMounted(() => {
  // Check for updates on startup
  checkUpdates();
});
</script>
