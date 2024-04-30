import { ApiServiceLevelEnum } from '../../types';
import { ProductUseCases } from '../../dto';

export interface IOrganizationEntity {
  _id: string;
  name: string;
  apiServiceLevel?: ApiServiceLevelEnum;
  branding?: {
    color: string;
    logo: string;
    fontColor?: string;
    fontFamily?: string;
    contentBackground?: string;
    direction?: 'ltr' | 'rtl';
  };
  defaultLocale?: string;
  domain?: string;
  productUseCases?: ProductUseCases;
  createdAt: string;
  updatedAt: string;
  externalId?: string;
}
