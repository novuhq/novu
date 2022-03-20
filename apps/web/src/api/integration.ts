import { api } from './api.client';

export function getIntegrations() {
  return api.get('/v1/integrations');
}

export function createIntegration(data: string) {
  return api.post(`/v1/integrations`, data);
}

export function updateIntegration(data: string) {
  return api.put(`/v1/integrations`, data);
}
