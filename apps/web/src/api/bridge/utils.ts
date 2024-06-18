const TUNNEL_URL_KEY = 'nv-bridge-url';

export function getTunnelUrl() {
  return localStorage.getItem(TUNNEL_URL_KEY);
}

export function setTunnelUrl(url: string) {
  localStorage.setItem(TUNNEL_URL_KEY, url);
}
