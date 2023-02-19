export interface IApiKey {
  key: string;
  _userId: string;
}

export interface IWidgetSettings {
  notificationCenterEncryption: boolean;
}

export interface IDnsSettings {
  mxRecordConfigured: boolean;
  inboundParseDomain: string;
}

export class EnvironmentEntity {
  _id: string;

  name: string;

  _organizationId: string;

  identifier: string;

  apiKeys: IApiKey[];

  widget: IWidgetSettings;

  dns?: IDnsSettings;

  _parentId: string;
}
