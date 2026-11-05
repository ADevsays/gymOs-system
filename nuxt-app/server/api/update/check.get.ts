import { checkForUpdates } from '../../services/updateService';

export default defineEventHandler(async () => {
  return await checkForUpdates();
});
