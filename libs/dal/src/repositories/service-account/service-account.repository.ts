import { ServiceAccountScopeEnum } from '@novu/shared';

import type { EnforceOrgId } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { ServiceAccountDBModel, ServiceAccountEntity } from './service-account.entity';
import { ServiceAccount } from './service-account.schema';

export class ServiceAccountRepository extends BaseRepositoryV2<
  ServiceAccountDBModel,
  ServiceAccountEntity,
  EnforceOrgId
> {
  constructor() {
    super(ServiceAccount, ServiceAccountEntity);
  }

  async listByOrganization(organizationId: string): Promise<ServiceAccountEntity[]> {
    return this.find({ _organizationId: organizationId }, '*');
  }

  async listByEnvironment(organizationId: string, environmentId: string): Promise<ServiceAccountEntity[]> {
    return this.find(
      {
        _organizationId: organizationId,
        $or: [
          { scope: ServiceAccountScopeEnum.ORGANIZATION },
          { scope: ServiceAccountScopeEnum.ENVIRONMENT, _environmentId: environmentId },
        ],
      },
      '*'
    );
  }
}
