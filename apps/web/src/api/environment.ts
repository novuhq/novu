import { api } from '.';

export function getCurrentEnvironment() {
  return api.get('/v1/environments/me');
}

export function getMyEnvironments() {
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
