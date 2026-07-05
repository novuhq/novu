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
          'apiKeys.$[element]._userId': newUserId,
        },
      },
      {
        arrayFilters: [{ 'element._userId': oldUserId }],
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

  /**
   * Appends an API key. When `maxKeysCount` is provided, the cap is enforced
   * atomically in the update predicate (no key at index `maxKeysCount - 1`),
   * so concurrent creates cannot exceed the cap. Returns `null` when the cap
   * was reached (or the environment does not exist).
   */
  async addApiKey(environmentId: string, key: EncryptedSecret, userId: string, hash?: string, maxKeysCount?: number) {
    const query = {
      _id: environmentId,
      ...(maxKeysCount !== undefined && { [`apiKeys.${maxKeysCount - 1}`]: { $exists: false } }),
    };

    const { matched } = await this.update(query, {
      $push: {
        apiKeys: {
          key,
          _userId: userId,
          hash,
        },
      },
    });

    if (matched === 0) {
      return null;
    }

    return await this.getApiKeys(environmentId);
  }

  /**
   * Removes a single API key. The "at least one key must remain" invariant is
   * enforced atomically in the update predicate (a second key must exist at
   * pull time), so concurrent deletes cannot empty the array.
   * `matched === 0` means only one key remained; `modified === 0` means the
   * key was not found (e.g. already deleted concurrently).
   */
  async deleteApiKey(environmentId: string, keyQuery: { hash: string } | { key: EncryptedSecret | string }) {
    const { matched, modified } = await this.update(
      {
        _id: environmentId,
        'apiKeys.1': { $exists: true },
      },
      {
        $pull: {
          apiKeys: keyQuery,
        },
      }
    );

    return { matched, modified };
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
