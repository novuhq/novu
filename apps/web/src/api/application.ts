import { api } from './api.client';

export function getCurrentApplication() {
  return api.get('/v1/applications/me');
}

export function getApiKeys() {
  return api.get(`/v1/applications/api-keys`);
}

export function updateEmailSettings(payload: { senderEmail: string; senderName: string }) {
  return api.put(`/v1/channels/email/settings`, payload);
}

export function updateSmsSettings(payload: { authToken: string; accountSid: string; phoneNumber: string }) {
  return api.put(`/v1/channels/sms/settings`, { twillio: payload });
}

export function updateBrandingSettings(payload: { color: string | undefined; logo: string | undefined }) {
  return api.put(`/v1/applications/branding`, payload);
}
