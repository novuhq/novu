import { api } from './api.client';

export function getCurrentEnvironment() {
  return api.get('/v1/environments/me');
}

export function getMyEnvironments() {
  return api.get('/v1/environments');
}

export function getApiKeys() {
  return api.get(`/v1/environments/api-keys`);
}

export function updateEmailSettings(payload: { senderEmail: string; senderName: string }) {
  return api.put(`/v1/channels/email/settings`, payload);
}

export function updateSmsSettings(payload: { authToken: string; accountSid: string; phoneNumber: string }) {
  return api.put(`/v1/channels/sms/settings`, { twillio: payload });
}

export function updateBrandingSettings(payload: { color: string | undefined; logo: string | undefined }) {
  return api.put(`/v1/environments/branding`, payload);
}
