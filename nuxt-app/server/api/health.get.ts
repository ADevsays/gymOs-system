export default defineEventHandler(() => ({
  status: 'ok',
  version: process.env.GYMOS_APP_VERSION || '1.0.17',
}));
