import fs from 'fs';
import path from 'path';
import { defineEventHandler, sendStream, createError, setHeader } from 'h3';

export default defineEventHandler((event) => {
  const paramPath = event.context.params?.path;
  if (!paramPath) {
    throw createError({ statusCode: 400, message: 'Missing file path' });
  }

  const uploadsBase = process.env.GYMOS_DATA_PATH
    ? path.join(process.env.GYMOS_DATA_PATH, 'uploads')
    : path.join(process.cwd(), 'public', 'uploads');

  const absolutePath = path.resolve(uploadsBase, paramPath);
  const normalizedBase = path.resolve(uploadsBase);

  // Security check: prevent directory traversal
  if (!absolutePath.startsWith(normalizedBase)) {
    throw createError({ statusCode: 403, message: 'Forbidden' });
  }

  if (!fs.existsSync(absolutePath)) {
    // Check fallback in public/uploads if exists
    const fallbackPath = path.resolve(process.cwd(), 'public', 'uploads', paramPath);
    if (fs.existsSync(fallbackPath)) {
      const ext = path.extname(fallbackPath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.ico': 'image/x-icon',
        '.heic': 'image/heic',
      };
      setHeader(event, 'Content-Type', mimeTypes[ext] || 'application/octet-stream');
      setHeader(event, 'Cache-Control', 'public, max-age=86400');
      return sendStream(event, fs.createReadStream(fallbackPath));
    }
    throw createError({ statusCode: 404, message: 'Image not found' });
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.heic': 'image/heic',
  };

  setHeader(event, 'Content-Type', mimeTypes[ext] || 'application/octet-stream');
  setHeader(event, 'Cache-Control', 'public, max-age=86400');

  return sendStream(event, fs.createReadStream(absolutePath));
});
