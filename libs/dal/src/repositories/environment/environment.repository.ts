import { BaseRepository } from '../base-repository';
import { IApiKey, EnvironmentEntity } from './environment.entity';
import { Environment } from './environment.schema';

export class EnvironmentRepository extends BaseRepository<EnvironmentEntity> {
  constructor() {
    super(Environment, EnvironmentEntity);
  }

  async updateBrandingDetails(environmentId: string, branding: { color: string; logo: string }) {
    return this.update(
      {
        _id: environmentId,
      },
      {
        $set: {
          branding,
        },
      }
    );
  }

  async findEnvironmentByIdentifier(identifier: string) {
    return await this.findOne({
      identifier,
    });
  }

  async findOrganizationEnvironments(organizationId: string) {
    return this.find({
      _organizationId: organizationId,
    });
  }

  async addApiKey(environmentId: string, key: string, userId: string) {
    return await this.update(
      {
        _id: environmentId,
      },
      {
        $push: {
          apiKeys: {
            key,
            _userId: userId,
          },
        },
      }
    );
  }

  async findByApiKey(key: string) {
    return await this.findOne({
      'apiKeys.key': key,
    });
  }

  async getApiKeys(environmentId: string): Promise<IApiKey[]> {
    const environment = await this.findOne(
      {
        _id: environmentId,
      },
      'apiKeys'
    );
    if (!environment) return null;

    return environment.apiKeys;
  }
}
