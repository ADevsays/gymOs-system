import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { spawn } from 'child_process';
import { getUpdatesDir } from '../utils/paths';
import { getRelayUrl } from '../utils/config';

export const CURRENT_APP_VERSION = process.env.GYMOS_APP_VERSION || '1.0.17';

export interface VersionManifest {
  version: string;
  releaseDate?: string;
  downloadUrl: string;
  notes?: string;
  sha256?: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl?: string;
  notes?: string;
  releaseDate?: string;
}

export interface DownloadProgress {
  status: 'idle' | 'downloading' | 'ready' | 'error';
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
}

let currentDownloadProgress: DownloadProgress = {
  status: 'idle',
  progress: 0,
  downloadedBytes: 0,
  totalBytes: 0
};

export function compareVersions(v1: string, v2: string): number {
  const p1 = v1.replace(/^v/, '').split('.').map(Number);
  const p2 = v2.replace(/^v/, '').split('.').map(Number);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

const GOOGLE_DRIVE_MANIFEST_URL = 'https://drive.google.com/uc?export=download&id=1oVuxTeAyWTnjlMay0tytg9dX2otIRNpI';

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = CURRENT_APP_VERSION;
  const relayUrl = getRelayUrl();
  const primaryUrl = process.env.GYMOS_UPDATE_URL || (relayUrl ? `${relayUrl}/api/version` : null);
  const urlsToCheck = [...new Set([primaryUrl, GOOGLE_DRIVE_MANIFEST_URL].filter(Boolean) as string[])];
  const manifests = await Promise.all(urlsToCheck.map(async (manifestUrl) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(manifestUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': `GymOS/${currentVersion}` }
      });
      if (!response.ok) return null;

      const manifest = (await response.json()) as VersionManifest;
      return manifest?.version && manifest?.downloadUrl ? manifest : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }));

  const latestManifest = manifests
    .filter((manifest): manifest is VersionManifest => Boolean(manifest))
    .reduce<VersionManifest | null>((latest, manifest) => {
      if (!latest || compareVersions(manifest.version, latest.version) > 0) return manifest;
      return latest;
    }, null);

  if (latestManifest) {
    return {
      hasUpdate: compareVersions(latestManifest.version, currentVersion) > 0,
      currentVersion,
      latestVersion: latestManifest.version,
      downloadUrl: latestManifest.downloadUrl,
      notes: latestManifest.notes,
      releaseDate: latestManifest.releaseDate
    };
  }

  return { hasUpdate: false, currentVersion, latestVersion: currentVersion };
}

export function getDownloadProgress(): DownloadProgress {
  return { ...currentDownloadProgress };
}

function resolveGoogleDriveUrl(rawUrl: string): string {
  const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  return rawUrl;
}

export async function downloadUpdate(rawUrl: string): Promise<void> {
  const targetUrl = resolveGoogleDriveUrl(rawUrl);
  const updatesDir = getUpdatesDir();
  const targetFilePath = path.join(updatesDir, 'GymOS-Setup.exe');
  const tempFilePath = `${targetFilePath}.tmp`;

  if (fs.existsSync(tempFilePath)) {
    try { fs.unlinkSync(tempFilePath); } catch {}
  }

  currentDownloadProgress = {
    status: 'downloading',
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0
  };

  const cookies: string[] = [];

  return new Promise((resolve, reject) => {
    function fetchWithRedirect(url: string, redirectCount = 0) {
      if (redirectCount > 10) {
        const err = new Error('Too many redirects while downloading update');
        currentDownloadProgress = { status: 'error', progress: 0, downloadedBytes: 0, totalBytes: 0, error: err.message };
        return reject(err);
      }

      const client = url.startsWith('https') ? https : http;
      const parsedUrl = new URL(url);

      const reqHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GymOS-AutoUpdater'
      };

      if (cookies.length > 0) {
        reqHeaders['Cookie'] = cookies.join('; ');
      }

      const req = client.get(parsedUrl, { headers: reqHeaders }, (res) => {
        if (res.headers['set-cookie']) {
          const newCookies = res.headers['set-cookie'].map((c) => c.split(';')[0]);
          cookies.push(...newCookies);
        }

        // Handle standard HTTP redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextUrl = res.headers.location;
          if (!nextUrl.startsWith('http')) {
            nextUrl = new URL(nextUrl, url).href;
          }
          return fetchWithRedirect(nextUrl, redirectCount + 1);
        }

        if (res.statusCode !== 200) {
          const err = new Error(`Download failed with HTTP ${res.statusCode}`);
          currentDownloadProgress = { status: 'error', progress: 0, downloadedBytes: 0, totalBytes: 0, error: err.message };
          return reject(err);
        }

        const contentType = res.headers['content-type'] || '';
        const contentLength = parseInt(res.headers['content-length'] || '0', 10);

        // Check if Google Drive returned an HTML warning/confirmation page for large files
        if (contentType.includes('text/html') || (contentLength > 0 && contentLength < 15000)) {
          let htmlData = '';
          res.on('data', (chunk) => htmlData += chunk);
          res.on('end', () => {
            if (htmlData.includes('download-form') || htmlData.includes('confirm=')) {
              const formActionMatch = htmlData.match(/action="([^"]+)"/);
              const uuidMatch = htmlData.match(/name="uuid"\s+value="([^"]+)"/);
              const confirmMatch = htmlData.match(/name="confirm"\s+value="([^"]+)"/);
              const idMatch = htmlData.match(/name="id"\s+value="([^"]+)"/);

              const actionUrl = formActionMatch ? formActionMatch[1] : 'https://drive.usercontent.google.com/download';
              const fileId = idMatch ? idMatch[1] : (url.match(/id=([a-zA-Z0-9_-]+)/)?.[1] || '');
              const uuid = uuidMatch ? uuidMatch[1] : '';
              const confirm = confirmMatch ? confirmMatch[1] : 't';

              const confirmUrl = `${actionUrl}?id=${fileId}&export=download&confirm=${confirm}${uuid ? `&uuid=${uuid}` : ''}`;
              return fetchWithRedirect(confirmUrl, redirectCount + 1);
            } else {
              const err = new Error('Unexpected HTML response during update download');
              currentDownloadProgress = { status: 'error', progress: 0, downloadedBytes: 0, totalBytes: 0, error: err.message };
              return reject(err);
            }
          });
          return;
        }

        // Binary stream download
        const totalBytes = contentLength;
        let downloadedBytes = 0;
        const fileStream = fs.createWriteStream(tempFilePath);

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const progress = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
          currentDownloadProgress = {
            status: 'downloading',
            progress,
            downloadedBytes,
            totalBytes
          };
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            try {
              if (fs.existsSync(targetFilePath)) {
                fs.unlinkSync(targetFilePath);
              }
              fs.renameSync(tempFilePath, targetFilePath);
              currentDownloadProgress = {
                status: 'ready',
                progress: 100,
                downloadedBytes,
                totalBytes
              };
              resolve();
            } catch (err: any) {
              currentDownloadProgress = { status: 'error', progress: 0, downloadedBytes, totalBytes, error: err.message };
              reject(err);
            }
          });
        });

        fileStream.on('error', (err) => {
          try { fs.unlinkSync(tempFilePath); } catch {}
          currentDownloadProgress = { status: 'error', progress: 0, downloadedBytes, totalBytes, error: err.message };
          reject(err);
        });
      });

      req.on('error', (err) => {
        currentDownloadProgress = {
          status: 'error',
          progress: 0,
          downloadedBytes: currentDownloadProgress.downloadedBytes,
          totalBytes: currentDownloadProgress.totalBytes,
          error: err.message,
        };
        reject(err);
      });

      req.setTimeout(30000, () => {
        req.destroy(new Error('La descarga tardó demasiado en responder. Inténtalo de nuevo.'));
      });
    }

    fetchWithRedirect(targetUrl);
  });
}

export function applyUpdateAndRestart(): { success: boolean; message: string } {
  const updatesDir = getUpdatesDir();
  const installerPath = path.join(updatesDir, 'GymOS-Setup.exe');

  if (!fs.existsSync(installerPath)) {
    throw new Error('Installer file not found. Download the update first.');
  }

  const tempDir = process.env.TEMP || process.env.TMP || updatesDir;
  const batScriptPath = path.join(tempDir, 'gymos_silent_updater.bat');

  const batContent = `@echo off
timeout /t 2 /nobreak >nul
start /wait "" "${installerPath}" /VERYSILENT /SUPPRESSMSGBOXES /FORCECLOSEAPPLICATIONS /RESTARTAPPLICATIONS
del "${installerPath}" 2>nul
del "%~f0" 2>nul
exit
`;

  fs.writeFileSync(batScriptPath, batContent, { encoding: 'utf8' });

  const child = spawn('cmd.exe', ['/c', batScriptPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();

  setTimeout(() => {
    process.exit(0);
  }, 1000);

  return { success: true, message: 'Restarting application for update...' };
}
