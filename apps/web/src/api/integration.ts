import { ChannelTypeEnum, ICredentialsDto } from '@novu/shared';
import { api } from './api.client';

export function getIntegrations() {
  return api.get('/v1/integrations');
}

export function getIntegrationLimit(type: ChannelTypeEnum): Promise<{ limit: number; count: number }> {
  return api.get(`/v1/integrations/${type}/limit`);
}

export function getActiveIntegrations() {
  return api.get('/v1/integrations/active');
}

export function createIntegration(data: {
  providerId: string;
  channel: ChannelTypeEnum | null;
  credentials: ICredentialsDto;
  active: boolean;
}) {
  return api.post(`/v1/integrations`, data);
}

export function updateIntegration(integrationId: string, data: { credentials: ICredentialsDto; active: boolean }) {
  return api.put(`/v1/integrations/${integrationId}`, data);
}

export function getWebhookSupportStatus(providerId: string) {
  return api.get(`/v1/integrations/webhook/provider/${providerId}/status`);
}

export function getInAppActivated() {
  return api.get(`/v1/integrations/in-app/status`);
}
