import { CustomDataType } from '../../types';

export interface IConstructTenantDto {
  data?: CustomDataType;
}

export interface ICreateTenantDto extends IConstructTenantDto {
  name: string;
  identifier: string;
}
