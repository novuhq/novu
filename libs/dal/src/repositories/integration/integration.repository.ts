import { Document, FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { BaseRepository } from '../base-repository';
import { IntegrationEntity } from './integration.entity';
import { Integration } from './integration.schema';
import { DalException } from '../../shared';

export class IntegrationRepository extends BaseRepository<IntegrationEntity> {
  private integration: SoftDeleteModel;
  constructor() {
    super(Integration, IntegrationEntity);
    this.integration = Integration;
  }

  async find(
    query: FilterQuery<IntegrationEntity & Document>,
    select = '',
    options: { limit?: number; sort?: any; skip?: number } = {}
  ): Promise<IntegrationEntity[]> {
    return super.find(query, select, options);
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
    await this.integration.delete({ _id: integration._id, _applicationId: integration._applicationId });
  }

  async findDeleted(query: FilterQuery<IntegrationEntity & Document>): Promise<IntegrationEntity> {
    const res = await this.integration.findDeleted(query);

    return this.mapEntity(res);
  }
}
