import fs from 'fs';
import path from 'path';
import https from 'https';

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const packageVersion = JSON.parse(fs.readFileSync(path.resolve('nuxt-app/package.json'), 'utf8')).version;
const version = getArg('version') || packageVersion;
const downloadUrl = getArg('url') || getArg('downloadUrl');
const notes = getArg('notes') || 'Corrección de validación de precios y sistema de auto-actualización';
const relayUrl = getArg('relay') || process.env.GYMOS_RELAY_URL || 'https://gym-os-cam.vercel.app';
const secretKey = getArg('secret') || process.env.GYMOS_SECRET_KEY || 'b3aeda29734a19399f938b9512ec4bac58959595f37d94c1d6762774c98f891b';

if (!downloadUrl) {
  console.log(`
Usage:
  node installer/publish-drive.mjs --version <version> --url <google_drive_download_url> [--notes <release_notes>]

Example:
  node installer/publish-drive.mjs --version ${packageVersion} --url "https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOpQrStUvWxYz" --notes "Correcciones y mejoras"
`);
  process.exit(1);
}

const payload = JSON.stringify({
  version,
  releaseDate: new Date().toISOString().split('T')[0],
  downloadUrl,
  notes
});

const urlObj = new URL(`${relayUrl.replace(/\/+$/, '')}/api/version`);

const req = https.request(urlObj, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Authorization': `Bearer ${secretKey}`
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Version successfully published to Auto-Updater endpoint!');
      console.log('Response:', body);
    } else {
      console.error(`❌ Failed to publish version (HTTP ${res.statusCode}):`, body);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Network error publishing version:', err.message);
});

req.write(payload);
req.end();
