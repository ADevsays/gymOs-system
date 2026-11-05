import { spawn, execSync } from 'child_process';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { createServer } from 'net';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = __dirname;
const dataDir = join(process.env.APPDATA || join(process.env.USERPROFILE || '', 'AppData', 'Roaming'), 'GymOS');
const browserProfileDir = join(dataDir, 'browser-profile');

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
if (!existsSync(join(dataDir, 'uploads'))) mkdirSync(join(dataDir, 'uploads'), { recursive: true });
if (!existsSync(browserProfileDir)) mkdirSync(browserProfileDir, { recursive: true });

function findFreePort(startPort = 3100) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(startPort, '0.0.0.0', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findFreePort(startPort + 1));
    });
  });
}

function waitForServer(port, maxAttempts = 50) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else if (attempts < maxAttempts) {
          setTimeout(check, 300);
        } else {
          reject(new Error('Server responded with non-200 status'));
        }
      });
      req.on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(check, 300);
        } else {
          reject(new Error('Server connection timeout'));
        }
      });
      req.end();
    };
    check();
  });
}

function findBrowser() {
  const candidates = [
    join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  for (const p of candidates) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

async function main() {
  const port = await findFreePort(3100);
  const nodePath = join(appDir, 'node.exe');
  const serverEntry = join(appDir, 'server', 'index.mjs');

  const serverProcess = spawn(nodePath, [serverEntry], {
    cwd: appDir,
    detached: false,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '0.0.0.0',
      NODE_ENV: 'production',
      GYMOS_DATA_PATH: dataDir,
      GYMOS_RESOURCES_PATH: join(appDir, 'resources'),
      GYMOS_RELAY_URL: 'https://gym-os-cam.vercel.app',
      GYMOS_SECRET_KEY: 'b3aeda29734a19399f938b9512ec4bac58959595f37d94c1d6762774c98f891b',
      NITRO_PORT: String(port),
      NITRO_HOST: '0.0.0.0',
    },
    stdio: 'ignore',
    windowsHide: true,
  });

  serverProcess.on('error', () => {
    process.exit(1);
  });

  try {
    await waitForServer(port);
  } catch {
    serverProcess.kill();
    process.exit(1);
  }

  const browser = findBrowser();
  const url = `http://127.0.0.1:${port}`;

  if (browser) {
    const browserProcess = spawn(browser, [
      `--app=${url}`,
      `--user-data-dir=${browserProfileDir}`,
      '--window-size=1280,800',
      '--disable-extensions',
      '--no-first-run',
      '--no-default-browser-check',
    ], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    browserProcess.unref();
  } else {
    execSync(`start "" "${url}"`);
  }

  // When serverProcess exits (via heartbeat after window close), exit launcher
  serverProcess.on('exit', () => {
    process.exit(0);
  });

  const shutdown = () => {
    try { serverProcess.kill(); } catch {}
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', shutdown);
}

main().catch(() => {
  process.exit(1);
});
