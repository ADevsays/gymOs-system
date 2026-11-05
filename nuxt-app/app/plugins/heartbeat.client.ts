export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    const sendHeartbeat = () => {
      fetch('/api/ping', { method: 'POST' }).catch(() => {});
    };

    // Initial ping and recurring heartbeat
    sendHeartbeat();
    setInterval(sendHeartbeat, 5000);

    // Refresh immediately on focus or visibility change
    window.addEventListener('focus', sendHeartbeat);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    });

    // Notify server to shutdown cleanly when window is closed
    window.addEventListener('beforeunload', () => {
      navigator.sendBeacon('/api/ping?action=close');
    });
  }
});
