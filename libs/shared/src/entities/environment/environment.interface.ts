import { IApiRateLimitMaximum } from '../../types';

export interface IEnvironment {
  _id?: string;
  name: string;
  _organizationId: string;
  _parentId?: string;
  identifier: string;
  widget: IWidgetSettings;
  dns?: IDnsSettings;
  apiRateLimits?: IApiRateLimitMaximum;

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
}

export interface IWidgetSettings {
  notificationCenterEncryption: boolean;
}

export interface IDnsSettings {
  mxRecordConfigured: boolean;
  inboundParseDomain: string;
}
