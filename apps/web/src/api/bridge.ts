import { api } from './index';

export function validateBridgeUrl(payload: { bridgeUrl: string }) {
  return api.post(`/v1/bridge/validate`, payload);
}
