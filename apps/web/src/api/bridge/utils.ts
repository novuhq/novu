export const TUNNEL_URL_LOCAL_STORAGE_KEY = 'nv-bridge-url';

export function getTunnelUrl() {
  return localStorage.getItem(TUNNEL_URL_LOCAL_STORAGE_KEY) ?? undefined;
}
