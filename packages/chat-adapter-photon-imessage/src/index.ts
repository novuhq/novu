import type { Adapter } from 'chat';
import { PhotonImessageAdapterImpl } from './adapter.js';
import type { PhotonImessageAdapterConfig } from './types.js';

export type { PhotonImessageAdapterConfig } from './types.js';
export { buildStandardWebhookVerifier } from './verify-standard-webhook.js';

export function createPhotonImessageAdapter(config: PhotonImessageAdapterConfig): Adapter {
  return new PhotonImessageAdapterImpl(config);
}
