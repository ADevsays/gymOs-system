import { ref, onMounted, onUnmounted } from 'vue';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl?: string;
  notes?: string;
  releaseDate?: string;
}

const updateAvailable = ref(false);
const currentVersion = ref('1.0.16');
const latestVersion = ref('1.0.16');
const downloadUrl = ref('');
const releaseNotes = ref('');
const releaseDate = ref('');
const isDownloading = ref(false);
const downloadProgress = ref(0);
const isReadyToInstall = ref(false);
const isInstalling = ref(false);
const updateError = ref<string | null>(null);
const bannerDismissed = ref(false);

let progressInterval: any = null;

export function useAutoUpdater() {
  async function checkUpdates() {
    try {
      const data = await $fetch<UpdateInfo>('/api/update/check');
      if (data) {
        currentVersion.value = data.currentVersion;
        latestVersion.value = data.latestVersion;
        if (data.hasUpdate && data.downloadUrl) {
          updateAvailable.value = true;
          downloadUrl.value = data.downloadUrl;
          releaseNotes.value = data.notes || '';
          releaseDate.value = data.releaseDate || '';
        } else {
          updateAvailable.value = false;
        }
      }
    } catch (err) {
      console.warn('[AutoUpdater] Failed to check for updates:', err);
    }
  }

  async function startDownload() {
    if (!downloadUrl.value || isDownloading.value) return;

    isDownloading.value = true;
    updateError.value = null;
    downloadProgress.value = 0;

    try {
      await $fetch('/api/update/download', {
        method: 'POST',
        body: { downloadUrl: downloadUrl.value }
      });

      if (progressInterval) clearInterval(progressInterval);
      progressInterval = setInterval(async () => {
        try {
          const prog = await $fetch<{ status: string; progress: number; error?: string }>('/api/update/progress');
          if (prog) {
            downloadProgress.value = prog.progress || 0;
            if (prog.status === 'ready') {
              clearInterval(progressInterval);
              isDownloading.value = false;
              isReadyToInstall.value = true;
            } else if (prog.status === 'error') {
              clearInterval(progressInterval);
              isDownloading.value = false;
              updateError.value = prog.error || 'Error al descargar la actualización';
            }
          }
        } catch {
          // ignore transient polling errors
        }
      }, 500);
    } catch (err: any) {
      isDownloading.value = false;
      updateError.value = err.message || 'Error al iniciar la descarga';
    }
  }

  async function installAndRestart() {
    isInstalling.value = true;
    try {
      await $fetch('/api/update/apply', { method: 'POST' });
    } catch (err: any) {
      isInstalling.value = false;
      updateError.value = err.message || 'Error al reiniciar la aplicación';
    }
  }

  function dismissBanner() {
    bannerDismissed.value = true;
  }

  return {
    updateAvailable,
    currentVersion,
    latestVersion,
    downloadUrl,
    releaseNotes,
    releaseDate,
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
  };
}
