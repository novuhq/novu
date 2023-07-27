import { TenantCustomData } from '../../types';

export interface IConstructTenantDto {
  data?: TenantCustomData;
}

export interface ICreateTenantDto extends IConstructTenantDto {
  name: string;
  identifier: string;
}
