import { downloadUpdate } from '../../services/updateService';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body || !body.downloadUrl) {
    throw createError({ statusCode: 400, message: 'downloadUrl is required' });
  }

  // Trigger download in background without blocking request
  downloadUpdate(body.downloadUrl).catch((err) => {
    console.error('[AutoUpdater] Download failed:', err);
  });

  return { success: true, message: 'Download initiated' };
});
