export class OrganizationEntity {
  _id?: string;

  name: string;

  logo: string;

  branding: {
    fontFamily?: string;
    fontColor?: string;
    contentBackground?: string;
    logo: string;
    color: string;
    direction?: 'ltr' | 'rtl';
  };

  partnerConfigurations?: IPartnerConfiguration[];
}

export interface IPartnerConfiguration {
  accessToken: string;
  configurationId: string;
  projectIds?: string[];
  teamId?: string;
  partnerType: PartnerTypeEnum;
}

export enum PartnerTypeEnum {
  VERCEL = 'vercel',
}
