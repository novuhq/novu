import type { IEntity, TransformEntityToDbModel } from '../../types';

export class OrganizationEntity implements IEntity {
  _id: string;

  name: string;

  logo?: string;

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

export type OrganizationDBModel = TransformEntityToDbModel<OrganizationEntity>;

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

export enum DirectionEnum {
  LTR = 'ltr',
  RTL = 'trl',
}
