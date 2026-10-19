import type { HealthCheck } from '@novu/framework/internal';
import type { IEnvironment, IValidateBridgeUrlResponse } from '@novu/shared';
import { get, post } from './api.client';

export const getBridgeHealthCheck = async ({ environment }: { environment: IEnvironment }) => {
  const { data } = await get<{ data: HealthCheck }>('/bridge/status', { environment });

  return data;
};

export const validateBridgeUrl = async ({
  bridgeUrl,
  environment,
}: {
  bridgeUrl: string;
  environment: IEnvironment;
}) => {
  const { data } = await post<{ data: IValidateBridgeUrlResponse }>('/bridge/validate', {
    environment,
    body: { bridgeUrl },
  });

  return data;
};
