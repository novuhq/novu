import { UnprocessableEntityException } from '@nestjs/common';
import { Document, FilterQuery } from 'mongoose';
import { BaseRepository } from '../base-repository';
import { IntegrationEntity } from './integration.entity';
import { Integration } from './integration.schema';

export class IntegrationRepository extends BaseRepository<IntegrationEntity> {
  constructor() {
    super(Integration, IntegrationEntity);
  }

  async findByApplicationId(applicationId: string): Promise<IntegrationEntity[]> {
    return await this.find({
      _applicationId: applicationId,
    });
  }

  async create(data: Partial<IntegrationEntity>): Promise<IntegrationEntity> {
    const test = await this.find({
      _applicationId: data._applicationId,
      providerId: data.providerId,
      channel: data.channel,
    });
    if (test.length === 0) {
      return await super.create(data);
    }

    throw new UnprocessableEntityException(
      'Duplicate key - One application may not have two providers of the same channel type'
    );
  }

  async update(
    query: FilterQuery<IntegrationEntity & Document>,
    updateBody: any
  ): Promise<{
    matched: number;
    modified: number;
  }> {
    if (query.active === true) {
      await this.deactivatedOtherActiveChannels(query);
    }

    return await super.update({ _id: query._id }, updateBody);
  }

  async delete(query: FilterQuery<IntegrationEntity & Document>) {
    const integration = await this.findOne({ _id: query._id });
    if (!integration) throw new Error(`Could not find integration with id ${query._id}`);
    integration.removed = true;
    await super.update({ _id: integration._id }, integration);
  }

  async deactivatedOtherActiveChannels(query: FilterQuery<IntegrationEntity & Document>): Promise<void> {
    const otherExistedIntegration = (
      await this.find({
        _applicationId: query._applicationId,
        channel: query.channel,
        active: true,
      })
    ).filter((x) => x.providerId !== query.providerId);

    for (const x of otherExistedIntegration) {
      const deactivatedIntegration = x;

      deactivatedIntegration.active = false;
      await super.update({ _id: deactivatedIntegration._id }, deactivatedIntegration);
    }
  }
}
