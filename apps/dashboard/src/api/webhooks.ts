import { IEnvironment } from '@novu/shared';
import { getV2 } from './api.client';

// Matches the response DTO defined in the API
interface GetWebhookPortalTokenResponse {
  url: string;
  token: string;
  appId: string;
}

export const getWebhookPortalToken = async (environment: IEnvironment): Promise<GetWebhookPortalTokenResponse> => {
  const { data } = await getV2<{ data: GetWebhookPortalTokenResponse }>('/webhooks/portal/token', {
    environment,
  });

  return data;
};
