import { API_ROOT, WS_URL } from '../config';

class HostnameManager {
  private currentApiHostname: string;
  private currentWebSocketHostname: string;

  constructor() {
    this.currentApiHostname = API_ROOT ?? 'http://localhost:3000';
    this.currentWebSocketHostname = WS_URL ?? 'http://localhost:3002';
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

  setHostname(hostname: string) {
    this.setApiHostname(hostname);
  }

  getHostname(): string {
    return this.getApiHostname();
  }
}

export const apiHostnameManager = new HostnameManager();

