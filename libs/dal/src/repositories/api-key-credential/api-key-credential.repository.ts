import type { EnforceOrgId } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { ApiKeyCredentialDBModel, ApiKeyCredentialEntity } from './api-key-credential.entity';
import { ApiKeyCredential } from './api-key-credential.schema';

export class ApiKeyCredentialRepository extends BaseRepositoryV2<
  ApiKeyCredentialDBModel,
  ApiKeyCredentialEntity,
  EnforceOrgId
> {
  constructor() {
    super(ApiKeyCredential, ApiKeyCredentialEntity);
  }

  async findByHashForAuth(hash: string): Promise<ApiKeyCredentialEntity | null> {
    const doc = await this.MongooseModel.findOne({ hash, revokedAt: { $exists: false } }).lean();

    if (!doc) {
      return null;
    }

    return this.mapProjectedEntity(doc) as ApiKeyCredentialEntity;
  }

  async listByServiceAccount(organizationId: string, serviceAccountId: string): Promise<ApiKeyCredentialEntity[]> {
    return this.find(
      {
        _organizationId: organizationId,
        _serviceAccountId: serviceAccountId,
      },
      '*'
    );
  }

  async updateLastUsedAt(id: string, organizationId: string): Promise<void> {
    await this.update(
      {
        _id: id,
        _organizationId: organizationId,
      },
      {
        $set: {
          lastUsedAt: new Date().toISOString(),
        },
      }
    );
  }
}
