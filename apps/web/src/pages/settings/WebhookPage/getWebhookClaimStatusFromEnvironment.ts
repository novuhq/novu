import { IEnvironment } from '@novu/shared';
import { WebhookClaimStatus } from './WebhookPage.types';

const DEFAULT_STATUS: WebhookClaimStatus = 'unclaimed';

/** Determine the webhook claim status from the environment's DNS settings. */
export const getWebhookClaimStatusFromEnvironment = (envDns: IEnvironment['dns'] | undefined): WebhookClaimStatus => {
  if (!envDns) {
    return DEFAULT_STATUS;
  }

  if (!envDns.inboundParseDomain) {
    return 'unclaimed';
  }

  if (!envDns.mxRecordConfigured) {
    return 'pending';
  }

  return 'claimed';
};
