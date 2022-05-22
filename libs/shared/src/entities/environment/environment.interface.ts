export interface IEnvironment {
  _id?: string;
  name: string;
  _organizationId: string;
  _parentId?: string;
  identifier: string;
  widget: IWidgetSettings;

  branding?: {
    color: string;
    logo: string;
    fontColor: string;
    fontFamily: string;
    contentBackground: string;
    direction: 'ltr' | 'rtl';
  };
}

export interface IWidgetSettings {
  notificationCenterEncryption: boolean;
}
