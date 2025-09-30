import { API_HOSTNAME, WEBSOCKET_HOSTNAME } from '@/config';

// Global hostname manager for both API and WebSocket endpoints
class HostnameManager {
  private currentApiHostname: string;
  private currentWebSocketHostname: string;

  constructor() {
    // Initialize with US hostnames (default)
    this.currentApiHostname = API_HOSTNAME ?? 'https://api.novu.co';
    this.currentWebSocketHostname = WEBSOCKET_HOSTNAME ?? 'https://ws.novu.co';
  }

  setApiHostname(hostname: string) {
    this.currentApiHostname = hostname;
  }

  getApiHostname(): string {
    return this.currentApiHostname;
  }

  setWebSocketHostname(hostname: string) {
    this.currentWebSocketHostname = hostname;
  }

  getWebSocketHostname(): string {
    return this.currentWebSocketHostname;
  }

  // Convenience methods for backward compatibility
  setHostname(hostname: string) {
    this.setApiHostname(hostname);
  }

  getHostname(): string {
    return this.getApiHostname();
  }
}

export const apiHostnameManager = new HostnameManager();
