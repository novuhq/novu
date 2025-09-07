import { ChannelTypeEnum, IEnvironment, IIntegration } from '@novu/shared';
import { del, get, post, put } from './api.client';

export type CreateIntegrationData = {
  providerId: string;
  channel: ChannelTypeEnum;
  credentials: Record<string, string>;
  configurations: Record<string, string>;
  name: string;
  identifier: string;
  active: boolean;
  primary?: boolean;
  _environmentId: string;
};

export enum CheckIntegrationResponseEnum {
  INVALID_EMAIL = 'invalid_email',
  BAD_CREDENTIALS = 'bad_credentials',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export type UpdateIntegrationData = {
  name: string;
  identifier: string;
  active: boolean;
  primary: boolean;
  credentials: Record<string, string>;
  configurations: Record<string, string>;
  check: boolean;
};

export async function getIntegrations({ environment }: { environment: IEnvironment }) {
  // TODO: This is a technical debt on the API side.
  // Integrations work across environments, so we should not need to pass the environment ID here.
  const { data } = await get<{ data: IIntegration[] }>('/integrations', { environment });

  return data;
}

export async function deleteIntegration({ id, environment }: { id: string; environment: IEnvironment }) {
  return del<{ acknowledged: boolean; status: number }>(`/integrations/${id}`, {
    environment: environment,
  });
}

export async function createIntegration(data: CreateIntegrationData, environment: IEnvironment) {
  return await post<{ data: IIntegration }>('/integrations', {
    body: data,
    environment: environment,
  });
}

export async function setAsPrimaryIntegration(integrationId: string, environment: IEnvironment) {
  return post(`/integrations/${integrationId}/set-primary`, {
    environment: environment,
  });
}

export type AutoConfigureIntegrationResponse = {
  success: boolean;
  message?: string;
  integration?: IIntegration;
};

export async function autoConfigureIntegration(integrationId: string, environment: IEnvironment) {
  const response = await post<{ data: AutoConfigureIntegrationResponse }>(
    `/integrations/${integrationId}/auto-configure`,
    {
      environment: environment,
    }
  );

  return response.data;
}

export async function updateIntegration(integrationId: string, data: UpdateIntegrationData, environment: IEnvironment) {
  return await put<IIntegration>(`/integrations/${integrationId}`, {
    body: data,
    environment: environment,
  });
}
