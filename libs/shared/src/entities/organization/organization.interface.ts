import { ApiServiceLevelEnum } from '../../types';
import { IUserEntity } from '../user';
import { MemberRoleEnum } from './member.enum';
import { IMemberInvite, MemberStatusEnum } from './member.interface';
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
  jobTitle?: string;
  domain?: string;
  productUseCases?: ProductUseCases;
  createdAt: string;
  updatedAt: string;
}
