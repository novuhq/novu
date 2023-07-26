import { IConstructTenantDto } from './create-tenant.dto';

export interface IUpdateTenantBodyDto extends IConstructTenantDto {
  name?: string;
  identifier?: string;
}
