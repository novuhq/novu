export interface IApiKey {
  key: string;
  _userId: string;
}

export class ApplicationEntity {
  _id?: string;

  name: string;

  _organizationId: string;

  identifier: string;

  apiKeys: IApiKey[];

  branding: {
    fontFamily?: string;
    fontColor?: string;
    contentBackground?: string;
    logo: string;
    color: string;
    direction?: 'ltr' | 'rtl';
  };
}
