import { EncryptedSecret, IApiRateLimitMaximum } from '@novu/shared';
import { BaseRepository } from '../base-repository';
import { EnvironmentDBModel, EnvironmentEntity, IApiKey } from './environment.entity';
import { Environment } from './environment.schema';

export class EnvironmentRepository extends BaseRepository<EnvironmentDBModel, EnvironmentEntity, object> {
  constructor() {
    super(Environment, EnvironmentEntity);
  }

  async findEnvironmentByIdentifier(identifier: string) {
    const data = await this.MongooseModel.findOne({ identifier }).read('secondaryPreferred');
    if (!data) return null;

    return this.mapEntity(data.toObject());
  }

  async updateApiKeyUserId(organizationId: string, oldUserId: string, newUserId: string) {
    return await this.update(
      {
        _organizationId: organizationId,
        'apiKeys._userId': oldUserId,
      },
      {
        $set: {
          'apiKeys.$._userId': newUserId,
        },
      }
    );
  }

  async findOrganizationEnvironments(organizationId: string) {
    return this.find({
      _organizationId: organizationId,
    });
  }

  async findByIdAndOrganization(environmentId: string, organizationId: string) {
    return this.findOne({
      _id: environmentId,
      _organizationId: organizationId,
    });
  }

  async addApiKey(environmentId: string, key: EncryptedSecret, userId: string) {
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

  async findByApiKey({ hash }: { hash: string }) {
    return await this.findOne({ 'apiKeys.hash': hash }, '_id _organizationId apiKeys', {
      readPreference: 'secondaryPreferred',
    });
  }

  async getApiKeys(environmentId: string): Promise<IApiKey[]> {
    const environment = await this.findOne(
      {
        _id: environmentId,
      },
      'apiKeys'
    );
    if (!environment) return [];

    return environment.apiKeys;
  }

  async updateApiKey(environmentId: string, key: EncryptedSecret, userId: string, hash?: string) {
    await this.update(
      {
        _id: environmentId,
      },
      {
        $set: {
          apiKeys: [
            {
              key,
              _userId: userId,
              hash,
            },
          ],
        },
      }
    );

    return await this.getApiKeys(environmentId);
  }

  async updateApiRateLimits(environmentId: string, apiRateLimits: Partial<IApiRateLimitMaximum>) {
    return await this.update(
      {
        _id: environmentId,
      },
      [
        {
          $set: {
            apiRateLimits: {
              $mergeObjects: ['$apiRateLimits', apiRateLimits],
            },
          },
        },
      ]
    );
  }
}
