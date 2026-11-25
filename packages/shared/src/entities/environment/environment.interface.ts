import { EnvironmentTypeEnum, IApiRateLimitMaximum } from '../../types';

export interface IEnvironment {
  _id: string;
  name: string;
  _organizationId: string;
  _parentId?: string;
  identifier: string;
  slug?: string;
  widget: IWidgetSettings;
  dns?: IDnsSettings;
  apiRateLimits?: IApiRateLimitMaximum;
  color: string;
  type: EnvironmentTypeEnum;
  branding?: {
    color: string;
    logo: string;
    fontColor: string;
    fontFamily: string;
    contentBackground: string;
    direction: 'ltr' | 'rtl';
  };

  echo?: {
    url?: string;
  };
  bridge?: {
    url?: string;
  };

  webhookAppId?: string;

  subscriberTokens?: ISubscriberTokensSettings;

  createdAt: Date;
  updatedAt: Date;
}

/** Present only while the environment requires signed subscriber tokens; absent means off. */
export interface ISubscriberTokensSettings {
  requiredAt: string | Date;
}

export function isSubscriberTokensRequired(
  environment: { subscriberTokens?: { requiredAt?: unknown } | null } | null | undefined
): boolean {
  return Boolean(environment?.subscriberTokens?.requiredAt);
}

export interface IWidgetSettings {
  notificationCenterEncryption: boolean;
}

export interface IDnsSettings {
  mxRecordConfigured: boolean;
  inboundParseDomain: string;
}
