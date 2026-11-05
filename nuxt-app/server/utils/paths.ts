export const getDataPath = () =>
  process.env.GYMOS_DATA_PATH || process.cwd();

export const getResourcesPath = () =>
  process.env.GYMOS_RESOURCES_PATH || process.cwd();

export const getUploadsDir = () => {
  const dataPath = getDataPath();
  return process.env.GYMOS_DATA_PATH
    ? path.join(dataPath, 'uploads')
    : path.join(dataPath, 'public', 'uploads');
};

export const getUpdatesDir = () => {
  const dataPath = getDataPath();
  const dir = path.join(dataPath, 'updates');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};
import fs from 'node:fs';
import path from 'node:path';

