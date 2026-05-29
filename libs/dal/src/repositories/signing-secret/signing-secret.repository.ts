import { SigningSecretTypeEnum } from '@novu/shared';

import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { SigningSecretDBModel, SigningSecretEntity, SigningSecretStatusEnum } from './signing-secret.entity';
import { SigningSecret } from './signing-secret.schema';

export class SigningSecretRepository extends BaseRepositoryV2<
  SigningSecretDBModel,
  SigningSecretEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(SigningSecret, SigningSecretEntity);
  }

  async findActiveByEnvironmentAndType(
    environmentId: string,
    organizationId: string,
    type: SigningSecretTypeEnum
  ): Promise<SigningSecretEntity[]> {
    return this.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        type,
        status: SigningSecretStatusEnum.ACTIVE,
      },
      '*'
    );
  }
}
