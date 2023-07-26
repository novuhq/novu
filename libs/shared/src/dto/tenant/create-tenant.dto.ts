import { TenantCustomData } from '../../types';

export interface IConstructTenantDto {
  data?: TenantCustomData;
}

export interface ICreateTenantBodyDto extends IConstructTenantDto {
  name: string;
  identifier: string;
}
