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

  createdAt: Date;
  updatedAt: Date;
}

export interface IWidgetSettings {
  notificationCenterEncryption: boolean;
}

export interface IDnsSettings {
  mxRecordConfigured: boolean;
  inboundParseDomain: string;
}
