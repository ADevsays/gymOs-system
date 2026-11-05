let lastPingTime = Date.now();
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of complete inactivity before auto-sleep

if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const elapsedSinceLastPing = Date.now() - lastPingTime;

    if (elapsedSinceLastPing > INACTIVITY_TIMEOUT_MS) {
      console.log('[GymOS] No activity for 30 minutes. Shutting down idle server...');
      process.exit(0);
    }
  }, 30000);
}

export default defineEventHandler((event) => {
  const query = getQuery(event);
  if (query.action === 'close') {
    console.log('[GymOS] App window close event received. Shutting down server...');
    setTimeout(() => process.exit(0), 500);
    return { status: 'shutting_down' };
  }

  lastPingTime = Date.now();
  return { status: 'alive' };
});
