import { IEnvironment } from '@novu/shared';
import { getV2, postV2 } from './api.client';

// Matches the response DTO defined in the API
interface GetWebhookPortalTokenResponse {
  url: string;
  token: string;
  appId: string;
}

export const getWebhookPortalToken = async (environment: IEnvironment): Promise<GetWebhookPortalTokenResponse> => {
  const { data } = await getV2<{ data: GetWebhookPortalTokenResponse }>('/outbound-webhooks/portal/token', {
    environment,
  });

  return data;
};

export const createWebhookPortalToken = async (environment: IEnvironment): Promise<GetWebhookPortalTokenResponse> => {
  const { data } = await postV2<{ data: GetWebhookPortalTokenResponse }>('/outbound-webhooks/portal/token', {
    environment,
    body: {},
  });

  return data;
};
