import { ChannelTypeEnum, ICredentialsDto } from '@notifire/shared';
import { api } from './api.client';

export function getIntegrations() {
  return api.get('/v1/integrations');
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
