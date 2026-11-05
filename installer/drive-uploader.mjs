import fs from 'fs';
import path from 'path';
import https from 'https';

const CLIENT_ID = process.env.GYMOS_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GYMOS_GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GYMOS_GOOGLE_REFRESH_TOKEN;
const FOLDER_ID = process.env.GYMOS_GOOGLE_FOLDER_ID;
const RELAY_URL = 'https://gym-os-cam.vercel.app';
const SECRET_KEY = 'b3aeda29734a19399f938b9512ec4bac58959595f37d94c1d6762774c98f891b';

export async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !FOLDER_ID) {
    throw new Error('Faltan credenciales de Google Drive. Configura GYMOS_GOOGLE_CLIENT_ID, GYMOS_GOOGLE_CLIENT_SECRET, GYMOS_GOOGLE_REFRESH_TOKEN y GYMOS_GOOGLE_FOLDER_ID.');
  }
  const payload = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: 'refresh_token'
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.access_token) {
            resolve(json.access_token);
          } else {
            reject(new Error(`Failed to get access token: ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export async function uploadToDrive(filePath, customName = null) {
  const accessToken = await getAccessToken();
  const fileName = customName || path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;
  const mimeType = 'application/octet-stream';

  console.log(`[Google Drive] Starting upload of ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);

  // Step 1: Initiate Resumable Upload
  const metadata = JSON.stringify({
    name: fileName,
    parents: [FOLDER_ID]
  });

  const locationUrl = await new Promise((resolve, reject) => {
    const req = https.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': fileSize
      }
    }, (res) => {
      if (res.statusCode === 200 && res.headers.location) {
        resolve(res.headers.location);
      } else {
        let errData = '';
        res.on('data', d => errData += d);
        res.on('end', () => reject(new Error(`Upload init failed (${res.statusCode}): ${errData}`)));
      }
    });

    req.on('error', reject);
    req.write(metadata);
    req.end();
  });

  // Step 2: Upload file stream
  const fileId = await new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const req = https.request(locationUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': fileSize,
        'Content-Type': mimeType
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const json = JSON.parse(data);
            resolve(json.id);
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`File upload chunk failed (${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', reject);
    fileStream.pipe(req);
  });

  console.log(`[Google Drive] File uploaded successfully. File ID: ${fileId}`);

  // Step 3: Set public permissions (Anyone with the link can view/download)
  try {
    await makeFilePublic(fileId, accessToken);
    console.log(`[Google Drive] Permissions set to public.`);
  } catch (err) {
    console.warn(`[Google Drive] Warning setting permissions:`, err.message);
  }

  const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  return { fileId, directDownloadUrl, fileName };
}

export async function makeFilePublic(fileId, accessToken) {
  const permPayload = JSON.stringify({
    role: 'reader',
    type: 'anyone'
  });

  return new Promise((resolve, reject) => {
    const req = https.request(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(permPayload)
      }
    }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        let errData = '';
        res.on('data', d => errData += d);
        res.on('end', () => reject(new Error(`Permission update failed: ${errData}`)));
      }
    });

    req.on('error', reject);
    req.write(permPayload);
    req.end();
  });
}

export async function uploadVersionManifest(version, downloadUrl, notes = '') {
  const accessToken = await getAccessToken();
  const manifestData = JSON.stringify({
    version,
    releaseDate: new Date().toISOString().split('T')[0],
    downloadUrl,
    notes
  }, null, 2);

  // Check if version.json already exists in target folder
  const existingId = await new Promise((resolve) => {
    const q = encodeURIComponent(`'${FOLDER_ID}' in parents and name = 'version.json' and trashed = false`);
    https.get(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.files && json.files.length > 0) {
            resolve(json.files[0].id);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });

  let fileId = existingId;
  if (existingId) {
    // Update content
    await new Promise((resolve, reject) => {
      const req = https.request(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(manifestData)
        }
      }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`Failed to update version.json: HTTP ${res.statusCode}`));
      });
      req.on('error', reject);
      req.write(manifestData);
      req.end();
    });
    console.log(`[Google Drive] version.json updated (ID: ${existingId})`);
  } else {
    // Create new
    fileId = await new Promise((resolve, reject) => {
      const metadata = JSON.stringify({ name: 'version.json', parents: [FOLDER_ID] });
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;
      
      const body = delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        metadata +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        manifestData +
        closeDelim;

      const req = https.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.id);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    console.log(`[Google Drive] version.json created (ID: ${fileId})`);
  }

  try {
    await makeFilePublic(fileId, accessToken);
  } catch (err) {
    console.warn(`[Google Drive] Warning setting public permission on version.json:`, err.message);
  }

  const manifestDirectUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  return { manifestFileId: fileId, manifestDirectUrl };
}

export async function publishRelease(version, downloadUrl, notes = '') {
  // Step A: Update Google Drive version manifest
  const driveManifest = await uploadVersionManifest(version, downloadUrl, notes);
  console.log(`[Google Drive] Manifest published at: ${driveManifest.manifestDirectUrl}`);

  // Step B: Update Vercel Relay if deployed
  const payload = JSON.stringify({
    version,
    releaseDate: new Date().toISOString().split('T')[0],
    downloadUrl,
    notes
  });

  try {
    await new Promise((resolve, reject) => {
      const req = https.request(`${RELAY_URL}/api/version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'Authorization': `Bearer ${SECRET_KEY}`
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[Relay] Version v${version} published successfully to ${RELAY_URL}/api/version`);
            resolve(JSON.parse(data));
          } else {
            console.warn(`[Relay] Relay update skipped (HTTP ${res.statusCode}). Google Drive manifest is active.`);
            resolve(null);
          }
        });
      });

      req.on('error', (e) => {
        console.warn(`[Relay] Relay network notice: ${e.message}. Google Drive manifest is active.`);
        resolve(null);
      });
      req.write(payload);
      req.end();
    });
  } catch {}

  return driveManifest;
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('drive-uploader.mjs')) {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : null;
  const versionIdx = args.indexOf('--version');
  const packageVersion = JSON.parse(fs.readFileSync(path.resolve('nuxt-app/package.json'), 'utf8')).version;
  const version = versionIdx !== -1 ? args[versionIdx + 1] : packageVersion;
  const notesIdx = args.indexOf('--notes');
  const notes = notesIdx !== -1 ? args[notesIdx + 1] : 'Corrección de validación de precios y sistema de auto-actualización';

  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Error: specify valid --file path');
    process.exit(1);
  }

  (async () => {
    try {
      const result = await uploadToDrive(filePath);
      console.log('✅ Upload result:', result);
      await publishRelease(version, result.directDownloadUrl, notes);
      console.log('🎉 Release workflow completed! All clients will now receive v' + version);
    } catch (err) {
      console.error('❌ Error executing drive upload:', err);
      process.exit(1);
    }
  })();
}
