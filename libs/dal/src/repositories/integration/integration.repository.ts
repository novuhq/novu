import { FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';

import { IntegrationEntity, IntegrationDBModel } from './integration.entity';
import { Integration } from './integration.schema';

import { BaseRepository } from '../base-repository';
import { DalException } from '../../shared';
import type { EnforceEnvOrOrgIds, IDeleteResult } from '../../types';

type IntegrationQuery = FilterQuery<IntegrationDBModel> & EnforceEnvOrOrgIds;

export class IntegrationRepository extends BaseRepository<IntegrationDBModel, IntegrationEntity, EnforceEnvOrOrgIds> {
  private integration: SoftDeleteModel;
  constructor() {
    super(Integration, IntegrationEntity);
    this.integration = Integration;
  }

  async find(
    query: IntegrationQuery,
    select = '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: { limit?: number; sort?: any; skip?: number } = {}
  ): Promise<IntegrationEntity[]> {
    return super.find(query, select, options);
  }

  async findByEnvironmentId(environmentId: string): Promise<IntegrationEntity[]> {
    return await this.find({
      _environmentId: environmentId,
    });
  }

  async create(data: IntegrationQuery): Promise<IntegrationEntity> {
    return await super.create(data);
  }

  async delete(query: IntegrationQuery) {
    const integration = await this.findOne({ _id: query._id, _organizationId: query._organizationId });
    if (!integration) throw new DalException(`Could not find integration with id ${query._id}`);

    await this.integration.delete({ _id: integration._id, _organizationId: integration._organizationId });
  }

  async deleteMany(query: IntegrationQuery): Promise<IDeleteResult> {
    const { _environmentId, _organizationId } = query || {};
    if (!_environmentId || !_organizationId) {
      throw new DalException(
        'Deletion operation blocked for missing any of these properties: [_environmentId, _organizationId]. We are avoiding a potential unexpected multiple deletion'
      );
    }

    const { acknowledged, modifiedCount, matchedCount } = await this.integration.delete(query);

    if (matchedCount === 0 || modifiedCount === 0) {
      throw new DalException(
        `Deletion of many integrations in environment ${_environmentId} and organization ${_organizationId}  was not performed properly`
      );
    }

    return {
      modifiedCount,
      matchedCount,
    };
  }

  async findDeleted(query: IntegrationQuery): Promise<IntegrationEntity> {
    const res: IntegrationEntity = await this.integration.findDeleted(query);

    return this.mapEntity(res);
  }
}
