import { applyUpdateAndRestart } from '../../services/updateService';

export default defineEventHandler(() => {
  try {
    return applyUpdateAndRestart();
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message || 'Failed to apply update' });
  }
});
