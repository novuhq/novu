import { SoftDeleteModel } from 'mongoose-delete';

import { BaseRepository } from '../base-repository';
import { TenantDBModel, TenantEntity } from './tenant.entity';
import { Tenant } from './tenant.schema';
import { EnforceEnvId, EnforceEnvOrOrgIds } from '../../types';

export class TenantRepository extends BaseRepository<TenantDBModel, TenantEntity, EnforceEnvId> {
  private tenant: SoftDeleteModel;

  constructor() {
    super(Tenant, TenantEntity);
    this.tenant = Tenant;
  }
}
