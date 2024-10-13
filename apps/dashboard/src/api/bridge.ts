import { BridgeStatus } from '@/utils/types';
import { get, post } from './api.client';

export const getBridgeHealthCheck = async () => {
  const { data } = await get<{ data: BridgeStatus }>('/bridge/status');

  return data;
};

export const validateBridgeUrl = async (payload: { bridgeUrl: string }) => {
  const { data } = await post<{ data: { isValid: boolean } }>('/bridge/validate', payload);

  return data;
};
