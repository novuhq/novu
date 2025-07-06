import { ApiServiceLevelEnum, IOrganizationEntity, ProductUseCases } from '@novu/shared';

export class OrganizationEntity implements IOrganizationEntity {
  _id: string;

  name: string;

  logo?: string;

  apiServiceLevel: ApiServiceLevelEnum;

  branding?: Branding;

  partnerConfigurations?: IPartnerConfiguration[];

  defaultLocale?: string;

  domain?: string;

  productUseCases?: ProductUseCases;

  language?: string[];

  removeNovuBranding?: boolean;

  createdAt: string;

  updatedAt: string;

  externalId?: string;

  stripeCustomerId?: string;

  createdBy?: string;
}

export type Branding = {
  fontFamily?: string;
  fontColor?: string;
  contentBackground?: string;
  logo: string;
  color: string;
  direction?: 'ltr' | 'rtl';
};

export type OrganizationDBModel = OrganizationEntity;

export interface IPartnerConfiguration {
  accessToken: string;
  configurationId: string;
  projectIds?: string[];
  teamId: string;
  partnerType: PartnerTypeEnum;
}

export enum PartnerTypeEnum {
  VERCEL = 'vercel',
}

export enum DirectionEnum {
  LTR = 'ltr',
  RTL = 'trl',
}
