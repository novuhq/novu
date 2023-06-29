import { FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';

import { BaseRepository } from '../base-repository';
import { IntegrationEntity, IntegrationDBModel } from './integration.entity';
import { Integration } from './integration.schema';
import { DalException } from '../../shared';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';

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
    const existingIntegration = await this.findOne({
      _environmentId: data._environmentId,
      providerId: data.providerId,
      channel: data.channel,
    });
    if (existingIntegration) {
      throw new DalException('Duplicate key - One environment may not have two providers of the same channel type');
    }

    return await super.create(data);
  }
  async delete(query: IntegrationQuery) {
    const integration = await this.findOne({ _id: query._id, _environmentId: query._environmentId });
    if (!integration) throw new DalException(`Could not find integration with id ${query._id}`);

    await this.integration.delete({ _id: integration._id, _environmentId: integration._environmentId });
  }

  async findDeleted(query: IntegrationQuery): Promise<IntegrationEntity> {
    const res: IntegrationEntity = await this.integration.findDeleted(query);

    return this.mapEntity(res);
  }
}
