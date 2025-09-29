import { API_HOSTNAME, WEBSOCKET_HOSTNAME } from '@/config';

// Global hostname manager for both API and WebSocket endpoints
class HostnameManager {
  private currentApiHostname: string;
  private currentWebSocketHostname: string;
  private isRegionSwitching: boolean = false;

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

  setRegionSwitching(switching: boolean) {
    this.isRegionSwitching = switching;
  }

  isCurrentlyRegionSwitching(): boolean {
    return this.isRegionSwitching;
  }
}

export const apiHostnameManager = new HostnameManager();
