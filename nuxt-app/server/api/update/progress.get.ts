import { getDownloadProgress } from '../../services/updateService';

export default defineEventHandler(() => {
  return getDownloadProgress();
});
