// Helper function to get the effective backend and socket URLs
export function getEffectiveUrls(backendUrl?: string, socketUrl?: string) {
  // Convert https:// to wss:// and http:// to ws:// for WebSocket URLs
  const getWebSocketUrl = (url: string) => {
    if (!url) return url;
    return url.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
  };

  // Only return URLs if they are explicitly provided
  const effectiveBackendUrl = backendUrl || '';
  const effectiveSocketUrl = socketUrl ? getWebSocketUrl(socketUrl) : '';

  return { effectiveBackendUrl, effectiveSocketUrl };
}
