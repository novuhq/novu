import {
  ChannelTypeEnum,
  type IIntegration,
  IntegrationHealthErrorCodeEnum,
  IntegrationHealthStatusEnum,
} from '@novu/shared';

/** An active integration whose provider rejected its credentials. A paused one shows Paused instead. */
export function isIntegrationFailing(integration: IIntegration) {
  return integration.active && integration.health?.status === IntegrationHealthStatusEnum.ERROR;
}

const ERROR_REASONS: Record<IntegrationHealthErrorCodeEnum, string> = {
  [IntegrationHealthErrorCodeEnum.TOKEN_REVOKED]: 'Token revoked',
  [IntegrationHealthErrorCodeEnum.TOKEN_EXPIRED]: 'Token expired',
  [IntegrationHealthErrorCodeEnum.INVALID_CREDENTIALS]: 'Credentials rejected',
};

/** Short reason for the card and banner, e.g. "Token revoked". */
export function getHealthReason(integration: IIntegration) {
  const code = integration.health?.code;

  return code ? ERROR_REASONS[code] : ERROR_REASONS[IntegrationHealthErrorCodeEnum.INVALID_CREDENTIALS];
}

/** "Nov 14", for "Token revoked on Nov 14" and "Failing since Nov 14". */
export function formatHealthDate(date: string | undefined) {
  if (!date) return undefined;

  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const STEP_NOUNS: Partial<Record<ChannelTypeEnum, string>> = {
  [ChannelTypeEnum.EMAIL]: 'email',
  [ChannelTypeEnum.SMS]: 'SMS',
  [ChannelTypeEnum.PUSH]: 'push',
  [ChannelTypeEnum.CHAT]: 'chat',
};

/** "email", "SMS", "push" or "chat", for "Production chat steps are failing". */
export function getStepNoun(channel: ChannelTypeEnum | undefined) {
  return (channel && STEP_NOUNS[channel]) ?? 'these';
}

/** Failing integrations first, then the primary, then the rest, keeping their order otherwise. */
export function compareByAttention(a: IIntegration, b: IIntegration) {
  const rank = (integration: IIntegration) => {
    if (isIntegrationFailing(integration)) return 0;
    if (integration.primary) return 1;

    return 2;
  };

  return rank(a) - rank(b);
}
