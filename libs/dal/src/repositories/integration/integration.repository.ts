import { Document, FilterQuery } from 'mongoose';
import { BaseRepository } from '../base-repository';
import { IntegrationEntity } from './integration.entity';
import { Integration } from './integration.schema';
import { DalException } from '../../shared';

export class IntegrationRepository extends BaseRepository<IntegrationEntity> {
  constructor() {
    super(Integration, IntegrationEntity);
  }

  async find(
    query: FilterQuery<IntegrationEntity & Document>,
    select = '',
    options: { limit?: number; sort?: any; skip?: number } = {}
  ): Promise<IntegrationEntity[]> {
    return super.find(this.normalizeQuery(query), select, options);
  }

  async findOne(query: FilterQuery<IntegrationEntity & Document>, select?: keyof IntegrationEntity | string) {
    return super.findOne(this.normalizeQuery(query), select);
  }

  async findByApplicationId(applicationId: string): Promise<IntegrationEntity[]> {
    return await this.find({
      _applicationId: applicationId,
    });
  }

  async create(data: Partial<IntegrationEntity>): Promise<IntegrationEntity> {
    const existingIntegration = await this.findOne({
      _applicationId: data._applicationId,
      providerId: data.providerId,
      channel: data.channel,
    });
    if (existingIntegration) {
      throw new DalException('Duplicate key - One application may not have two providers of the same channel type');
    }

    return await super.create(data);
  }
  async delete(query: FilterQuery<IntegrationEntity & Document>) {
    const integration = await this.findOne({ _id: query._id });
    if (!integration) throw new DalException(`Could not find integration with id ${query._id}`);
    integration.removed = true;
    await super.update(
      { _id: integration._id, _applicationId: integration._applicationId },
      { $set: { removed: true } }
    );
  }

  normalizeQuery(query: FilterQuery<IntegrationEntity & Document>): FilterQuery<IntegrationEntity & Document> {
    const normalizedQuery = query;

    normalizedQuery.removed = normalizedQuery.removed ?? false;

    return normalizedQuery;
  }
}
