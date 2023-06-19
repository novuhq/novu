import { BaseRepository } from '../base-repository';
import { TenantDBModel, TenantEntity } from './tenant.entity';
import { Tenant } from './tenant.schema';

export class TenantRepository extends BaseRepository<TenantDBModel, TenantEntity> {
  constructor() {
    super(Tenant, TenantEntity);
  }
}
