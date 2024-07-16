import { api } from '.';

export function getEnvironments() {
  return api.get('/v1/environments');
}

export function getApiKeys() {
  return api.get(`/v1/environments/api-keys`);
}

export function regenerateApiKeys() {
  return api.post(`/v1/environments/api-keys/regenerate`, {});
}

export function updateDnsSettings(payload: { inboundParseDomain: string | undefined }, environmentId: string) {
  return api.put(`/v1/environments/${environmentId}`, { dns: payload });
}

export function updateBridgeUrl(payload: { url: string | undefined }, environmentId: string) {
  return api.put(`/v1/environments/${environmentId}`, { bridge: payload });
}
