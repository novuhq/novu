import { Document, FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { BaseRepository, Omit } from '../base-repository';
import { IntegrationEntity } from './integration.entity';
import { Integration } from './integration.schema';
import { DalException } from '../../shared';

class PartialIntegrationEntity extends Omit(IntegrationEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

export class IntegrationRepository extends BaseRepository<EnforceEnvironmentQuery, IntegrationEntity> {
  private integration: SoftDeleteModel;
  constructor() {
    super(Integration, IntegrationEntity);
    this.integration = Integration;
  }

  async find(
    query: EnforceEnvironmentQuery,
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

  async create(data: EnforceEnvironmentQuery): Promise<IntegrationEntity> {
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
  async delete(query: EnforceEnvironmentQuery) {
    const integration = await this.findOne({ _id: query._id, _environmentId: query._environmentId });
    if (!integration) throw new DalException(`Could not find integration with id ${query._id}`);

    const requestQuery: EnforceEnvironmentQuery = { _id: integration._id, _environmentId: integration._environmentId };

    await this.integration.delete(requestQuery);
  }

  async findDeleted(query: EnforceEnvironmentQuery): Promise<IntegrationEntity> {
    const res = await this.integration.findDeleted(query);

    return this.mapEntity(res);
  }
}
